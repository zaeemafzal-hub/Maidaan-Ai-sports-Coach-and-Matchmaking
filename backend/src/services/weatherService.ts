import {
  evaluateWeatherSuitability,
  WeatherMetrics,
  WeatherSuitabilityStatus,
} from './weatherSuitability.js';
import { isProduction } from '../config/runtime.js';

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

interface CacheEntry {
  data: WeatherResponse;
  expiresAt: number;
}

// In-memory cache with 15 minutes TTL (FYP lightweight architectural decision)
const CACHE_TTL_MS = 15 * 60 * 1000;
const weatherCache = new Map<string, CacheEntry>();

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
 * Maps WMO Weather Interpretation Codes (0-99) to clean human descriptions.
 */
function mapWmoCodeToCondition(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 66 && code <= 67) return 'Freezing Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Partly Cloudy';
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
    return now.toISOString().split('T')[0];
  }
  if (dateStr.toLowerCase().includes('tomorrow')) {
    const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return tmrw.toISOString().split('T')[0];
  }
  // If YYYY-MM-DD format
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    return dateStr;
  }
  return now.toISOString().split('T')[0];
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
    const sportKey = options.sport ? options.sport.toLowerCase().trim() : 'all';

    // 1. Check in-memory cache
    const cacheKey = `${location.label.toLowerCase()}_${targetDate}_${targetHour ?? 'current'}_${sportKey}`;
    const cached = weatherCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      // 2. Query Open-Meteo Free API with 5-second AbortController timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=auto&forecast_days=3`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Maidaan-Sports-Platform/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status ${response.status}`);
      }

      const data = await response.json() as any;

      // 3. Extract metrics (either specific hourly slot or current)
      let temp = 26;
      let rainProb = 10;
      let condition = 'Partly Cloudy';
      let windSpeed = 12;

      if (targetHour !== null && data?.hourly?.time?.length) {
        // Construct target ISO prefix like "2026-10-15T20:00"
        const hourPrefix = `${targetDate}T${String(targetHour).padStart(2, '0')}:00`;
        const idx = (data.hourly.time as string[]).findIndex((t) => t.startsWith(hourPrefix));

        if (idx !== -1) {
          temp = Math.round(data.hourly.temperature_2m?.[idx] ?? 26);
          rainProb = Math.round(data.hourly.precipitation_probability?.[idx] ?? 10);
          windSpeed = Math.round(data.hourly.wind_speed_10m?.[idx] ?? 12);
          const wmo = data.hourly.weather_code?.[idx] ?? 2;
          condition = mapWmoCodeToCondition(wmo);
        } else if (data.current) {
          temp = Math.round(data.current.temperature_2m ?? 26);
          rainProb = Math.round(data.current.precipitation_probability ?? 10);
          windSpeed = Math.round(data.current.wind_speed_10m ?? 12);
          const wmo = data.current.weather_code ?? 2;
          condition = mapWmoCodeToCondition(wmo);
        }
      } else if (data.current) {
        temp = Math.round(data.current.temperature_2m ?? 26);
        rainProb = Math.round(data.current.precipitation_probability ?? 10);
        windSpeed = Math.round(data.current.wind_speed_10m ?? 12);
        const wmo = data.current.weather_code ?? 2;
        condition = mapWmoCodeToCondition(wmo);
      }

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

      // 5. Store in cache
      weatherCache.set(cacheKey, {
        data: weatherResult,
        expiresAt: now + CACHE_TTL_MS,
      });

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
    weatherCache.clear();
  }
}

export const weatherService = new WeatherService();
