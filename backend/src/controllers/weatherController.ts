import { Request, Response } from 'express';
import { weatherService } from '../services/weatherService.js';

/**
 * Controller handling GET /api/weather
 * Validates query inputs and returns normalized weather suitability data.
 */
export async function getWeather(req: Request, res: Response): Promise<void> {
  try {
    const area = typeof req.query.area === 'string' ? req.query.area.trim() : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date.trim() : undefined;
    const time = typeof req.query.time === 'string' ? req.query.time.trim() : undefined;
    const sport = typeof req.query.sport === 'string' ? req.query.sport.trim() : undefined;

    let lat: number | undefined;
    let lon: number | undefined;

    if (req.query.lat && typeof req.query.lat === 'string') {
      const parsedLat = parseFloat(req.query.lat);
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        lat = parsedLat;
      }
    }

    if (req.query.lon && typeof req.query.lon === 'string') {
      const parsedLon = parseFloat(req.query.lon);
      if (!isNaN(parsedLon) && parsedLon >= -180 && parsedLon <= 180) {
        lon = parsedLon;
      }
    }

    const weatherData = await weatherService.getWeather({
      area,
      date,
      time,
      sport,
      lat,
      lon,
    });

    res.status(200).json({
      success: true,
      ...weatherData,
      weather: weatherData,
    });
  } catch (err: any) {
    console.error('[WeatherController] Unexpected error in getWeather:', err);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve weather advisory at this time.',
    });
  }
}
