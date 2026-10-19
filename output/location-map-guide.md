# Lahore locations and maps

OpenStreetMap is the default map. Google Maps mounts only if the primary page/library cannot load, the visible tile batch entirely fails, or initial loading times out after 20 seconds. There is no provider selector and both maps never mount together. A partial tile failure keeps the primary map. The backup still needs its platform configuration; the web Google key is currently absent. No Google key or billing account is needed for OpenStreetMap. Leaflet and OpenStreetMap attribution remain visible. Maps require an internet connection and the running backend, which serves the shared map page. The public tile service is best-effort and subject to its usage policy: https://operations.osmfoundation.org/policies/tiles/

The OSM map now has a dark appearance matching Maidaan. A CSS filter darkens only the raster tile pane; orange venue pins, controls and readable attribution stay separate. It uses the same standard tiles, caching and attribution, with no additional tile provider or API key.

Players and captains can open **Discover → Map View** or **Sports hubs**, choose Lahore, type an area (for example Johar Town or DHA), and see related venues. Selecting an area applies its exact filter. Venue name/address and sport filters can be combined. Map pins open the venue's photos, facilities, prices and available slots. Venues without exact coordinates remain in the list.

Owners select city and area during hub setup. **Hub Workspace → Venue details & photos** lets them enter a street address and tap either map to place the entrance pin. Coordinates are validated against the selected city's configured coverage bounds. These are coverage bounds, not surveyed administrative boundaries. Existing venue addresses are preserved; owners should select an area on their next edit for reliable exact-area filtering.

Player setup and **Profile → Edit player profile** include the existing account name/email, required phone number and free-text home address, plus an optional profile photo. Any address of 2–500 characters is accepted in the selected enabled city. Listed areas remain suggestions. The server preserves the full address and tags the most specific known area name/alias found in it; unmatched addresses save with an empty area ID and still complete onboarding. This is text matching, not geocoded boundary verification. Local Pakistani phone numbers are normalized to +92 format. Phone numbers and home addresses are returned through the user's own profile endpoint, not public venue search. Existing players missing a phone/address must complete those details.

The user applied `location-profile-upgrade.sql`, which adds contact/location columns and the profile-photo bucket. The backend validates profile uploads and accepts only a photo belonging to the authenticated user. Public profile images should contain only what the user intends to share.

## Future coverage

`backend/src/config/locations.ts` is the central city/area catalogue. Currently only Lahore is enabled. To add coverage, add the city's unique ID, name, center coordinates, coverage bounds and area IDs/names/aliases, then enable it and deploy the backend. Clients obtain the catalogue from `/api/locations`, so disabled cities stay hidden. Do not rename existing IDs after records reference them. Adding another area to Lahore is a catalogue entry, without changing the search screens or schema.

The backend's `OSM_TILE_URL` can change the tile host without rebuilding mobile clients. Use an HTTPS tile provider and comply with its licence, attribution and quota rules; adjust the map attribution if the replacement provider requires additional credit. This version requests only the tiles the user views, uses normal browser/WebView caching, and does not offer offline downloads or prefetching. Leaflet 1.9.4 assets are loaded from the official quick-start CDN URLs with integrity hashes.

For optional Google Maps configuration, use `google-maps-setup.md`. OpenStreetMap remains the default even when Google is configured. No Google billing account was created by the agent.
