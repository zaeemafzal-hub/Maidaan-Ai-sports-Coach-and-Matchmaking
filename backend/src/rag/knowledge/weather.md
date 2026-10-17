# Weather Decision Model & Advisory Guidelines

## Weather Suitability States
Maidaan evaluates real-time meteorological metrics (temperature, precipitation probability, wind speed) and computes a deterministic suitability rating for each sport:
- OUTDOOR_SUITABLE: Conditions are comfortable and safe for open-air play (moderate temperatures between 9°C and 33°C, low rain probability <30%, low-to-moderate wind). Ideal for outdoor cricket, football, padel, and outdoor badminton.
- CAUTION: Marginal weather conditions detected. Moderate rain risk (25%–59% depending on sport), warm conditions (34°C–37°C), cold conditions (≤8°C), or breezy winds (≥16 km/h for racquet sports, ≥24 km/h general, ≥30 km/h football). Players and captains are advised to ensure frequent hydration, inspect ground traction, and monitor changing weather.
- INDOOR_PREFERRED: Unfavorable outdoor conditions. High rain probability (≥60% general, ≥40% cricket, ≥45% badminton/padel), excessive heat (≥38°C), or strong winds (≥24 km/h for badminton/padel, ≥35 km/h for cricket, ≥45 km/h for football). Air-conditioned indoor courts, covered turfs, or sheltered nets are strongly recommended.

## Advisory Principle
The weather recommendation is strictly an advisory guidance tool:
- It does NOT automatically cancel or reschedule matches.
- It does NOT block players from organizing or attending games.
- It does NOT automatically convert outdoor bookings into indoor facilities.
The final decision to play remains with the team captains and participants based on local venue ground conditions.

## Data Source
All live weather values (temperatures, wind speed, condition codes) are retrieved directly from the live Open-Meteo forecasting API by the weather service, with 15-minute server-side caching. Static knowledge explains the meaning of these ratings, but live telemetry must always be queried from the weather service.

