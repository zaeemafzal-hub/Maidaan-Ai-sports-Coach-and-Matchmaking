# Weather Decision Model and Advisory Guidelines

## Weather Suitability States
Weather combines temperature, precipitation probability and wind with sport-specific deterministic thresholds. OUTDOOR_SUITABLE means the returned forecast meets the outdoor suitability rules. CAUTION advises checking local conditions. INDOOR_PREFERRED recommends a covered alternative during adverse rain, heat or wind. Badminton and padel are especially wind-sensitive. None of these labels guarantees safety.

## Advisory Principle
Weather does not automatically cancel, reschedule or change a match or booking. Players and captains decide based on actual venue conditions. An AI summary must preserve the tool's recommendation, not invent a better forecast.

## Data Source and Limits
Open-Meteo supplies live weather with a 15-minute cache. Lahore areas use approximate catalogue coordinates; arbitrary addresses are not geocoded and may use a city-level forecast. Forecast coverage is limited; do not promise a precise future forecast outside the provider horizon. Production failures must report weather unavailable, never a fake pleasant reading. Demo/test weather is not live telemetry.
