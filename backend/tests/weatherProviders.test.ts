import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getLiveForecast, clearForecastCache } from '../src/services/weatherProviders.js';
import { WeatherService } from '../src/services/weatherService.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearForecastCache(); });
const day = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const backup = () => ({
  current_condition: [{ temp_C: '29', windspeedKmph: '8', weatherDesc: [{ value: 'Partly cloudy' }] }],
  weather: [{ date: day(), hourly: [0, 3, 6, 9, 12, 15, 18, 21].map(hour => ({ time: String(hour * 100), tempC: '28', chanceofrain: '35', windspeedKmph: '12', weatherDesc: [{ value: 'Light rain' }] })) }],
});
const primary = () => ({ current: { time: `${day()}T12:15`, temperature_2m: 30, weather_code: 2, wind_speed_10m: 7 }, hourly: { time: [`${day()}T12:00`], temperature_2m: [31], precipitation_probability: [0], weather_code: [1], wind_speed_10m: [8] } });

test('HTTP 429 switches to real backup data and honours provider retry cooldown', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input); calls.push(url);
    return url.includes('open-meteo') ? new Response('{}', { status: 429, headers: { 'retry-after': '3600' } }) : Response.json(backup());
  }) as typeof fetch;
  const first = await getLiveForecast(31.52, 74.35);
  const otherArea = await getLiveForecast(31.49, 74.32);
  assert.equal(first.provider, 'wttr.in');
  assert.equal(first.current.temperatureC, 29);
  assert.equal(first.current.rainProbability, 35);
  assert.equal(otherArea.provider, 'wttr.in');
  assert.equal(calls.filter(url => url.includes('open-meteo')).length, 1);
  assert.equal(calls.filter(url => url.includes('wttr.in')).length, 2);
});

test('concurrent and cached requests share one forecast; hourly rain can be zero', async () => {
  let count = 0;
  globalThis.fetch = (async () => { count++; return Response.json(primary()); }) as typeof fetch;
  const [a, b] = await Promise.all([getLiveForecast(31.52, 74.35), getLiveForecast(31.52, 74.35)]);
  const cached = await getLiveForecast(31.52, 74.35);
  assert.equal(count, 1);
  assert.equal(a, b);
  assert.equal(cached, a);
  assert.equal(a.current.rainProbability, 0);
});

test('partial upstream measurements never become fabricated current weather', async () => {
  globalThis.fetch = (async (input) => Response.json(String(input).includes('open-meteo') ? { current: { temperature_2m: null }, hourly: { time: [] } } : backup())) as typeof fetch;
  assert.equal((await getLiveForecast(31.52, 74.35)).provider, 'wttr.in');
});

test('failed backup and invalid coordinates fail instead of inventing measurements', async () => {
  let count = 0;
  globalThis.fetch = (async () => { count++; throw new Error('offline'); }) as typeof fetch;
  await assert.rejects(getLiveForecast(31.52, 74.35));
  assert.equal(count, 2);
  await assert.rejects(getLiveForecast(999, 999), /Invalid weather coordinates/);
  assert.equal(count, 2);
});

test('selected forecast uses that day and slot; out-of-range dates are unavailable in production', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    globalThis.fetch = (async () => Response.json(primary())) as typeof fetch;
    const service = new WeatherService();
    const selected = await service.getWeather({ area: 'Lahore', date: day(), time: '12:00', sport: 'cricket' });
    assert.equal(selected.temperatureC, 31);
    assert.equal(selected.isFallback, false);
    const unavailable = await service.getWeather({ area: 'Lahore', date: '2099-01-01', time: '12:00' });
    assert.equal(unavailable.condition, 'Weather Unavailable');
    assert.equal(unavailable.isFallback, true);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
