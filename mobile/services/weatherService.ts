import { api } from './api';

export type WeatherRecommendation = 'OUTDOOR_SUITABLE' | 'CAUTION' | 'INDOOR_PREFERRED';

export interface WeatherOutlook {
  location: string;
  temperatureC: number;
  condition: string;
  rainProbability: number;
  windSpeedKmh: number;
  recommendation: WeatherRecommendation;
  reason: string;
  timestamp: string;
  isFallback: boolean;
}

export interface WeatherQueryParams {
  area?: string;
  date?: string;
  time?: string;
  sport?: string;
}

class MobileWeatherService {
  /**
   * Fetches weather advisory for a given location, date, time, and optional sport.
   * Resilient: returns null if network fails so calling screens can render gracefully.
   */
  async getWeather(params: WeatherQueryParams = {}): Promise<WeatherOutlook | null> {
    try {
      const queryParts: string[] = [];
      if (params.area) queryParts.push(`area=${encodeURIComponent(params.area)}`);
      if (params.date) queryParts.push(`date=${encodeURIComponent(params.date)}`);
      if (params.time) queryParts.push(`time=${encodeURIComponent(params.time)}`);
      if (params.sport) queryParts.push(`sport=${encodeURIComponent(params.sport)}`);

      const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const response = await api.get<any>(`/api/weather${queryStr}`);

      if (response && response.data) {
        // Handle both flattened and nested shapes
        const weather = response.data.weather || response.data;
        if (typeof weather.temperatureC === 'number') {
          return {
            location: weather.location || 'Lahore',
            temperatureC: weather.temperatureC,
            condition: weather.condition || 'Partly Cloudy',
            rainProbability: weather.rainProbability ?? 0,
            windSpeedKmh: weather.windSpeedKmh ?? 10,
            recommendation: weather.recommendation || 'OUTDOOR_SUITABLE',
            reason: weather.reason || 'Conditions suitable for sports.',
            timestamp: weather.timestamp || new Date().toISOString(),
            isFallback: !!weather.isFallback,
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('[MobileWeatherService] Unable to fetch weather advisory:', err);
      return null;
    }
  }
}

export const weatherService = new MobileWeatherService();
export default weatherService;
