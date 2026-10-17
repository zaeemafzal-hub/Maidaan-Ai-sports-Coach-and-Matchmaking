# Maidaan — AI Sports Matchmaking & Coaching Platform

Final Year Project (FYP) mobile application and backend service.

## Structure

- `mobile/`: Expo + React Native + TypeScript + Expo Router + NativeWind + Zustand
- `backend/`: Node.js + Express + TypeScript + Supabase Auth/Postgres API

## Quick Start

### Mobile Application
```bash
cd mobile
npx expo start --go
```

### Backend API
```bash
cd backend
npm run dev
```

## Authentication

Email signup uses Supabase and requires email confirmation when enabled in the
project. Login, Google callbacks and account restoration load the server profile
before entering the app. New accounts start as PLAYER and complete onboarding.
Synthetic accounts and metadata-based permission fallbacks are disabled.

For Google Console and Supabase redirect configuration, see
[Google sign-in setup](output/google-auth-setup.md). Google OAuth works on web
and in a Maidaan development build; Expo Go can use email/password.
Google client secrets belong only in Supabase's provider settings.

The Android development profile is in `mobile/eas.json`. After signing into
your Expo account, run from `mobile`:

```bash
npx eas-cli@latest build --profile development --platform android
# Install the resulting APK, then start its development server:
npx expo start --dev-client
```

Use `npx expo start --go` when continuing with Expo Go instead. Native voice
recognition also needs the development build.

`backend/.env` needs `SUPABASE_PUBLISHABLE_KEY` for the public signup endpoint,
alongside the service key used only for trusted database operations. Public signup
never uses administrator account creation or bypasses email confirmation.
Configure Supabase SMTP before relying on email delivery beyond local tests.

Run `npm run test:auth` for client auth regressions. The backend suite includes
public registration checks. `backend/scripts/verifyAuth.ts` checks a live
disposable account without sending mail and cleans it up afterward.

## AI providers

Set `GEMINI_API_KEY` and `GROQ_API_KEY` in `backend/.env` (see `backend/.env.example`).
The backend tries Gemini first and Groq second for coaching, intent classification,
and grounded platform answers. `GEMINI_MODEL` and `GROQ_MODEL` select the models;
`AI_PROVIDER` and `AI_FALLBACK_PROVIDER` select their order. Restart the backend
after changing environment variables. Keep both keys out of mobile environment files.

Each provider has a 20-second coaching limit. Successful responses identify the
actual `provider` and whether `usedBackup` is true. If both fail, the coaching API
returns HTTP 503. The concierge may show explicitly labeled offline guidance.
AI requests in the mobile app allow up to 65 seconds for classification and failover.

Run `npm --prefix backend run test:ai` to verify provider requests and failover using
mocked network responses; the tests do not spend API credits.
