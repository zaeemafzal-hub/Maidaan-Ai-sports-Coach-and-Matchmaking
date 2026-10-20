/** Live forecast adapters. No API keys or synthetic weather values. */
export interface ForecastMetrics {
  temperatureC: number;
  rainProbability: number;
  windSpeedKmh: number;
  condition: string;
}

export interface LiveForecast {
  provider: 'Open-Meteo' | 'wttr.in';
  current: ForecastMetrics;
  hourly: { time: string; metrics: ForecastMetrics }[];
}

const USER_AGENT = 'Maidaan/1.0 (https://maidaan-sports.vercel.app)';
const TTL = 15 * 60_000;
const cache = new Map<string, { forecast: LiveForecast; expires: number }>();
const pending = new Map<string, Promise<LiveForecast>>();
let openMeteoRetryAt = 0;

export function clearForecastCache(): void {
  cache.clear();
  pending.clear();
  openMeteoRetryAt = 0;
}

function numeric(value: unknown, name: string): number {
  // Provider JSON can contain numeric strings; null/missing is not zero.
  if (value === null || value === undefined || value === '' ||
      !['number', 'string'].includes(typeof value) || !Number.isFinite(Number(value))) {
    throw new Error(`Weather provider omitted ${name}`);
  }
  return Number(value);
}

function metrics(temp: unknown, rain: unknown, wind: unknown, condition: string): ForecastMetrics {
  const temperatureC = numeric(temp, 'temperature');
  const rainProbability = numeric(rain, 'rain probability');
  const windSpeedKmh = numeric(wind, 'wind speed');
  if (rainProbability < 0 || rainProbability > 100 || windSpeedKmh < 0 || !condition.trim()) {
    throw new Error('Weather provider returned invalid measurements');
  }
  return { temperatureC: Math.round(temperatureC), rainProbability: Math.round(rainProbability), windSpeedKmh: Math.round(windSpeedKmh), condition: condition.trim() };
}

function wmoCondition(code: unknown): string {
  const value = numeric(code, 'weather code');
  if (value === 0) return 'Clear Sky';
  if (value === 1) return 'Mainly Clear';
  if (value === 2) return 'Partly Cloudy';
  if (value === 3) return 'Overcast';
  if ([45, 48].includes(value)) return 'Foggy';
  if (value >= 51 && value <= 57) return 'Drizzle';
  if (value >= 61 && value <= 67) return 'Rain';
  if (value >= 71 && value <= 77) return 'Snow';
  if (value >= 80 && value <= 82) return 'Rain Showers';
  if (value >= 85 && value <= 86) return 'Snow Showers';
  if (value >= 95 && value <= 99) return 'Thunderstorm';
  throw new Error('Weather provider returned an unknown weather code');
}

async function request(url: string, primary: boolean): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      if (primary && response.status === 429) {
        const header = response.headers.get('retry-after');
        const seconds = header && /^\d+$/.test(header) ? Number(header) * 1000 : 0;
        const dateDelay = header && !seconds ? Date.parse(header) - Date.now() : 0;
        openMeteoRetryAt = Date.now() + Math.max(5 * 60_000, seconds || dateDelay || 0);
      }
      throw new Error(`Weather provider returned HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseOpenMeteo(data: any): LiveForecast {
  const current = data?.current;
  const hours = data?.hourly;
  if (!current || !Array.isArray(hours?.time)) throw new Error('Incomplete Open-Meteo forecast');
  const index = hours.time.findIndex((time: string) => time.slice(0, 13) === current.time?.slice(0, 13));
  return {
    provider: 'Open-Meteo',
    current: metrics(current.temperature_2m, current.precipitation_probability ?? hours.precipitation_probability?.[index], current.wind_speed_10m, wmoCondition(current.weather_code)),
    hourly: hours.time.map((time: string, i: number) => ({ time, metrics: metrics(hours.temperature_2m?.[i], hours.precipitation_probability?.[i], hours.wind_speed_10m?.[i], wmoCondition(hours.weather_code?.[i])) })),
  };
}

function parseWttr(data: any): LiveForecast {
  const current = data?.current_condition?.[0];
  if (!current || !Array.isArray(data?.weather)) throw new Error('Incomplete backup weather forecast');
  const hourly = data.weather.flatMap((day: any) => (day.hourly || []).map((hour: any) => ({
    time: `${day.date}T${String(Math.floor(numeric(hour.time, 'forecast hour') / 100)).padStart(2, '0')}:00`,
    metrics: metrics(hour.tempC, hour.chanceofrain, hour.windspeedKmph, hour.weatherDesc?.[0]?.value || ''),
  })));
  if (!hourly.length) throw new Error('Backup weather omitted hourly forecast');
  const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
  const day = local.slice(0, 10), hour = Number(local.slice(11, 13));
  const today = hourly.filter((entry: {time: string}) => entry.time.startsWith(day));
  const nearest = today.sort((a: {time: string}, b: {time: string}) => Math.abs(Number(a.time.slice(11, 13)) - hour) - Math.abs(Number(b.time.slice(11, 13)) - hour))[0];
  if (!nearest) throw new Error('Backup weather omitted current-day rain forecast');
  return { provider: 'wttr.in', current: metrics(current.temp_C, nearest.metrics.rainProbability, current.windspeedKmph, current.weatherDesc?.[0]?.value || ''), hourly };
}

/** Cache raw forecasts by coordinates so users, sports and time selections share requests. */
export async function getLiveForecast(lat: number, lon: number): Promise<LiveForecast> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Invalid weather coordinates');
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.forecast;
  const running = pending.get(key);
  if (running) return running;
  const load = (async () => {
    let forecast: LiveForecast | undefined;
    if (Date.now() >= openMeteoRetryAt) {
      try {
        forecast = parseOpenMeteo(await request(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=Asia%2FKarachi&forecast_days=3`, true));
      } catch (error) {
        console.warn('[WeatherService] Open-Meteo unavailable; trying backup:', error instanceof Error ? error.message : 'request failed');
      }
    }
    if (!forecast) forecast = parseWttr(await request(`https://wttr.in/${key}?format=j1`, false));
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { forecast, expires: Date.now() + TTL });
    return forecast;
  })();
  pending.set(key, load);
  try { return await load; } finally { pending.delete(key); }
}
