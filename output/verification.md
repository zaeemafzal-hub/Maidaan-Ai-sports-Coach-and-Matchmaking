# Maidaan live verification — 17 October 2026

The tested flow was real Supabase registration and sign-in → Express profile API → player profile persistence → match discovery rendered in the browser. Coaching was tested through the configured NVIDIA provider and the authenticated Express endpoint.

| Check | Result | Evidence |
| --- | --- | --- |
| Backend availability | Passed | HTTP 200 on localhost and 192.168.18.11:5000/api/health |
| Web sign-in | Passed | A temporary account signed in with real Supabase Auth and reached /discover; no browser errors or warnings after sign-in |
| Profile persistence | Passed | PUT /api/profile/player returned 200; an independent service-role query read back the saved beginner profile |
| Match discovery | Passed with data issue | Authenticated API returned 16 fixtures and the browser displayed 16; past October 14 fixtures were still shown as open on October 17 |
| Player row access | Passed for tested tables | Temporary player could read one own profile, one own player profile, and zero unrelated join requests |
| Privileged RPC access | Passed for tested function | Anonymous accept_join_request call with nonexistent IDs returned permission denied (42501); no mutation |
| Database schema | Incomplete | PostgREST returned PGRST205 / HTTP 404 for user_roles, teams, and team_members |
| Live AI inference | Blocked by provider | Two NVIDIA requests returned HTTP 503, ResourceExhausted: Worker local total request limit reached (16/16) |
| AI failure reporting | Incorrect | Authenticated coaching endpoint returned HTTP 200 and provider=nvidia with a locally generated drill plan after the remote 503 |
| Automated backend checks | Passed | All seven suites completed, 148 checks passed, process exit 0 after credentials were configured |
| Expo Go delivery | Server verified; device pending | Android manifest HTTP 200, SDK 57.0.0, Wi-Fi host 192.168.18.11:8081; physical phone not accessible to automation |
| Phone-sized web layout | Rendered | Browser viewport 390 × 844; this is separate from native Expo Go verification |

## Missing database migrations

- `supabase/migrations/20261016000001_create_user_roles_table.sql`
- `supabase/migrations/20261016000002_create_teams_and_team_members_tables.sql`

The database was inspected without applying schema changes. Passing in-memory backend tests does not establish that the missing live tables exist.

## Running services

- Web: http://localhost:8081
- Phone on the same Wi-Fi: exp://192.168.18.11:8081
- Backend: http://192.168.18.11:5000

The backend was started with a process-level APP_DATA_MODE=production override to prevent automatic administrator/demo seeding. The environment files were not changed during verification.

## Cleanup and limitations

The temporary authentication account was deleted, its public profile cascade was verified, and the local file containing its generated credentials and session tokens was removed. Existing users, matches, and database schema were not modified by the live probes. Automated suites used their test-mode fixtures.

Real AI answer quality could not be assessed because the provider rejected both requests. Native rendering, microphone permissions, speech recognition, and interactions on the user's physical phone remain unverified. No Android/iOS binary was installed on a device.

## Evidence

- `playwright/discover-web.png`
- `playwright/discover-phone-web.png`

## Native login crash follow-up

The user confirmed that Expo Go loaded the welcome screen but opening Log In crashed. The supplied stack traced the exception to NativeWind's development warning serializer traversing React Navigation context getters, matching https://github.com/nativewind/nativewind/issues/1812.

Added `scripts/patch-nativewind.mjs`, automatically run by the root `postinstall` hook. It limits the development upgrade warning's serialized props to `className` and `testID`, avoiding React elements and context internals. The navigation container and app routes were not changed.

`npm run test:nativewind` reproduced the exact navigation error before applying the patch and passed after applying it. `npm run lint` passed, and the install hook was checked for safe repeat execution. Expo was restarted with a cleared Metro cache. The phone subsequently emitted the safe upgrade warning instead of the navigation exception. The web welcome → Log In navigation also passed.

The warning identified focus-only shadows in `FormInput.tsx` as an upgrade/remount trigger. Removed that wrapper's transition and focus shadow, preserving its focus border; typechecking passed again. Expo was restarted with live reload enabled. User confirmation of the final login/focus behavior on the physical phone is pending.

## Gemini and Groq setup

The user confirmed that the login screen now opens on the phone. Coaching, concierge classification, and grounded platform answers now use Gemini first and Groq second. Default models are `gemini-3.5-flash-lite` and `openai/gpt-oss-20b`. The backend reports the actual provider and `usedBackup`; the coaching API returns a clear 503 if both fail. Concierge offline drills are explicitly labeled. The mobile AI timeout is 65 seconds.

Live Gemini connectivity passed. Live Groq verification returned 401; the supplied backup credential has an xAI/Grok prefix rather than a Groq prefix. The user was asked whether to replace it with a Groq credential or choose xAI/Grok instead. A guard now rejects this mismatch before sending credentials over the network.

The original 148 backend checks passed, along with all 11 new provider/failover checks. Typechecking and the backend build passed. The provider checks use mocked network responses and do not compare generated answers. NVIDIA is no longer selected by the active provider factory.

The user subsequently replaced the backup credential with a Groq key. Live Groq generation passed. A separate isolated process made Gemini unavailable without editing environment files, and the complete coaching provider chain successfully returned a real Groq response with `usedBackup: true`. The backend was restarted with the updated credentials. Both Gemini primary and Groq backup are now verified live.

## Database and reliability follow-up — 2026-10-17

Prepared `database-repair.sql` from the corrected role and team migrations. The team migration now defines its timestamp trigger function, supports VICE_CAPTAIN, and requires an active captain role for direct client writes. The role policy can be recreated safely when rerunning the script.

Full GET requests still report PGRST205 for `user_roles`, `teams`, and `team_members`. An initial HEAD-based check incorrectly reported availability; that result is superseded by the GET checks. Applying the SQL remains a user action because the available service key supports data requests, and no SQL connection or dashboard is accessible in this session.

Source fixes now enforce active database roles without falling back to legacy roles after revocation; propagate profile, team and join-request persistence errors; preserve player statistics, creation timestamps and hub verification during edits; synchronize team details even when the team name is unchanged; and prevent concurrent confirmations from creating duplicate matches within the current backend process. Automatic shared-password admin creation is restricted to test fixtures. Discovery excludes started fixtures using Pakistan local time, and new join requests reject started or closed fixtures. Existing match records are retained for history.

The full backend suite passed with the first seven new reliability checks. Two additional reliability checks also passed, as did reruns of all 20 captain/team and 20 hub checks after the final changes. Total current checks: 168. Mobile/backend TypeScript checks, backend build, and diff whitespace checks passed.

`backend/scripts/verifyReliability.ts` provides the pending live profile/team/role verification with a disposable account and cleanup. Its initial probe encountered the missing schema; its temporary auth account and public profile were deleted. The script now checks all required tables before creating an account. Live verification and restarting the backend with these source changes remain pending the SQL repair. The currently running backend retains its previously loaded code.

The action store remains an in-memory prototype: duplicate-confirmation protection is limited to one backend process. Physical-device verification beyond the user-confirmed login fix remains incomplete.

## Database repair confirmed and backend restarted

The user reported “Success. No rows returned” from the Supabase SQL Editor. Full GET checks now pass for all three required tables. Live reliability verification passed: player edits preserved 12 recorded matches; captain onboarding created the team and captain membership; changing sport and area updated the team without requiring a name change; revoking TEAM_CAPTAIN removed authorization; and discovery returned three upcoming fixtures. Temporary verification accounts and their profile/team records were deleted afterward.

Rebuilt and restarted the backend on port 5000 with APP_DATA_MODE=production. HTTP verification against that running server passed for health, authenticated profile retrieval, discovery and captain team retrieval. The same authenticated session received HTTP 403 from the captain endpoint immediately after its captain role was revoked. This supersedes the earlier pending-migration and old-running-code status. No further physical-phone or browser interaction was performed during this database follow-up.

## Expo Go speech module crash

The user's stack showed Expo Router evaluating the voice route, which imported `expo-speech-recognition` and failed on its required native module. Removed the eager import from the speech service and added a lazy `requireOptionalNativeModule` check before evaluating the native package. Missing native support is cached as unavailable. Web still loads the browser implementation, and development builds retain the package's native implementation. The voice screen points users to Text Coach when recognition is unavailable.

All four speech regression checks passed (`npm run test:speech`), covering Android/iOS without the module, native transcript callbacks and browser module selection. Root TypeScript checks passed. Metro returned HTTP 200 for both Android and web bundles containing the new guard. Restarted Metro with a cleared cache on port 8081. Physical-phone confirmation remains pending; speech-to-text itself requires a development build on native devices because the package is absent from Expo Go.

## Email and Google authentication

Replaced synthetic login/signup/social fallbacks with Supabase authentication. Signup honors project email verification; the public backend signup endpoint now uses a separate public-key client rather than auto-confirming addresses through admin.createUser. Backend password validation now matches the eight-character signup form requirement. The existing configured public key was copied to the ignored backend environment file; secrets were not logged.

Google uses PKCE, an explicit callback route, a web redirect to the current origin and a native browser auth session. The callback validates the expected URL, handles provider errors/cancellation and exchanges each callback once. New OAuth users bootstrap a PLAYER profile without trusting metadata roles. Login and callback routing read fresh store state and require a successfully loaded profile. Added Google to signup with its terms requirement. Auth listeners defer async work outside Supabase's auth lock, synchronize refreshed tokens and preserve explicit empty role sets. Native session refresh follows foreground/background state. Removed the startup timer that could prematurely route signed-in users to Welcome; failures show a retry action.

Installed SDK-compatible expo-web-browser and expo-dev-client. The existing EAS development profile can build the Maidaan app with its custom scheme; no cloud build or physical-device Google test was performed. Expo Go retains email/password login and explicitly explains the Google OAuth limitation.

Validation: all 168 existing backend checks plus two new public-registration checks passed; all 14 client auth regressions, the NativeWind warning regression, TypeScript checks, backend build and diff checks passed. Android Metro bundling returned HTTP 200 with the OAuth route included. Real browser checks passed for required login/signup fields, login with a disposable account, first-login profile bootstrap, session restoration through the entry route, Google signup terms and a cancelled callback with a Back to Sign In action. Screenshots: `playwright/auth-first-login.png`, `playwright/auth-signup-validation.png`.

Live Supabase verification passed for blocking an unconfirmed account, confirming its signup token, rejecting a wrong password, accepting the correct password, PLAYER profile initialization, token refresh and logout. Verification tokens were generated without sending mail, so actual SMTP/email delivery remains unverified. All disposable accounts, profiles and the ignored browser credential fixture were deleted. The backend was restarted with the corrected signup policy and returned HTTP 400 for seven-character passwords and 403 for public ADMIN registration.

Google is disabled in Supabase at the time of these tests. The user was given `google-auth-setup.md` with exact project callback URLs and step-by-step Console instructions. Full Google consent/account-selection/return verification remains pending enabling the provider and applying the redirect allowlist. Code and mocked Google tests do not establish a completed Google login.

The final public settings check showed email confirmation had been disabled in Supabase during this session. The app follows that setting and supports immediate-session signup as well as confirmation-required signup. Added an immediate-session regression, bringing client auth checks to 15. The earlier live unconfirmed-account test passed before that settings change; it is not a statement of the final project policy.

## Google provider enabled

After the user completed Console setup, Supabase's public auth settings returned `google: true`. Clicking Continue with Google in the real web login screen successfully navigated through Supabase to Google's account sign-in page. The Google redirect URI points to this project's Supabase callback, with the application return URL set to `http://localhost:8081/auth/callback`. No redirect mismatch or invalid-client error appeared at this stage. Google account credentials/consent and the completed return to Maidaan still require the user's own account interaction; the user was asked to complete that step in their browser. Reaching Google's sign-in page does not yet verify the configured client secret during the code exchange.

The user then completed Google sign-in in their own browser and confirmed arrival at the Discover screen. This confirms the real Google consent/login, Supabase callback/session establishment, server profile loading and application routing for that account. This supersedes the pending web Google return status above. Native Google sign-in remains dependent on installing a development build and has not been verified on the physical phone.


## Hub availability and super-user controls — 2026-10-17

The user applied the corrected hub/admin migration successfully. New schema fields and tables were confirmed live. Owners can manage playing spaces, sport formats, venue address/coordinates/photos, and dated priced slots; public hub browsing is linked from Discover and captain workspace. Bookings/payments remain deferred. Account suspension/reinstatement and super-user grants/revocations use service-role-only audited SQL functions. The designated existing account was granted ADMIN through the private CLI.

All existing backend tests, new venue/admin integration checks, 15 auth regressions, TypeScript/build and diff checks passed. Live disposable-account verification covered storage, all four sports, overlap constraints, ownership, account details/filtering, suspension/reinstatement and role changes. Real browser owner/player/admin workflows passed at 390 px; desktop hub search/filter and admin grant/revoke/dashboard checks passed. Early Expo/font loading timed out during cache rebuilding; later browser interactions completed. Android bundling completed; the user is testing physical Expo Go behavior. Temporary data and the credential fixture were removed. See hub-admin-guide.md for use and limitations.


## Theme alignment — 2026-10-17

Replaced the new lime/green venue and admin styling with the existing COLORS/RADIUS tokens: orange actions, charcoal surfaces, neutral borders, white/gray typography and pill buttons. Discover/captain venue entry now shares a dark icon card; the profile admin entry uses PrimaryButton. Existing FormInput remains the form control. Type checking and diff checks passed. Browser inspection at 390px confirmed the venue form, playing-space form and Discover browse card match the established theme; venue save passed. The disposable theme-review account/listing was removed. Screenshots: theme-venue-form.png, theme-playing-space-form.png, theme-venue-browse-card.png.

## Venue booking and sandbox payment verification — 2026-10-17

Implemented owner-configured full/advance payment choices, positive upfront payment, cancellation deadlines, full-refund/retained-advance policies, customer bookings, owner reservations, and admin refund tracking. Booking quotes and cancellation terms are snapshotted in PostgreSQL. Row locks and a unique active-reservation index prevent double booking; signed payment events are amount/currency/reference checked and replay protected. Late payments cannot take another customer's slot and instead become pending refunds.

The user applied booking-upgrade.sql and configured Safepay's keys, endpoint and signing secret. With explicit user approval, an official checksum-verified Cloudflare client exposes only three callback routes through a restricted local proxy. Public checks returned 200 for the payment return page, 400 for an unsigned webhook, and 404 for unrelated API routes.

A real Safepay sandbox checkout was completed in the browser using Safepay's documented dummy card and displayed test authentication code. The gateway's signed webhook updated the disposable Supabase booking to CONFIRMED with exactly 50,000 paisa (PKR 500) paid. Maidaan rendered that confirmation and the PKR 1,499.99 venue balance. Customer cancellation displayed the saved keep-advance policy, changed the booking to CANCELLED with zero refund due, and released the slot back into the venue listing. No real funds were used.

Live database checks also passed for full/advance quotes, idempotent holds, hiding reserved slots, rejecting edits during holds, cancellation release and preserving booking history. Browser owner controls persisted a 30% advance and a 12-hour deadline. Screens at 390px use the existing orange/dark theme; malformed separators were corrected and legacy booking labels are normalized. Temporary accounts, venue photos, listings and test booking records were removed after verification.

All 17 booking policy/API/PostgreSQL checks passed, including forged events, replay handling, ownership, full/partial/no-refund rules, late payments and browser-role execution restrictions. Existing backend regression tests passed earlier in this implementation; final TypeScript lint and build passed. The final return-page change adds an explicit web-bookings link while preserving Expo Go's close-browser-and-refresh flow.

Remaining limits: physical Expo Go payment checkout has not yet been confirmed by the user. JazzCash integration remains disabled because sandbox merchant access/credentials are unavailable; no completed JazzCash transaction is claimed. Refund amounts and tracking are implemented, but initiating a refund requires the administrator to use the original gateway dashboard and then record its completed reference; no automatic refund transfer or real gateway refund was verified. The Cloudflare URL is temporary and requires its proxy/tunnel processes to remain running. See booking-guide.md and payment-sandbox-setup.md.
