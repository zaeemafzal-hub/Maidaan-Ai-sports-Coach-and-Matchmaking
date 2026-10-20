# Public web and standalone Android deployment

Maidaan uses a Vercel static web export, one Render Node service for REST, Socket.IO and maps, and the existing Supabase project for authentication, storage and database records. The Android `preview` profile bundles the application into an APK and does not require Metro or a laptop. iPhone users can access the hosted website in Safari for free; native iOS distribution is a separate signing step.

## Current state — 20 October 2026

- Web: **https://maidaan-sports.vercel.app**, Vercel project `maidaan-sports` in `zaeemafzal-hubs-projects`. Production deployment `dpl_EqrwTD9iCFuYfWg3gQkkhv11hLNB` reached READY and the canonical domain is publicly accessible without Vercel login.
- API: **https://maidaan-api-7fs8.onrender.com**, Render service `srv-dbbhjg7f3r2c738u62r0`, Singapore, free plan, one instance. Deployment `dep-dbbhjgvf3r2c738u65ug` reached live.
- Render initially required account billing verification; the owner completed it. The service remains on the free plan.
- Supabase service-role and Gemini/Groq credentials were explicitly approved and uploaded to private Render secret storage. They must never enter the web export or APK. Payment credentials were excluded.
- Backend deployment uses Git commit `47ae8c2aa2a0699b5324661ac61c78beb85e731b`. The web and replacement Android build include local deployment configuration and a repaired platform-binary lockfile on top of that commit. Those local changes have not yet been pushed to GitHub.
- The standalone Android preview build is in progress: `c344625c-511e-410e-9dc0-a5f5c6ba37ab`. The previous development APK still needs Metro; it will not automatically become standalone.
- Payment checkout remains disabled for this pilot.

Verified against the public deployment: health, exact-origin CORS and unlisted-origin rejection, authenticated profile/match/venue/chat queries, profile save, two WebSocket clients exchanging a persisted chat message, rejection of invalid socket tokens, and a real Gemini response (HTTP 200, 1,418 characters, no fallback). Browser email login, Discover data, session restoration after reload, hosted artwork, and a 390px layout with no horizontal overflow or runtime errors also passed. The map iframe loads hosted OpenStreetMap tiles; existing venue records currently have no exact coordinate pins (0 of 9), and are still listed below the map. The user saved production auth URLs and confirmed Google login returns to Discover from mobile data.

The first Linux web and Android bundle builds exposed missing platform-specific Lightning CSS binaries in the Windows-generated lockfile. Linux/macOS and other declared native optional packages were restored with exact versions and registry integrity hashes, preserving every existing dependency version. A regression check now verifies these entries. The hosted web build subsequently passed. Existing dependency audit findings (14 moderate, 22 high) were reported during install; dependency remediation is not part of this hosting change.

Hosted weather initially returned unavailable because Open-Meteo responds HTTP 429 from the Render service. A server-side repair adds the independent wttr.in live JSON backup, a cooldown respecting Open-Meteo's Retry-After, coordinate-level forecast caching and request deduplication. It preserves real temperature/rain/wind measurements and rejects missing provider fields. Selected dates use Lahore's timezone; dates outside the forecast window remain unavailable rather than returning today's weather. Five provider/slot/cache regression tests pass. Hosted verification of the repair is pending its deployment. Sources: [Open-Meteo](https://open-meteo.com/), [wttr.in](https://wttr.in/) (WorldWeatherOnline data).

## Render service

Use the repository root, branch `main`, runtime Node, region Singapore, **free** plan, and a single instance. Verify the deployed commit before release. Current chat subscriptions and pending AI actions use process-local state, so multiple replicas are not supported.

Build command:

```sh
npm ci --include=dev && npm --prefix backend run build
```

Set `NODE_VERSION=22.23.1` and `NODE_ENV=production` in the service environment. Use `/api/health` as the health check. Preserve Render's supplied `PORT`.

`render.yaml` describes the environment-variable setup. Alternatively, the authorized CLI setup uses a private `maidaan.env` secret file and this start command from the repository root:

```sh
node --env-file=/etc/secrets/maidaan.env backend/dist/server.js
```

The secret file contains `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, optional provider model names, and these settings:

```dotenv
NODE_ENV=production
APP_DATA_MODE=production
PAYMENT_MODE=disabled
AI_PROVIDER=gemini
AI_FALLBACK_PROVIDER=groq
ALLOWED_ORIGINS=https://maidaan-sports.vercel.app
```

Use the exact assigned Vercel production origin without a trailing slash; additional origins must be explicitly comma-separated. The secret-file variant intentionally excludes payment keys and old local callback URLs.

Render's free service sleeps after 15 idle minutes and can take about a minute to resume. The cloud clients support a 120-second request timeout for this cold start. Free hosting provides access independently of the laptop, but does not provide an always-on guarantee. See [Render's free-service documentation](https://render.com/docs/free).

## Vercel and Android public configuration

Set these public variables in Vercel production and EAS preview before building. Obtain the API origin from the actual created Render service; do not use a predicted hostname.

```dotenv
EXPO_PUBLIC_API_URL=https://maidaan-api-7fs8.onrender.com
EXPO_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PUBLIC-PUBLISHABLE-KEY
EXPO_PUBLIC_APP_DATA_MODE=production
EXPO_PUBLIC_API_TIMEOUT_MS=120000
```

`EXPO_PUBLIC_SOCKET_URL` is optional when sockets use the same API service. Every `EXPO_PUBLIC_` value is visible to users. No service-role, AI, merchant or signing secret belongs here.

The root `vercel.json` uses `npm ci --include=dev`, builds with `npm run build:web`, serves `mobile/dist`, and rewrites application routes to the Expo SPA. `.vercelignore` excludes local environment files, tools, logs and generated evidence. Release checks reject missing API configuration, non-HTTPS origins and laptop IP addresses.

Build the installed Android app from `mobile` with the authorized Expo account:

```sh
npx eas-cli@latest build --platform android --profile preview
```

The preview profile has `developmentClient: false` and produces an internal APK. The EAS post-install check validates the public environment before the Android build proceeds.

## Supabase authentication

After the final web domain is assigned, set Supabase Authentication's Site URL to that origin and add its `/auth/callback` URL to Redirect URLs. Also allow `maidaan://auth/callback` for the installed APK. Preserve required existing local development entries. Google's OAuth redirect remains the Supabase auth callback, not the Vercel page. Keep Google's client secret only in Supabase.

The owner confirmed saving Site URL `https://maidaan-sports.vercel.app` and these redirects: `https://maidaan-sports.vercel.app/auth/callback`, `https://maidaan-sports.vercel.app/reset-password`, `maidaan://auth/callback`, and `maidaan://reset-password`. Web Google login is confirmed; installed-app OAuth and password recovery still need device checks.

## iPhone access

No Apple Developer membership is currently available. The free supported access path is the public website in Safari, using the same hosted backend. Do not describe it as a tested native iOS app. Native TestFlight/App Store distribution needs Apple Developer Program membership; internal ad hoc builds need signing and registered devices. A free Apple Personal Team can test on a personal iPhone using Xcode on a Mac, but provisioning expires after seven days and requires rebuilding/reinstallation. See [Apple's account guide](https://developer.apple.com/help/account/basics/about-your-developer-account) and [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/). Native iOS build/testing remains pending signing access and an iPhone test device.

## Verification before declaring the deployment complete

1. Public API health returns success and hosted browser requests pass exact-origin CORS.
2. Hosted web routes load directly, including login and auth callback.
3. Email login, profile, Discover, venues and authenticated API calls work against the existing Supabase data.
4. Two authenticated cloud clients exchange and persist a chat message; unauthenticated sockets are rejected.
5. A real AI request returns through the configured provider and fallback behavior remains covered.
6. Google sign-in completes the full web and installed-app return journey.
7. Install the **new preview APK** on RMX3890 / Android 15. Disable Wi-Fi and use mobile data, with the laptop shut down. Confirm launch, login, Discover, maps, chat and AI. Record any untested flow explicitly.

Do not treat a local export, development APK or CLI authorization as evidence that public hosting is live.
