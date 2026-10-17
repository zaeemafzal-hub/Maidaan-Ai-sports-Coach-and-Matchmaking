import { weatherService, WeatherQueryOptions, WeatherResponse } from '../../services/weatherService.js';

export async function getWeatherTool(options: WeatherQueryOptions): Promise<WeatherResponse> {
  return weatherService.getWeather(options);
}
