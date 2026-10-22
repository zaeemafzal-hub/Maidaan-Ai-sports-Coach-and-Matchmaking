# Maidaan enhancement verification — 22 October 2026

The requested changes were implemented and checked in sequence. Release verification is listed separately below.

1. **Email verification and strong passwords — passed.** Signup and reset require at least eight characters, uppercase, lowercase, digits and a symbol, with live requirement hints. Verification messages can be resent with a cooldown. Backend REST and socket authentication reject unverified email users. Live disposable-account checks confirmed unverified login is denied, a real signup token confirms email, and direct Supabase password updates enforce all five requirements. Fixtures were removed. Supabase settings were saved by the project owner.
2. **Minimal match weather — passed.** Match details use a compact temperature/condition/rain summary. Missing or out-of-range forecasts show unavailable instead of invented temperatures. Expanded scheduling weather remains available to captains. Mobile and desktop browser checks passed.
3. **Match location links — passed.** Tapping the match venue/address opens an OpenStreetMap address search. A separate action opens venue listings with the match venue name prefilled. Matches currently store venue text, so this is an address search rather than an asserted exact GPS pin or a fabricated association to a hub.
4. **Welcome/help guide — passed.** A first-use guide explains account setup, matches, venues, bookings, chat and AI, with extra chapters for the active captain, hub-owner or admin role. Help buttons reopen it. Dismissal survives reload. Mobile browser chapter navigation, reopening and overflow checks passed.
5. **Admin permission boundaries — passed for tested cases.** Roles are taken from server/database records. Profile edits reject privilege/status fields, and admin responses disable caching. Live ordinary-player checks denied five admin endpoints, spoofed role headers, forged/missing tokens, public ADMIN initialization, metadata escalation, direct role/profile writes and privileged RPC calls. No existing administrator or listing was altered. These verify specific boundaries, not a guarantee against every possible exploit.
6. **Light/dark appearance — passed.** Dark, light and device-following options persist locally. Existing screens share an adapter for their legacy colors, preserving layout and handlers. Navigation, forms, icons, artwork overlays and the OpenStreetMap bridge adapt to appearance. Browser checks verified readable light Discover/Profile, restored dark preference, available device mode and a Coach draft preserved across theme changes. Native appearance needs the new APK because expo-system-ui was added.
7. **Your Assistant — passed.** User-facing Concierge labels now say Your Assistant. A prominent Discover entry sits directly under the hero, above fixtures. The existing route, assistant type and account-history keys remain unchanged. Browser entry and conversation opening passed.
8. **Full-screen loading — passed.** API requests, account/profile loading and submitting primary buttons show a screen-covering loader without unmounting content. Request accounting keeps it visible until overlapping work completes; route scoping excludes requests left on another screen. Finally blocks release it on success/failure. Existing request timeouts remain. Browser delay/failure/retry coverage and request-lifetime tests passed.

## Authentication scope

Mandatory email confirmation proves email ownership. It is distinct from a second authenticator code at every login. Optional authenticator MFA for ordinary users and mandatory MFA for admins were recommended; TOTP enrollment/challenge has **not** been added. Previously confirmed accounts are preserved.

## Regression evidence

- Root tests: 37 passed across authentication, appearance, loading, maps, cloud configuration, speech safety and NativeWind warning handling.
- Complete backend test command passed: provider fallback, weather, registration, security, reliability, venue/admin authorization, booking rules/SQL, location profiles, agent confirmations, role activation, captain/hub workflows, data isolation, realtime chat, F0 locking/RLS and private assistant history.
- The role-activation test's hardcoded October 20 fixture had expired; it now schedules a future date. Production schedule validation was preserved.
- TypeScript checks passed for mobile and backend.
- Credential scan found no configured secrets or oversized files among the release changes.
- Browser presentation checks used a local preview and disposable player. A browser-only route adapter allowed the existing hosted API without broadening production CORS.

## Release status

The initial enhancement release is live on Vercel and Render from `deploy/public-hosting` commit `0863a9e`. Hosted checks passed for verified email login, first-use guide, Your Assistant, light appearance and OpenStreetMap light/dark synchronization. Mobile and desktop checks found no runtime exceptions or horizontal overflow.

Web, Android and iOS exports passed. This does not replace installed-device acceptance or iOS signing.

A subsequent hosted navigation check caught a loader timing gap on returning to a tab. Requests now read the navigator's committed route key synchronously, and authentication retries retain their original screen owner. A delayed focus-fetch browser check and the added regression tests passed. An obsolete Android build was cancelled; the corrected APK and hosted update are being prepared.

EAS Doctor reported newer compatible patch versions for Expo and Expo Router (20/21 checks passed). The warning did not prevent native compilation. Dependencies were not broadly upgraded.

Provider configuration references: [Supabase password security](https://supabase.com/docs/guides/auth/password-security), [Supabase email/password authentication](https://supabase.com/docs/guides/auth/passwords).
