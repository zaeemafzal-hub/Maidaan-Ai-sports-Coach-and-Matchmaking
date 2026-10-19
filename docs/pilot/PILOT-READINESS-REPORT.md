# MAIDAAN — F0 controlled pilot readiness

Assessment date: 2026-10-18; installed-phone follow-up: 2026-10-19. Verdict: **STAGE 4 — INTEGRATED MVP**. Critical web journeys now pass with real Supabase identities and persisted data. The user reports installed Android operation, including corrected Admin desk rendering; the itemized Android checklist remains incomplete. Stage 5 is not claimed: detailed remaining native checks, fresh Google OAuth round trips, permanent HTTPS hosting and real owner inventory are still outstanding.

This phase preserves the Cinematic Obsidian + Solar Orange theme and existing features. It adds no GPS, push, Apple sign-in, AI agents, payment providers or real-money operation. The separate welcome-button correction makes its background explicitly orange and text white; real browser checks at 390 and 1280 pixels verified visibility and Create Account navigation. The user also confirmed the orange button is visible in Expo Go on RMX3890, Android 15. Installed APK acceptance remains pending.

## Environment and evidence boundaries

Acceptance used the actual Expo web app on localhost:8084 and one Express/Socket.IO process on loopback port 5004, with `APP_DATA_MODE=production`, the existing live Supabase project and `PAYMENT_MODE=disabled`. Five isolated real Auth accounts were created for PLAYER_A, CAPTAIN_A, PLAYER_B, HUB_OWNER_A and ADMIN_A; a sixth was created through the public signup screen. Backend acceptance identities used real Supabase password sessions. Browser sessions for the five actors were initialized with those actual sessions; the sixth exercised public signup, logout and fresh password login without session injection. No auth API was mocked. The only injected API failure was the explicitly identified admin error-state check.

CAPTAIN_A began as PLAYER, retained primary role PLAYER and acquired TEAM_CAPTAIN through the normal setup endpoint. PLAYER_A separately completed Captain activation through the actual browser UI, then also completed Hub Owner activation. The disposable administrator capability was granted server-side for acceptance only. Test names explicitly said F0 DISPOSABLE/TEST ONLY; no physical venue verification was asserted.

Five browser contexts ran Chromium. Two exchanged messages without refreshing, using real authenticated Socket.IO connections and persisted Supabase chat history. Browser layouts were checked at 390, 768 and 1280 pixels. Android export and EAS compilation are separate from installed phone acceptance.

All six disposable Auth users were deleted after acceptance. Verification found zero remaining Auth/profile rows for those identities and the original 13 teams. Test teams, matches, membership, chat and hub records were removed by account foreign-key cascades. Existing users and pending verification requests were not moderated or deleted. Password/session artifacts were ignored and removed.

## Readiness results

| # | Topic | Result | Evidence and limit |
| --- | --- | --- | --- |
| 1 | Captain bug | PASS | PLAYER-primary account with granted TEAM_CAPTAIN and Captain mode opened dashboard/team/create/requests. Unit and browser checks cover the exact previously broken guard. |
| 2 | Player → Captain | PASS | Public signup/setup/password session were tested separately; real PLAYER_A used Profile activation and Captain Setup, loaded dashboard/team, switched modes and created a future fixture through UI. |
| 3 | Player → join → accept | PASS | PLAYER_B found the created fixture in Discover, requested, saw pending; Captain accepted in Requests; player reloaded to accepted/confirmed and opened group chat. |
| 4 | Realtime chat | PASS | Two actual browser clients exchanged both directions without refresh; both saw persisted history after reload. DB retry returned the same stored ID; isolated lost-ack socket→REST test stored one logical message. Unauthorized room access was denied. |
| 5 | Hub → Admin verification | PASS | Real owner setup, court and future priced/policy slot via authenticated API; browser owner activation/setup/submission; Admin queue review/approval; owner refresh displayed verified. Browser court/slot editor interaction is still part of the phone checklist. No physical verification claim. |
| 6 | Migration consistency | PASS / bounded | User applied F0 migration successfully. Complete incremental migration path plus repeat F0 application passed local PostgreSQL checks. Canonical enums and unique captain index tested. Consolidated fresh-install schema ends with F0; the entire consolidated file was not independently deployed live. |
| 7 | Capacity concurrency | PASS / tested cases | Three actual concurrent Supabase recruitment/acceptance cases ended with confirmed=2, open=0, capacity=2; both operation orderings occurred. PostgreSQL regression also rejects stale recruitment above remaining capacity. This is evidence for those cases, not a proof of every possible workload. |
| 8 | RLS/ACL | PASS / bounded | Ordinary authenticated public-key/JWT reads worked for members, outsider reads returned zero rows, forged-actor mutation RPC was denied. Local complete-schema checks cover every app-owned definer search_path/ACL. Exhaustive live pg_catalog audit was unavailable through REST. |
| 9 | Real-data isolation | PASS | Production mode rejects synthetic auth and seeding, suppresses demo history, fails live repository operations rather than silently using memory. Live browser/API acceptance used real Supabase records. Missing weather returns unavailable; no invented numbers. |
| 10 | Installed Android | PARTIAL, user-reported | EAS APK installed on RMX3890 / Android 15. User reports other features work; Admin desks initially blank, then both display after the fix/reload. Detailed checklist and fresh native OAuth remain incomplete. No emulator/ADB device is attached; no agent-operated native pass is claimed. See ANDROID-ACCEPTANCE.md and ADMIN-DESK-FIX.md. |
| 11 | Web runtime | PASS / local | Signup, mandatory setup, logout/password login, session restoration, capability switching, Captain, Hub, Admin, two-client chat, Coach, Concierge, weather and OSM exercised. Main routes fit all three widths, nested buttons=0 in checked routes. Final five browser consoles had zero errors; no uncaught critical error remained after fixes. This was local web, not a deployed domain. |
| 12 | Google OAuth | NOT TESTED in F0 | Earlier user-reported web success is historical evidence only. Fresh web and installed-app OAuth round trips require manual provider interaction and final callback configuration. Expo Go localhost redirect history is not marked fixed by F0. |
| 13 | AI | PASS / primary; PARTIAL / live fallback | Actual Coach request returned HTTP 200, Gemini, usedBackup=false and a 1,048-character response. Concierge current-role question returned HTTP 200 with current RAG sources. Shared provider tests exercise failover/error handling; Groq was not forced during live F0 browser acceptance. |
| 14 | RAG freshness | PASS | All nine documents updated; 38 chunks loaded. Six benchmark queries found expected sources within top three. Built dist loaded all nine documents from a different working directory. |
| 15 | Weather | PASS | Real Open-Meteo clear-sky forecast displayed during web acceptance. External failure returned controlled unavailable in automated tests. No synthetic live weather. |
| 16 | Map | PASS / web | Actual OpenStreetMap iframe loaded ten tiles with Leaflet/OpenStreetMap attribution. Registered venue/pin behavior retained. No GPS permission or fabricated live venue pins. Installed WebView remains untested. |
| 17 | Deployment | PARTIAL | Explicit REST/socket/map backend resolution, production origin allowlist, PORT, knowledge packaging, env examples and single-server instructions are ready and tested locally. No permanent HTTPS backend/web domain or final OAuth deployment has been provisioned. |
| 18 | Dependencies/security | PARTIAL | 36 npm advisories remain: 22 high, 14 moderate, zero critical. All paths individually classified in DEPENDENCY-TRIAGE.md; no compatible blanket fix was available. Runtime URL decoding needs follow-up; other root causes are mostly build tooling. No forced SDK downgrade applied. |
| 19 | Remaining blockers | PARTIAL | No P0 data-integrity/security defect remains in the tested paths. Release gates: installed Android acceptance, fresh OAuth, stable hosting/final origins and real inventory. This is not an exhaustive security certification. |
| 20 | Final verdict | STAGE 4 | Ready for supervised university demonstration and continued internal testing. A small external pilot remains conditional on the release gates below. |

## Browser journey record

| Steps | Executed result |
| --- | --- |
| Public user signup → Player Setup → Discover | PASS; real account, mandatory phone/address/sport/skill entered. A handled initial profile lookup 404 was followed by lazy initialization; no uncaught signup failure. |
| Logout → Login email/password → Discover → page reload | PASS; signed-in session restored. |
| PLAYER_A Profile → activate Captain → Captain Setup → Captain Dashboard → Team | PASS; primary role remained PLAYER. |
| Create fixture with Tomorrow/8:30 PM preset | PASS; saved canonical Pakistan-local 2026-10-19, 20:30; browser fixture `4cbebf4d-66fe-49e4-b002-c476787a83af`. |
| PLAYER_B Discover → Match Details → request | PASS; PENDING state. |
| Captain mode → pending requests → accept → confirm | PASS; accepted participant and notification persisted. |
| PLAYER_B accepted → confirmation → chat | PASS; authorized group room `cbeebbf9-f835-4ef2-8d45-df9e4629d63e`. |
| Captain sends → Player receives → Player replies → Captain receives | PASS without refresh; both reload histories retained. |
| Player Profile → Hub activation/setup → submit verification | PASS; disposable test-safe address/name. |
| Admin queue → review the disposable hub → approve → owner reload | PASS; Venue Verified appeared. Other pending hub requests were left unchanged. |
| Admin count query injected HTTP 503 → error UI → real recovery | PASS; metrics/activity hidden during error, no fake zeros. The test uncovered and then verified the separate id/requestId contract fix. |

Screenshots were inspected/captured under ignored `output/playwright/f0-*.png`, including Captain activation, created fixture, both chat clients, Hub verification, admin failure, live Coach/Concierge/map and width checks. Machine-readable local evidence: `output/f0-live-evidence.json`, `output/f0-live-security-capacity.json`, `output/f0-cleanup-evidence.json`, `output/f0-final-browser-console.json`. These are local acceptance artifacts, not credentials or production telemetry.

## Automated verification

Final unique reported total: **251 passed, 0 failed, 0 skipped**. Backend: 230 (11 provider tests + 53 Node test-runner checks + 148 legacy assertion checks + 18 F0 checks). Root: 21 auth/maps/native-style/speech checks. F0 is included once in backend npm test; standalone diagnostic reruns are not double-counted. These are reported checks, not 251 distinct user journeys. Some legacy assertion scripts contain source-level assertions; browser/API/PostgreSQL evidence above is recorded separately.

Commands: `npm --prefix backend test`; `node --test scripts/auth-flow.test.mjs scripts/nativewind-warning.test.mjs scripts/speech-recognition.test.mjs scripts/maps-bridge.test.mjs`; `npm run lint`; `npm run build`. All completed successfully. The current lint script runs mobile/backend TypeScript checks; it is not ESLint. The first final test attempt failed before test execution because restricted Windows `os.userInfo()` failed inside tsx; the unrestricted rerun passed. No application test failure was hidden.

Web and Android Expo exports passed to `.expo/f0-acceptance` (approximately 3.4 MB web JS plus 35 KB CSS and 5.7 MB Android JS). Export cache fallback/full crawl and an ambiguous Tailwind shadow class warning were non-blocking. Main local Metro also emitted Reanimated shared-value render warnings during earlier native use; these need a focused follow-up if reproduced in the installed build. Export/build success is not native runtime acceptance.

## Android build

Linked EAS project: `zaeeem17/maidaan`, project ID `3bddca7f-cf13-40a3-b1b1-83e6081d84fb`.

First build `b4d96c3c-f544-4e1c-9513-89e4775567bb` failed at dependency installation because an obsolete Bun lockfile was selected and could not be parsed/satisfied. Corrected by removing that stale lock and making the existing npm workspace lock authoritative; no Expo/React Native downgrade.

Retry [b8572844-05ee-49ff-96e4-5e3dc3deab9a](https://expo.dev/accounts/zaeeem17/projects/maidaan/builds/b8572844-05ee-49ff-96e4-5e3dc3deab9a): **FINISHED**, 2026-10-18 18:14:02 UTC. [Download the APK](https://expo.dev/artifacts/eas/OoCSn1fjstcCXxoBDqobigyVYSyBDudcjmQX5b92kfI.apk). Development/internal APK is intentional for local Metro acceptance before permanent hosting. User-reported device: RMX3890, Android 15. Installed results: NOT TESTED; installation guidance and checklist supplied. Use [ANDROID-ACCEPTANCE.md](ANDROID-ACCEPTANCE.md) to record results when available.

## Release gates and next phase

1. Install the completed development APK and execute every Android checklist row with device/version/date; fix any resulting runtime blocker before claiming Stage 5.
2. Complete fresh web and installed-app Google OAuth round trips with the final allowlisted callback URLs.
3. Provision one permanent HTTPS backend with WebSockets, deploy actual frontend, set exact origins/URLs, verify restart/recovery and operational backups. Do not scale to multiple Node processes in F0.
4. Onboard 1–3 consenting real owners using HUB-OWNER-ONBOARDING.md; verify real photos, addresses, map pins, courts, prices and future availability. Initial existing inventory lacked those essentials; F0 disposable listings were removed.
5. Follow up deferred dependency advisories with SDK-compatible patches and malformed callback-input testing; investigate reproducible Reanimated warnings.

Payments remain disabled/sandbox. The first pilot can coordinate attendance and contact owners without collecting funds; disabled checkout does not create paid reservations. University evaluation: supervised demonstration appropriate. Internal testing: approved with known limits. Small external pilot: conditional, not yet approved as Stage 5. Stop at F0 acceptance closure; no expansion phase has begun.
