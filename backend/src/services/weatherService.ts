import {
  evaluateWeatherSuitability,
  WeatherMetrics,
  WeatherSuitabilityStatus,
} from './weatherSuitability.js';
import { isProduction } from '../config/runtime.js';
import { getLiveForecast, clearForecastCache } from './weatherProviders.js';

export interface WeatherQueryOptions {
  area?: string;
  date?: string;
  time?: string;
  sport?: string;
  lat?: number;
  lon?: number;
}

export interface WeatherResponse {
  location: string;
  temperatureC: number;
  condition: string;
  rainProbability: number;
  windSpeedKmh: number;
  recommendation: WeatherSuitabilityStatus;
  reason: string;
  timestamp: string;
  isFallback: boolean;
}

// Supported Lahore regional geocodes
const AREA_COORDINATES: Record<string, { lat: number; lon: number; label: string }> = {
  gulberg: { lat: 31.5204, lon: 74.3587, label: 'Gulberg, Lahore' },
  dha: { lat: 31.4697, lon: 74.3986, label: 'DHA Phase 5, Lahore' },
  'model town': { lat: 31.488, lon: 74.3213, label: 'Model Town, Lahore' },
  'johar town': { lat: 31.4697, lon: 74.2728, label: 'Johar Town, Lahore' },
  cantt: { lat: 31.535, lon: 74.385, label: 'Cantt, Lahore' },
  bahria: { lat: 31.3685, lon: 74.1804, label: 'Bahria Town, Lahore' },
};

const DEFAULT_COORDS = { lat: 31.5204, lon: 74.3587, label: 'Lahore, Punjab' };

/**
 * Resolves latitude, longitude, and friendly location label from area or coordinates.
 */
function resolveLocation(area?: string, lat?: number, lon?: number): { lat: number; lon: number; label: string } {
  if (typeof lat === 'number' && typeof lon === 'number') {
    return {
      lat,
      lon,
      label: area?.trim() || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    };
  }

  if (area) {
    const normalized = area.toLowerCase().trim();
    for (const [key, coords] of Object.entries(AREA_COORDINATES)) {
      if (normalized.includes(key)) {
        return coords;
      }
    }
    return {
      lat: DEFAULT_COORDS.lat,
      lon: DEFAULT_COORDS.lon,
      label: area.trim(),
    };
  }

  return DEFAULT_COORDS;
}

/**
 * Parses time string (e.g., "8:30 PM", "20:00", "Tonight, 8:00 PM - 10:00 PM") into a 0-23 hour integer.
 */
function parseHourFromTimeString(timeStr?: string): number | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const modifier = match[3]?.toLowerCase();

  if (modifier === 'pm' && hour < 12) hour += 12;
  if (modifier === 'am' && hour === 12) hour = 0;

  if (hour >= 0 && hour <= 23) {
    return hour;
  }
  return null;
}

/**
 * Parses date string (e.g. "Tonight", "Tomorrow", "Today", "2026-10-15") into YYYY-MM-DD.
 */
function parseDateString(dateStr?: string): string {
  const now = new Date();
  if (!dateStr || dateStr.toLowerCase().includes('today') || dateStr.toLowerCase().includes('tonight')) {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  }
  if (dateStr.toLowerCase().includes('tomorrow')) {
    const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tmrw);
  }
  // If YYYY-MM-DD format
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    return dateStr;
  }
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * Generates a resilient mock fallback if the free external provider is unavailable or times out.
 */
function generateFallbackWeather(locationLabel: string, sport?: string): WeatherResponse {
  const metrics: WeatherMetrics = {
    temperatureC: 27,
    condition: 'Partly Cloudy',
    rainProbability: 15,
    windSpeedKmh: 12,
    sport,
  };
  const suitability = evaluateWeatherSuitability(metrics);

  return {
    location: locationLabel,
    temperatureC: metrics.temperatureC,
    condition: metrics.condition,
    rainProbability: metrics.rainProbability,
    windSpeedKmh: metrics.windSpeedKmh,
    recommendation: suitability.recommendation,
    reason: suitability.reason,
    timestamp: new Date().toISOString(),
    isFallback: true,
  };
}

export class WeatherService {
  /**
   * Main weather resolution method with in-memory caching and Open-Meteo integration.
   */
  async getWeather(options: WeatherQueryOptions): Promise<WeatherResponse> {
    const location = resolveLocation(options.area, options.lat, options.lon);
    const targetDate = parseDateString(options.date);
    const targetHour = parseHourFromTimeString(options.time);

    try {
      // Forecast data is shared across users, sports and requested slots.
      const forecast = await getLiveForecast(location.lat, location.lon);
      let selected = forecast.current;
      if (targetHour !== null || targetDate !== parseDateString()) {
        const hour = targetHour ?? 12;
        const candidates = forecast.hourly.filter(entry => entry.time.startsWith(targetDate + 'T'));
        const nearest = candidates.sort((a, b) =>
          Math.abs(Number(a.time.slice(11, 13)) - hour) - Math.abs(Number(b.time.slice(11, 13)) - hour))[0];
        if (!nearest) throw new Error('Requested date is outside the available weather forecast');
        selected = nearest.metrics;
      }
      const { temperatureC: temp, rainProbability: rainProb, condition, windSpeedKmh: windSpeed } = selected;

      // 4. Calculate suitability with centralized model
      const suitability = evaluateWeatherSuitability({
        temperatureC: temp,
        condition,
        rainProbability: rainProb,
        windSpeedKmh: windSpeed,
        sport: options.sport,
      });

      const weatherResult: WeatherResponse = {
        location: location.label,
        temperatureC: temp,
        condition,
        rainProbability: rainProb,
        windSpeedKmh: windSpeed,
        recommendation: suitability.recommendation,
        reason: suitability.reason,
        timestamp: new Date().toISOString(),
        isFallback: false,
      };

      return weatherResult;
    } catch (err: any) {
      console.warn('[WeatherService] External provider request failed:', err?.message || err);
      if (isProduction()) {
        // In production mode, do not fabricate weather numbers; return clean unavailable state
        return {
          location: location.label,
          temperatureC: 0,
          condition: 'Weather Unavailable',
          rainProbability: 0,
          windSpeedKmh: 0,
          recommendation: 'CAUTION',
          reason: 'Live weather service unreachable. Please verify local ground conditions.',
          timestamp: new Date().toISOString(),
          isFallback: true,
        };
      }
      // Fallback response guarantees application continuity in test/dev
      return generateFallbackWeather(location.label, options.sport);
    }
  }

  /**
   * Helper to clear or purge cache entries during testing.
   */
  clearCache(): void {
    clearForecastCache();
  }
}

export const weatherService = new WeatherService();
