/**
 * Centralized Weather Suitability Evaluator for Maidaan.
 * 
 * Determines whether outdoor or indoor sports options are recommended based on
 * meteorological conditions (temperature, precipitation, wind speed) and sport-specific
 * dynamics. This recommendation is strictly advisory.
 */

export type WeatherSuitabilityStatus = 'OUTDOOR_SUITABLE' | 'CAUTION' | 'INDOOR_PREFERRED';

export interface WeatherMetrics {
  temperatureC: number;
  condition: string;
  rainProbability: number;
  windSpeedKmh: number;
  sport?: string; // 'cricket' | 'badminton' | 'padel' | 'football'
}

export interface SuitabilityResult {
  recommendation: WeatherSuitabilityStatus;
  reason: string;
}

/**
 * Deterministic weather thresholds and sport-aware rules.
 * Centralized in one place to maintain explainability for FYP evaluation.
 */
export function evaluateWeatherSuitability(metrics: WeatherMetrics): SuitabilityResult {
  const { temperatureC, rainProbability, windSpeedKmh } = metrics;
  const sport = metrics.sport ? metrics.sport.toLowerCase().trim() : '';

  // ---------------------------------------------------------------------------
  // 1. Heavy Precipitation Thresholds (General & Sport-Specific)
  // ---------------------------------------------------------------------------
  if (rainProbability >= 60) {
    return {
      recommendation: 'INDOOR_PREFERRED',
      reason: `High rain probability (${rainProbability}%). An indoor venue is strongly recommended.`,
    };
  }

  // Cricket pitches & tape-balls become unplayable with even moderate rain
  if (sport.includes('cricket') && rainProbability >= 40) {
    return {
      recommendation: 'INDOOR_PREFERRED',
      reason: `Rain probability of ${rainProbability}% makes cricket pitches damp and balls slippery; indoor nets preferred.`,
    };
  }

  // Badminton & Padel courts become dangerously slick with rain
  if ((sport.includes('badminton') || sport.includes('padel')) && rainProbability >= 45) {
    return {
      recommendation: 'INDOOR_PREFERRED',
      reason: `Rain probability of ${rainProbability}% poses surface slip risks; indoor court recommended.`,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. High Wind Thresholds (General & Sport-Specific)
  // ---------------------------------------------------------------------------
  // Badminton shuttlecocks and Padel balls are extremely sensitive to wind
  if (sport.includes('badminton') || sport.includes('padel')) {
    if (windSpeedKmh >= 24) {
      return {
        recommendation: 'INDOOR_PREFERRED',
        reason: `High winds (${windSpeedKmh} km/h) heavily deflect ${sport.includes('badminton') ? 'shuttlecock' : 'padel ball'} trajectory. Indoor court recommended.`,
      };
    }
    if (windSpeedKmh >= 16) {
      return {
        recommendation: 'CAUTION',
        reason: `Moderate breeze (${windSpeedKmh} km/h) may impact aerial smashes and rally control.`,
      };
    }
  } else if (sport.includes('football')) {
    // Football tolerates higher winds than racquet or net sports
    if (windSpeedKmh >= 45) {
      return {
        recommendation: 'INDOOR_PREFERRED',
        reason: `Severe wind gusts (${windSpeedKmh} km/h) impact passing and pitch conditions. Indoor turf preferred.`,
      };
    }
    if (windSpeedKmh >= 30) {
      return {
        recommendation: 'CAUTION',
        reason: `Gusty wind (${windSpeedKmh} km/h) may alter long ball trajectories and crossing accuracy.`,
      };
    }
  } else {
    // General / Cricket default wind threshold
    if (windSpeedKmh >= 35) {
      return {
        recommendation: 'INDOOR_PREFERRED',
        reason: `Strong winds (${windSpeedKmh} km/h) disrupt ball flight and outfield play. Indoor facility advised.`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Extreme Temperature Thresholds
  // ---------------------------------------------------------------------------
  if (temperatureC >= 38) {
    return {
      recommendation: 'INDOOR_PREFERRED',
      reason: `Excessive heat (${temperatureC}°C). High heat exhaustion risk; an air-conditioned indoor facility is advised.`,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Cautionary Weather Thresholds
  // ---------------------------------------------------------------------------
  if (rainProbability >= 30) {
    return {
      recommendation: 'CAUTION',
      reason: `Moderate rain risk (${rainProbability}%). Outdoor play is feasible, but monitor for drizzle.`,
    };
  }

  if (sport.includes('cricket') && rainProbability >= 25) {
    return {
      recommendation: 'CAUTION',
      reason: `Slight rain chance (${rainProbability}%). Potential damp outfield or seam slip.`,
    };
  }

  if (temperatureC >= 34) {
    return {
      recommendation: 'CAUTION',
      reason: `Warm conditions (${temperatureC}°C). Ensure frequent hydration and recovery intervals.`,
    };
  }

  if (temperatureC <= 8) {
    return {
      recommendation: 'CAUTION',
      reason: `Cold conditions (${temperatureC}°C). Thorough muscular warm-up and layered athletic kit advised.`,
    };
  }

  if (windSpeedKmh >= 24) {
    return {
      recommendation: 'CAUTION',
      reason: `Breezy conditions (${windSpeedKmh} km/h). May cause noticeable ball drift on high catches and lobs.`,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Ideal Conditions (Default)
  // ---------------------------------------------------------------------------
  return {
    recommendation: 'OUTDOOR_SUITABLE',
    reason: `Favorable outdoor conditions (${temperatureC}°C, ${rainProbability}% rain probability, ${windSpeedKmh} km/h wind). Ideal for outdoor play.`,
  };
}
