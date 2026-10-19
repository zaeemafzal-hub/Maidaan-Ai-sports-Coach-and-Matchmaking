# Google Maps setup for Maidaan

Google Maps is optional. Maidaan now defaults to OpenStreetMap and retains Google Maps as a selectable alternative. You can leave all Google fields empty and still use the primary map, city/area search and venue pins.

Google's regular Maps SDK usage for mobile is currently listed as unlimited free usage. Dynamic Maps on web includes 10,000 free map loads per month; the next tier starts at USD 7 per 1,000. Google still requires a billing-enabled project for the JavaScript API. Other APIs have separate allowances and charges. Check the current pricing before enabling billing: https://developers.google.com/maps/billing-and-pricing/pricing

Maidaan's area suggestions and venue search use its own data, not Places Autocomplete, Geocoding or Nearby Search. You do not need to enable those paid APIs for this version. Only venues actually registered in Maidaan appear in search; Google supplies the map background.

## Android Expo Go: start here without creating a Maps key

The installed react-native-maps version matches Expo SDK 57. Expo Go provides its native map setup. Reload the project, then open Discover → Map View or Sports hubs → Map. Owners can tap the venue map to save an exact entrance pin. This does not enable web maps or configure a future standalone build.

## Web: Google Cloud Console

1. Open https://console.cloud.google.com/ and select your existing Maidaan project, or create one named Maidaan Maps.
2. Open **Billing** and link a billing account. Enter payment details directly into Google if you choose to proceed. Do not share those details or credentials in chat. A card/account verification charge may be handled by Google; review its signup terms.
3. Open **APIs & Services → Library**, find **Maps JavaScript API**, and choose **Enable**. Enable only the APIs you intend to use.
4. Open **APIs & Services → Credentials → Create credentials → API key**. Edit that key: set **Application restrictions → Websites**. Add `http://localhost:8081/*` and `http://192.168.18.11:8081/*` for the current development computer. Add your HTTPS domain when deployed. Update the LAN entry if your IP changes.
5. Under **API restrictions**, restrict the key to **Maps JavaScript API**, then save.
6. Enter the key into `mobile/.env` as `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY`. This is a browser key, so it is intentionally visible to the browser; website and API restrictions protect its use. Do not reuse an unrestricted server key.
7. For development, `EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID` supports the advanced markers. For deployment, create a JavaScript Map ID in **Google Maps Platform → Map management** and replace the demo value. A map ID is different from an API key.
8. Set a small billing budget with email alerts and review the API's supported quotas in **Quotas & System Limits**. Budget alerts notify you; they do not automatically stop spending. Do not assume the free allowance is a hard spending limit.
9. Restart Expo after editing environment variables: from `mobile`, run `npx expo start --go --web --lan --port 8081`.

If you do not want to enable billing now, leave the web key empty. City/area search, venue lists and bookings still work, and the web map displays its setup message.

## Standalone Android/iOS builds later

Enable **Maps SDK for Android** and create a separate Android-restricted key using package `com.anonymous.maidaan` and your actual build-signing SHA-1. Put it in `GOOGLE_MAPS_ANDROID_KEY` before building. The dynamic Expo configuration passes it to the maps plugin. Android app restriction keys do not work as website keys.

For iOS, set the bundle identifier first, enable **Maps SDK for iOS**, and restrict a separate key to that identifier. `GOOGLE_MAPS_IOS_KEY` is available for the native build configuration. This version uses the default Apple map provider on iOS, including Expo Go; Google provider testing on iOS requires a configured development build.

Official guides: https://docs.expo.dev/versions/v57.0.0/sdk/map-view/ and https://developers.google.com/maps/documentation/javascript/get-api-key
