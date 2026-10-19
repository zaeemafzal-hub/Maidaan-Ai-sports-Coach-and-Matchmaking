# Maidaan — Current Project Condition Audit

Audit date: **18 October 2026**. Repository: `E:\maidaaan\Maidaan-Ai-sports-Coach-and-Matchmaking`.

Scope: the **current working tree**, including its existing uncommitted changes, rather than only commit `287ebf34b6860be278adc9fa1c70d781fa387d4d`. No application source, configuration, migration, credential or dependency was changed during this audit. Builds produced ignored artifacts; tests used isolated fixtures. Live database access was read-only. One short live coaching request was made. No real payment, registration, email delivery, account moderation or database migration was performed.

Evidence labels used below:

- **T**: automated checks executed during this audit; usually mocked providers or in-memory repositories, with a local PostgreSQL engine for selected booking checks.
- **B**: actual browser behavior observed during this audit, using a disposable local account/API rather than a real Supabase login.
- **L**: live external service or read-only Supabase evidence collected during this audit.
- **S**: source/configuration evidence; implementation alone does not establish runtime success.
- **H**: older verification notes/user confirmations. These are context, not newly executed tests or current device verification.

`WORKING` in a feature row means the stated, bounded behavior has evidence. It does **not** mean that the entire feature is production-ready. Missing current live/mobile evidence is identified explicitly.

## 1. Executive Summary

**Maidaan is an integrated MVP with substantial working backend functionality, not a pilot-ready or production-ready product.** It is substantially beyond a UI prototype: real Supabase tables, authorization, teams, join requests, realtime chat, venue availability, payment-policy transactions, LangGraph, RAG and live Gemini coaching exist.

However, the normal player-to-captain UI journey is currently broken. A disposable account with primary role `PLAYER`, active `TEAM_CAPTAIN` capability and a valid captain profile received **HTTP 200 with its team from `/api/captain/team`**, while `/captain/dashboard` displayed **“Captain Access Required.”** The UI prioritizes `currentUser.role` over the capability/mode model. A read-only count found **one existing live account** with that affected role combination. The same guard appears in captain scheduling, team and join-request screens. No fix was applied.

Current automated results are **231 reported checks passed, 0 failed, 0 skipped**, across 15 backend test files and four client regression files. This includes a real local two-client Socket.IO test. The green suite does not cover the reproduced multi-role browser failure. Mobile/backend typechecks, backend build, and current Android/web bundle exports also passed. These are not evidence of an installed Android application working on a device.

Live evidence:

- All **22 application tables** queried were reachable; new location, account-status and slot-payment columns were present.
- Gemini returned a substantive cricket drill, provider `gemini`, `usedBackup=false`.
- Weather returned real Gulberg conditions, `isFallback=false`.
- The current browser venue map loaded real OpenStreetMap tiles and attribution.
- There are **13 stored hubs but zero hubs with pins, structured area assignments or photos**, and **zero available slot records or bookings**. There are 17 stored matches, three of them future-dated at the audit instant.
- Payment code is explicitly **sandbox-only**. JazzCash credentials are absent. The configured temporary Cloudflare callback hostname failed DNS resolution (`ENOTFOUND`).

The principal gaps are the captain UI guard, database provisioning/security consistency and capacity concurrency, production hosting/configuration, usable venue inventory, and native/mobile acceptance evidence. Existing application code was left unchanged.

## 2. Current Architecture

| Layer | Actual implementation | Evidence / limitation |
| --- | --- | --- |
| Mobile/web | Expo **57.0.28**, React Native **0.86.3**, React **19.2.3**, TypeScript, Expo Router, NativeWind, Zustand, AsyncStorage | `mobile/package.json`; 41 route files excluding layouts; Android/web exports passed |
| Backend | Node.js, Express 4, TypeScript, modular routes/controllers, repository modules | `backend/src/app.ts`, `server.ts`, `models/*`; current backend build passed |
| Database/auth | Supabase PostgreSQL, Supabase Auth, Storage | `backend/src/lib/supabase.ts`, `mobile/lib/supabase.ts`; 15 incremental migrations plus a separate consolidated schema |
| Realtime | Socket.IO attached to the Express HTTP server, shared mobile client | `backend/src/socket/socketServer.ts`, `mobile/services/socketService.ts` |
| AI | Official LangGraph `StateGraph`, Gemini primary/Groq backup abstraction, deterministic tools and fallbacks | `backend/src/agents/graph.ts`, `backend/src/ai/providerFactory.ts` |
| RAG | Local Markdown, section chunker, in-memory BM25 retrieval | Nine files, **36 chunks** calculated with the current loader |
| Payments | Safepay sandbox, JazzCash sandbox wallet adapter, signed callbacks and transactional booking records | `backend/src/payments/sandboxGateways.ts`; no live-money mode |
| Weather | Open-Meteo, coarse Lahore area coordinates, 15-minute memory cache | `backend/src/services/weatherService.ts` |
| Maps | Leaflet/OpenStreetMap page embedded with iframe/WebView; Google backup | `backend/src/maps/openMapPage.ts`, `mobile/components/locations/*` |
| Deployment | EAS build profiles; backend TypeScript output; Expo single-page web export | No repository hosting/rewrite/reverse-proxy/CI deployment configuration found |

The project instructions still mention MongoDB/Mongoose and lime colors. Those descriptions are stale: the current implementation uses Supabase and Cinematic Obsidian/Solar Orange. `jsonwebtoken`, `bcryptjs`, the root applet files, older images and the NVIDIA provider are legacy material, not the current primary architecture. Both `bun.lock` and `package-lock.json` exist; the exercised workspace scripts use npm.

## 3. Current Feature Inventory

Legend: `Y` = implemented; `—` = not applicable; `N` = absent. Runtime column states what was actually checked, rather than treating file existence as success. “DB Y” means schema support exists, not that deployed RLS/constraints were fully inspected through SQL.

| Group / feature | Implementation | Backend | DB | Frontend | Tests | Current runtime evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Authentication: email signup/login/logout | Y | Y / Supabase | Y | Y | Y | T; no new live account round trip | IMPLEMENTED BUT UNVERIFIED |
| Authentication: restore/refresh/recovery | Y | Y / Supabase | Y | Y | Y, partial | T; mail delivery/device return not exercised | IMPLEMENTED BUT UNVERIFIED |
| Authentication: Google web | Y | Supabase | Y | Y | Y | L provider enabled; H successful return; no new consent round trip | IMPLEMENTED BUT UNVERIFIED |
| Authentication: Google native | Y | Supabase | Y | Y | Y, mocked | Expo Go explicitly declines; signed build not tested | PARTIALLY WORKING |
| Authentication: Apple sign-in | Placeholder | N | N | Button only | N | S handler only displays configuration errors | MISSING |
| Player: phone/address/photo setup | Y | Y | Y | Y | Y | T; L fields/storage exist | WORKING |
| Player: Discover/match detail/join | Y | Y | Y | Y | Y, API-heavy | T; fresh real-user end-to-end flow not repeated | PARTIALLY WORKING |
| Player: real match history/stat updates | Partial | Partial | Counter exists | Y | Limited | Production history is empty; development history is demo content | PARTIALLY WORKING |
| Profile/mode switching | Y | Y | Y | Y | Y, API/store | B captain mode denied despite valid server capability | BROKEN |
| Captain: activation/setup | Y | Y | Y | Y | Y | T setup/team creation; subsequent UI guard fails for PLAYER-primary users | PARTIALLY WORKING |
| Captain: desk/team/schedule/requests | Y | Y | Y | Y | Y | T APIs; B normal multi-role UI denied | BROKEN |
| Teams: ownership/members/match link | Y | Y | Y | Y | Y | T; status/role schema drift and concurrent team creation not resolved | PARTIALLY WORKING |
| Matches: creation/recruitment/acceptance | Y | Y | Y | Y | Y | T; recruitment write/acceptance race remains source finding | PARTIALLY WORKING |
| Join requests: pending/accept/reject | Y | Y | Y | Y | Y | T; atomic acceptance is implemented | WORKING |
| Hub owner: profile/courts/verification | Y | Y | Y | Y | Y | T; live schema exists; no current physical-owner workflow | PARTIALLY WORKING |
| Hub owner: dated availability/prices/photos | Y | Y | Y | Y | Y | T; L zero actual slots/photos/pins | PARTIALLY WORKING |
| Booking policies/holds/cancellation | Y | Y | Y | Y | Y, including local SQL | T; current live inventory cannot support a booking | PARTIALLY WORKING |
| Safepay checkout/callbacks | Y, sandbox | Y | Y | Y | Y, mocked/SQL | H prior sandbox success; L configured callback DNS unavailable now | BROKEN |
| JazzCash checkout | Y, sandbox | Y | Y | Y | Y, mocked | L credentials absent; adapter not gateway-verified | IMPLEMENTED BUT UNVERIFIED |
| Refund transfer | Tracking only | Manual recording | Y | Y | Y, bookkeeping | Actual refund requires gateway dashboard operation | PARTIALLY WORKING |
| Admin: dashboard/verification/reports | Y | Y | Y | Y | Y | T; L supporting tables/counts; not a new real-admin browser session | WORKING |
| Admin: suspend/reinstate/superusers | Y | Y | Y | Y | Y | T; audited service-only functions; current-process socket disconnect exists | WORKING |
| Community: submit a report | Y backend | Y | Y | N dedicated flow found | Y backend | S/T API only | PARTIALLY WORKING |
| Chat: direct/group/history/realtime | Y | Y | Y | Y | Y, two-client | T realtime persistence/broadcast/isolation; L tables | WORKING |
| Chat: retry exactly-once delivery | Partial | No durable client-ID dedup | No unique client message key | Y optimistic retry | Incomplete | S socket timeout can fall through to a second REST write | PARTIALLY WORKING |
| Notifications: in-app inbox/read state | Y | Y | Y | Y | Y | T; join-request events wired in REST controller | WORKING |
| Notifications: push/background delivery | N | N | No device-token support found | N | N | Not implemented | MISSING |
| AI Coach text | Y | Y | — | Y | Y, mocked providers | **L Gemini returned a real coaching response** | WORKING |
| AI voice input/output | Y | Coach API | — | Y | Y compatibility mocks | Native input unavailable in Expo Go; no current real microphone test | PARTIALLY WORKING |
| Sports concierge intents/tools | Y | Y | Live repositories | Y | Y | T all intent/action branches; direct-Gemini branches not live revalidated | PARTIALLY WORKING |
| RAG retrieval/source chips | Y | Y | — | Y | Y | T; current loader produced 36 chunks; content is stale in places | PARTIALLY WORKING |
| HITL create/accept/reject | Y | Y | Domain writes; pending actions in RAM | Y | Y | T ownership/TTL/confirm/idempotency; not durable/multi-instance | PARTIALLY WORKING |
| Weather | Y | Y | — | Y | Y | L real Open-Meteo response; grounding/fallback weaknesses | PARTIALLY WORKING |
| Maps/location | Y | Y | Hub coordinates/areas | Y | Y bridge/API | B real OSM tiles; live venues have no stored pins | PARTIALLY WORKING |
| GPS/geocoding/real distance | N | N | No match geographic coordinates | N | N | Catalogue/manual pin selection only | MISSING |
| Data management/production isolation | Y | Y | Y | Y | Y | T; current env is development and profile history can be demo | PARTIALLY WORKING |
| Deployment/operations | Build artifacts | Build scripts | Existing Supabase project | EAS profiles | Build checks | No verified public release or signed APK | PARTIALLY WORKING |

## 4. Frontend Condition

The application has the major requested screen families. Expo resolved the current imports and routes into both platform bundles. The shared theme components (`ThemedScreen`, `ArtworkScrollView`, `ArtworkHero`, venue `Page`/`Card`) apply the approved charcoal/orange artwork and translucent cards. Welcome has transparent artwork and reduced-motion-aware floating movement. The navigation contains Discover, Venues, AI Coach, Chat and Profile, with a web side rail at wide sizes.

Loading/error/empty states exist in the main data screens. Inputs retain solid readable surfaces, horizontal lists retain native scrolling, and forms/chat use keyboard-handling components. This is implementation evidence; no Android keyboard/keyboard-overlay acceptance test was performed in this audit.

Confirmed frontend defect: captain role guards use legacy primary role precedence, despite valid multi-role state. Other presentation limitations include static 90-minute match duration in `mobile/services/matchService.ts:71`, development-only sample history, hardcoded venue presets, and a nonfunctional Apple sign-in button. A few green capability/status decorations remain, for example the owner activation card in Profile; these are not an entirely different theme. Small secondary labels use low-contrast `#5C616A` over dark/image surfaces and need an accessibility pass. No formal accessibility or full cross-browser score is claimed.

The earlier `output/verification.md` contains broader responsive screenshots/checks. Those historical counts were **not** treated as newly executed UI tests here. Current browser checks specifically reproduced the captain failure and loaded the geographic venue map at phone size. No redesign or styling fix was made.

## 5. Backend Condition

Express routes cover auth/profile, matches, captain/team management, join requests, chat, notifications, hubs/venues, bookings/payments, administration, reports, coaching, weather and agents. Authentication derives identity from Supabase `getUser(token)` and permissions from active database capabilities. Protected controllers derive ownership from `req.auth.userId`, not caller-supplied identity.

The backend builds and all current suites pass. Domain validation and error handling are extensive in the newer venue/booking modules. Production storage is genuinely Supabase-backed for valid authenticated records; startup rejects missing live configuration in production mode.

Remaining source findings:

- `supabaseRepo.ts` is a large mixed domain/data-access module with some older memory-store conditions based on missing configuration or malformed UUIDs. Production startup and identity checks mitigate these paths; they are not equivalent to a consistently test-only repository implementation everywhere.
- Recruitment adjustment is a read/count/write sequence outside the atomic accept transaction (`supabaseRepo.ts:4300` onwards).
- `getAdminDashboardSummary` does not inspect each query's error before using `count ?? 0` (`supabaseRepo.ts:3693` onwards); an outage can resemble zero activity.
- Match create validation accepts nonempty date/time strings instead of enforcing normalized future Pakistan-local values. Scheduling UI still has human date presets and static duration handling.
- No centralized production observability, job queue, global abuse-control layer or load-test evidence was found. These are release gaps, not reasons to dismiss the existing API work.

## 6. Database Condition

The live Data API successfully read-counted the following tables. Counts are an audit-time snapshot, **not** proof of genuine pilot participation or valid historical events.

| Table | Live rows | Keys/constraints/indexes declared in repository | Declared RLS / access model |
| --- | ---: | --- | --- |
| `profiles` | 55 | PK/FK `id → auth.users`; role/account-status checks | Own read; backend writes; moderation trigger |
| `user_roles` | 91 | UUID PK; FK profile; unique user+role; user/role/status indexes | Own role read; trusted writes |
| `player_profiles` | 14 | User PK/FK; sport preferences, skill check; phone/address/photo additions | Own read; backend validation/write |
| `captain_profiles` | 13 | User PK/FK; skill check | Own read; backend writes |
| `hub_owner_profiles` | 13 | User PK/FK; court-count/coordinate checks; venue details | Own read; backend public listing/filtering |
| `teams` | 13 | UUID PK; captain FK; captain/sport indexes; **no unique captain constraint** | Authenticated reads; owner writes via policies |
| `team_members` | 13 | UUID PK; team/user FKs; unique team+user; indexes | Authenticated reads; owning captain management |
| `matches` | 17 | UUID PK; captain/team FKs; date/time types; capacity/fee/status checks; indexes | Authenticated reads; trusted mutation |
| `join_requests` | 16 | UUID PK; match/player FKs; unique match+player; status indexes | Incremental read policy broad; consolidated policy narrower |
| `match_participants` | 8 | UUID PK; match/player FKs; unique match+player; indexes | Incremental read policy broad; consolidated policy narrower |
| `hub_courts` | 11 | UUID PK; owner FK; unique owner+name; sport/status indexes | Authenticated read; backend owner checks |
| `hub_slots` | 0 | UUID PK; court FK; valid time/price checks; GiST available-slot overlap exclusion | Active owner read; backend public listing/write |
| `hub_verification_requests` | 11 | UUID PK; owner/reviewer FKs; one pending request partial unique index | Own request read; admin API review |
| `chat_rooms` | 11 | UUID PK; match FK; group/direct consistency check; one group per match | Member read |
| `chat_room_members` | 21 | UUID PK; room/user FKs; unique room+user; indexes | Member policy contains a self-reference concern |
| `chat_messages` | 9 | UUID PK; room/sender FKs; body 1–500 check; room/sender/time indexes | Member read; backend write |
| `notifications` | 25 | UUID PK; user and related-record references; user/read/time indexes | Own read; backend writes |
| `reports` | 14 | UUID PK; reporter/subject/reviewer references; status/category checks and indexes | Own report read; admin API review |
| `account_moderation_log` | 0 | UUID PK; actor/target FKs; action check | RLS, trusted backend access |
| `venue_bookings` | 0 | UUID PK; slot/customer/owner references; money/policy snapshots; unique active reservation and payment reference | RLS, trusted backend access |
| `booking_payment_events` | 0 | Event identity/reference uniqueness for replay prevention | RLS, trusted backend access |
| `booking_audit_log` | 0 | Booking-linked audit records | RLS, trusted backend access |

Live queries also confirmed the new player contact/photo, venue city/area/pin/photo, account-status and slot-policy columns. `hub-photos` and `profile-photos` buckets both exist, are public-read and have 5 MB file limits. No upload was performed.

**What was not established:** a service-key read bypasses ordinary RLS. This audit did not have a SQL management connection to inspect deployed `pg_policies`, `pg_constraint` or function ACLs. Therefore the table above describes constraints/policies from source, not a complete live catalog attestation. Supabase explicitly documents the service-role bypass: [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

Material schema/provisioning inconsistencies:

1. The three older incremental `SECURITY DEFINER` RPC migrations do not pin `search_path` or revoke public execution. The separate consolidated schema does both. Applying only the incremental chain is therefore different from applying the consolidated script. Actor IDs are parameters; backend authorization alone does not protect a directly callable RPC. PostgreSQL documents the need to restrict default function execution: [CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html). **Live exploitability was not established.** Public-key OpenAPI inspection returned HTTP 401 “Secret API key required,” not an ACL verdict; service-key metadata listed the functions.
2. Incremental `team_members` accepts `VICE_CAPTAIN`, while the consolidated definition accepts only `CAPTAIN`/`PLAYER`. Both schema paths use member statuses `ACTIVE/INVITED/LEFT/REMOVED`; `teamController.ts:7` accepts `ACTIVE/INACTIVE`. Nondefault member operations can pass API validation and fail a database constraint. Current in-memory tests do not resolve this drift.
3. Both provisioning paths contain a member-read policy querying `chat_room_members` from its own policy. This can recurse for normal authenticated database reads. Backend service access can conceal it. The participant policy in the consolidated schema has a similar self-reference. These paths need SQL-role testing.
4. The application assumes one team per captain but only a nonunique captain index exists. A concurrent setup/create path can create duplicates.
5. There is no composite database constraint proving a match's `team_id` belongs to its `captain_id`; backend checks provide that rule. Preserve those checks.
6. Initial role-profile tables, legacy `profiles.role`, `user_roles`, duplicated team name/skill fields, and `onboarding_completed` versus computed per-role onboarding are parallel sources that require disciplined synchronization. The captain UI defect demonstrates the practical cost.

Do not replace the working database blindly with either schema file. First reconcile a single fresh-install/upgrade path and inspect the deployed policies/ACLs.

## 7. AI / Agent Condition

`backend/src/agents/graph.ts` constructs and compiles an actual LangGraph workflow: classifier → one specialist → response formatting. Actual intents are **MATCHMAKING, COACHING, WEATHER, HUB_DISCOVERY, CAPTAIN, GENERAL**. There is no evidence of a persistent autonomous multi-agent conversation system or durable graph checkpointing; requests are bounded graph executions with explicit state.

Tools query repositories for matches, match details, player context, hubs and captain-owned fixtures/requests. Weather uses the real weather service. Zero-result paths return no matches/hubs instead of inventing records. Structured responses expose intent, tool result, action, sources and request metadata.

The provider abstraction supports Gemini/Groq, configurable order, timeouts and failover. NVIDIA code remains present but the active factory accepts Gemini/Groq. Some specialist narrative nodes still instantiate `GoogleGenAI` directly with `gemini-2.5-flash`, bypassing configurable model/failover behavior. These are separate from the verified primary coaching request. Unguarded model text is not proof of a supported mutation or data result; server tools remain the authority.

## 8. Authentication & Multi-Role Condition

| Check | Actual condition |
| --- | --- |
| Signup | Supabase `signUp`; name/password validation; public ADMIN registration rejected. Current mobile registration resolves new accounts as PLAYER. No fresh live signup was performed. |
| Email login | Supabase password sign-in followed by server profile load; no fabricated metadata-only login on backend failure. Mocked client regressions passed. |
| Logout | Clears cached token/store and disconnects socket; client regression passed. |
| Session restoration/token retrieval | Persistent Supabase session, token passed to API; profile restoration gates normal routing. T evidence. |
| Refresh | Supabase auto-refresh; native AppState handling; API retries one refresh after 401. Actual long-lived refresh on device not exercised. |
| Profile initialization | Missing profile is initialized through authenticated API; OAuth metadata supplies display name, not ADMIN permission. |
| Recovery/update | Email reset, validated callback/session exchange and password-update screen exist. Real mail delivery, expired-link handling across installed app/browser not newly verified. |
| Google web | Live settings show provider enabled; source uses current web origin and PKCE callback. H user-confirmed successful Discover return exists. **Current audit classification: code/config present, new OAuth round trip unverified.** |
| Google native | `maidaan://auth/callback` and auth browser implemented. Expo Go deliberately shows a development-app requirement. No installed signed build verified. |
| Protected routes | Index routes by loaded state; many screens have local guards and backend endpoints independently authorize. There is no claim that typing a client URL itself is a security boundary. |

Live auth settings returned `google=true`, `email=true`, signups enabled, `mailer_autoconfirm=true`. Consequently the current project does **not** require email confirmation before session issuance. That is an actual configuration observation, not a change made by this audit. Phone numbers are format-validated, not SMS-verified.

Server capabilities come from active `user_roles`. `activeMode` is a local presentation preference, validated against granted roles; it does **not** grant API permission. A single account can hold multiple roles without separate logins at the backend/store level. Public captain/hub capabilities can be added through their setup paths; ADMIN is managed privately by authorized superusers.

**Confirmed failure:** `currentUser.role || selectedRole` in:

- `mobile/app/captain/dashboard.tsx:106`
- `mobile/app/captain/create-match.tsx:187`
- `mobile/app/captain/team.tsx:46`
- `mobile/app/captain/join-requests.tsx:55`

For a PLAYER-primary account, the first truthy value stays `PLAYER`, even after `setActiveMode('TEAM_CAPTAIN')`. The audit browser reproduction returned `{backendCaptainStatus:200, backendTeam:'Audit Squad', uiDenied:1}`. Screenshot: `output/playwright/audit-multirole-captain-denied.png`. This is a user-facing denial bug, not evidence that the client can escalate server permission.

## 9. Player Flow

| Step | Screen / API | Persistence/state | Evidence / failure |
| --- | --- | --- | --- |
| Signup/sign-in | Auth screens → Supabase Auth | Auth user/session | T client/provider logic; live fresh signup unverified |
| Player setup | `/onboarding/player-setup` → `PUT /api/profile/player`, photo upload | `profiles`, `player_profiles`, Storage; computed player onboarding | T current profile/location tests; required phone/address; optional photo |
| Discover | `/discover` → `GET /api/matches` | Future matches; suspended captains excluded | T repository/API; L three future fixtures exist |
| Match detail | `/match/:id` → match/details and my requests | Match, captain, participant information | Implemented, API tests; no full real-user replay this audit |
| Apply | `POST /api/matches/:id/join` | Unique `join_requests` row PENDING; captain notification | T duplicate/authorization validation |
| Pending | `/match/request-sent` → my requests | Pending state | Implemented/tested locally |
| Captain accepts | `PATCH /api/join-requests/:id` | Atomic RPC locks request/match, participant added, slot decremented | T; normal captain UI guard currently blocks the ordinary multi-role journey |
| Confirmed | `/match/confirmed?matchId=...` | Checks actual accepted request | Implemented; not a payment confirmation |
| Group chat | `POST /api/chat/matches/:id/room`, room/messages + socket join | Room/membership/messages | T two-client group access and persistence |

**Full flow verdict: PARTIALLY WORKING, not signed off end-to-end.** Backend pieces are integrated and tested. Fresh real authentication → mobile captain acceptance → confirmed player chat was not demonstrated in this audit, and the reproduced captain UI failure is an explicit blocker for the ordinary account-upgrade journey.

## 10. Captain Flow

Setup saves `captain_profiles`, adds `TEAM_CAPTAIN`, creates/synchronizes a team and captain membership, and sets the active mode. APIs protect team ownership, match ownership, member operations and request decisions. Matches can carry `team_id`; primary squad and confirmed match participants are distinct concepts. A team member is not automatically a confirmed player in every match.

Twenty captain/team checks passed, plus relevant agent/multi-role checks. A captain's valid API permissions do not translate into usable screens for PLAYER-primary accounts because of the four guards above. Legacy TEAM_CAPTAIN-primary accounts can reach those screens, which explains why prepared-account UI checks can miss the problem.

Additional limits:

- Team-member addition uses a user UUID field; this is functional tooling but inconvenient for ordinary captains.
- Nondefault member roles/statuses depend on the schema path and need reconciliation.
- Recruitment updates can race acceptance. Example: count eight participants in a ten-person fixture, accept a ninth participant, then overwrite open slots with a value calculated before that acceptance. Atomic acceptance alone does not protect this separate write path. This is a source-derived concurrency risk, not an observed live overbooking event.
- Full match completion/cancellation/history lifecycle and automatic statistics settlement are not implemented as a complete product flow.
- Scheduling uses hardcoded venue/time/date presets; real venue-slot reservations are separate from captain fixture creation. Selecting a named venue does not prove that a court was reserved.

**Captain mode: BROKEN for the normal PLAYER → TEAM_CAPTAIN UI path; backend operations are substantially working.**

## 11. Hub Owner Flow

Hub setup adds capability and profile. Dashboard/profile, courts/playing spaces, location/photo editing, availability and verification submission screens exist. Owner APIs use authenticated ownership and reject cross-hub access. Sports are cricket, football, padel and badminton, with space specifications and dated prices. Owners can control full/advance payment choices, positive upfront amounts and cancellation/refund policy per slot.

Verification is a real PENDING → APPROVED/REJECTED administrative workflow; owner input does not control `is_verified`. The review RPC updates verification state and the approved flag. Twenty hub-owner checks and relevant venue/admin/location checks passed. Live schema and both storage buckets were confirmed.

**Current content is incomplete:** all 13 live hub records lack geographic pins, structured area assignments and photos; `hub_slots` is empty. This is not a missing table or absent implementation, but users cannot presently discover real priced inventory to reserve. Existing addresses need owner review/pinning and future slots need to be entered.

No current physical owner's phone workflow, real photo upload, actual venue inspection or booking was performed. Source and tests support ownership/verification behavior; this does not certify any particular venue as authentic.

## 12. Admin Flow

ADMIN middleware protects the entire admin router. Dashboard counts query real tables, with the outage/zero-count caveat noted earlier. The admin can list/filter accounts, inspect details, suspend/reinstate, grant/revoke other superusers, review hubs, approve/reject verification, and resolve/dismiss/follow-up reports. New moderation functions have service-role execution restrictions and audit records; last-superuser protection exists. Suspension preserves history and hides listings, matching the requested product behavior.

`accountAdminController.ts` disconnects the affected user's sockets on suspension or privilege revocation **in the current server process**. This is implemented and should not be described as absent. Multi-instance propagation is not implemented.

Twenty-two legacy admin checks plus newer venue/moderation tests passed. No live accounts were suspended, reinstated or granted privileges during this audit. Live tables/count queries are evidence that data support exists, not proof of a new full real-admin UI review. Reporter-facing submission UI is missing even though the report API/review UI exists.

## 13. Realtime Chat

The Socket.IO server is attached to the real HTTP server. Handshake authentication calls Supabase verification, then binds `socket.data.userId`. Join/send logic checks room membership and group match participation/captain ownership. Both socket and REST message paths persist before broadcasting. History comes from the repository. The mobile singleton reconnects, rejoins rooms, disconnects on logout and supports optimistic messages/retries.

**Current executed evidence:** all **21 realtime event checks passed**, including two connected clients, outsider rejection, pending-player group denial, authoritative sender identity, persisted message before ack/broadcast, size/empty validation, rate limiting, leave and reconnect. This demonstrates actual local realtime behavior; it is not merely a mocked service call. The repository backing these tests is in-memory, not live Supabase.

Limitations:

- There is no durable server-side idempotency key for `clientMessageId`; `chat_messages` lacks that unique key. A message persisted before a lost socket acknowledgement can be sent again by REST fallback/retry. UI deduplication cannot prevent both rows being stored.
- Socket authentication is performed at connection establishment; long-lived token expiry is not continuously rechecked. Same-process admin disconnect exists, but cross-instance revocation requires coordination.
- `joinRoom` resolves true optimistically after 2.5 seconds if no acknowledgement arrives; UI may briefly imply successful subscription incorrectly.
- Memory rate limits and room delivery are single-process; no shared Socket.IO adapter or production proxy/WebSocket acceptance evidence was found.

Verdict: **WORKING locally; PARTIAL for pilot reliability and production deployment.**

## 14. AI Coach / Concierge

The standalone coach endpoint validates sport, length, conversation roles/size and authenticated user, rate-limits requests and returns provider metadata. A live call returned **1,141 characters of Gemini coaching guidance**, without using backup. This verifies current provider access and a response, not every sport, safety edge case, voice session or provider quota scenario. Groq failover passed mocked-provider tests; a fresh live Groq fallback was not forced.

The concierge uses database-backed match/hub/captain tools, RAG for product guidance and specialist response nodes. It exposes action cards and source metadata. Static local drill cards/suggestions in `mobile/utils/coachMock.ts` are educational UI content; their existence does not mean the live coach endpoint is fake. Older mock responder code/comments remain and should be labeled or removed when convenient.

Some narratives still call Gemini directly, so the claim “every AI response uses the shared Gemini/Groq failover” is false. Those nodes also do not consistently share the provider timeout policy. The concierge passes no durable prior conversational history through the graph; a later confirmation can find a pending action in RAM, but general multi-turn memory is not a completed feature. Offline coaching guidance is explicitly labeled, which is preferable to silently claiming an AI response.

## 15. RAG / HITL

RAG currently has **9 approved knowledge files and 36 heading-aware chunks**. It uses lexical **BM25**, simple English token normalization, title/source boosts, top-K limits and source/section metadata. It is not an embedding/vector database system. Agent tests exercised retrieval/source behavior; no measured retrieval benchmark or multilingual recall evaluation exists.

Stale content includes:

- `faq.md`: four tabs and schematic Discover map, instead of five tabs with a separate geographic Venues directory.
- `matchmaking.md`: schematic-map guidance and an app-level no-checkout statement that no longer describes venue booking.
- `join-requests.md`: correctly describes captain-reviewed player admission, but its broad no-in-app-payment wording needs the distinction between match contributions and venue reservations.
- `roles.md`: initial registration/role wording predates PLAYER-first registration plus capability activation.
- `captain-rules.md`: promises fixture note updates more broadly than the current match-management API exposes.

A retriever faithfully returning outdated product rules is still a product defect. Payments, cancellation policies, account suspension and the newer venue/location model need current knowledge coverage.

HITL mutations actually supported: **CREATE_MATCH, ACCEPT_JOIN_REQUEST, REJECT_JOIN_REQUEST**. Drafts are server-created, user-bound, have a **10-minute TTL**, and require explicit confirmation via a card endpoint or recognized confirmation message. Confirmation reauthenticates through the endpoint and rechecks captain capability, ownership and domain state. Cancel, expiry, already-executed handling and same-process concurrent double-confirm protection exist and are covered by tests.

**No model-generated arbitrary tool command is directly executed without the confirmation path found here.** This is a positive finding. However, the action store and execution locks are process memory, not durable database records/checkpoints. Restarts lose drafts/results, multiple instances cannot share them, and crash recovery is not exactly-once execution. Conversational “yes” applies to the latest pending action rather than an action-ID-bound button; ambiguous confirmations need care. AI acceptance/rejection calls repository methods directly and does not go through the REST controller's notification creation, so notification side-effect parity is incomplete.

## 16. Weather

Provider: **Open-Meteo**. Explicit valid latitude/longitude can be used; otherwise six hardcoded Lahore area centers or a default Lahore coordinate are selected. A live audit request returned **25°C, Clear Sky, OUTDOOR_SUITABLE, `isFallback=false`** for Gulberg. This is real provider behavior at an area center, not live ground-level sensing.

Exact classifications: **OUTDOOR_SUITABLE, CAUTION, INDOOR_PREFERRED**. A deterministic evaluator uses rain, wind, temperature and sport thresholds. Cache TTL is 15 minutes; provider timeout is five seconds.

Grounding limitations:

- Unknown addresses are labeled with the supplied text but queried at default Lahore coordinates.
- The weather coordinate dictionary is separate from the larger service-area catalogue. Known areas outside its six entries can still resolve to the default.
- Cache identity includes label/date/hour/sport, **not coordinates**. Different points with the same label can reuse the wrong result.
- A requested hour outside the three-day forecast falls back to current conditions rather than reporting an unsupported forecast time.
- Missing fields can receive numeric defaults while the result remains `isFallback=false`.
- In development/test, provider failure returns canned pleasant weather. In production it returns an explicit unavailable/caution state, not fabricated pleasant conditions. UI consumers must respect `isFallback`.

Verdict: **REAL PROVIDER BUT POORLY GROUNDED for arbitrary addresses / PARTIAL overall.** Schematic match coordinates are not used as latitude/longitude by this weather service; the problem is coarse/default grounding, not direct x/y confusion.

## 17. Maps / Location

The Venues map is a **REAL GEOGRAPHIC MAP**: the current browser loaded Leaflet tiles and displayed `© OpenStreetMap contributors`. OSM is primary; the Google component mounts after a primary failure, rather than displaying both together. Dark appearance filters the tile pane while preserving markers and attribution. Public map bridge input validates coordinate bounds and registered marker identity.

Lahore is the enabled city in a central backend catalogue. City/area search, aliases and manual owner pins are implemented. Player home address accepts free text, with optional known-area tagging; this is not geocoding or a proof that an address falls inside a boundary. Current live records have no venue pins, so real catalog markers require owner data entry.

There is **no `expo-location` dependency, GPS-permission flow, live user positioning, geocoding service or real distance calculation** found in the active implementation. Match records retain **schematic x/y** coordinates and free-text venue labels; they do not carry a real venue-slot/geographic association. Thus the overall data model is **MIXED**, while the current Venues display itself is geographic. Google backup keys are unconfigured; a successful backup map load is unverified and not guaranteed if OSM fails.

## 18. Notifications

In-app notifications exist in PostgreSQL and have inbox, read/unread and mark-all-read APIs/UI. REST join submission/acceptance/rejection creates the corresponding notifications. Their ownership checks are covered by backend tests. Notification insertion is separate from the core transaction and some failures are nonfatal; it is not an outbox-backed delivery guarantee. AI/HITL repository mutations do not create exactly the same notification side effects.

No Expo push-notification library, device push-token registration, APNs/FCM pipeline or background-delivery worker was found. Chat realtime events are not equivalent to push notifications. No persisted chat-message notification creation path was found.

Verdict: **in-app WORKING with delivery limits; push MISSING.**

## 19. Data Isolation

| Occurrence | Classification | Actual behavior |
| --- | --- | --- |
| `backend/tests/*`, synthetic auth tokens, in-memory test accounts | SAFE TEST FIXTURE | Tests explicitly enable test mode; synthetic tokens rejected outside it |
| `backend/scripts/verify*`, browser fixture server | SAFE TEST FIXTURE when used as documented | Some live-verification scripts are mutation/cleanup tools; they were not run for this read-only audit |
| `seedDemo.ts`, older seed/verification utilities | SAFE DEMO DATA only in isolated environments | Explicit seeding is not a production data source; existing seeded rows are not automatically quarantined |
| `mobile/demo/mockHistory.ts` + Profile | **PRODUCTION RISK through mode/configuration; currently visible in development** | Development/demo/test can show sample recent matches; production returns empty history instead of real history |
| `mockMatches.ts`, `mockHubMatches.ts`, old responder/image/root applet code | LEGACY / DEAD where not imported | Active Discover/venue/chat data is fetched from services; file names alone do not prove active use |
| Coach suggestions/drill cards/voice examples | STATIC UI CONTENT | Useful predefined prompts/drills, distinct from live provider replies |
| Captain venue/time presets, 90-minute duration, schematic map positions | STATIC UI CONTENT / prototype limitation | Not actual reservable venue inventory or measured duration/distance |
| Nine knowledge documents | RAG KNOWLEDGE | Static product reference; contains stale rules |
| Deterministic intent classification and zero-result templates | STATIC FALLBACK LOGIC | Does not invent venue/match rows |
| Explicit “Offline coaching guidance” | STATIC FALLBACK LOGIC | Labeled fallback, not a live generated answer |
| Development weather fallback | SAFE DEMO DATA only when clearly presented | Fixed metrics on provider failure; production has unavailable state |
| AsyncStorage in-memory fallback | Runtime reliability fallback | Session may stop persisting if storage fails; not fake domain data |
| Supabase URL/key placeholders | Configuration sentinels | Authentication/configuration checks reject normal use when missing |

**Can production/pilot mode run without silently falling back to fake data? PARTIAL.** Correct production settings avoid the principal demo-history and pleasant-weather fallbacks, and production DB startup fails loudly without configuration. However, the current mobile/backend env files are set to **development**, mobile API URL is empty, real history is not implemented, and older repository fallback conditions remain inconsistent. Do not distribute the current development build as though it were a clean pilot configuration.

The 13 data-isolation checks passed. That does not prove deployed RLS, remove pre-existing demo records from live tables or validate every configuration combination. No live data cleanup was performed.

## 20. Mobile Condition

Current Android JavaScript/Hermes export passed: **5.7 MB**, including the new artwork. There are no checked-in/generated `mobile/android` or `mobile/ios` source directories; this is consistent with Expo managed/prebuild use, not itself a defect. No accessible `adb` command was found. EAS has development APK, preview APK and production profiles.

**BUILD SUCCESS: YES, bundle export. ACTUAL CURRENT DEVICE RUNTIME VERIFIED: NO.** This audit did not install an APK, scan Expo Go, test a microphone, complete native OAuth, test Android back behavior, background/foreground token refresh, map gestures or the keyboard on a device. Earlier user confirmations of login/map loading are historical evidence only.

Expo Go email/password can be used. Google sign-in intentionally requires a Maidaan development/standalone app. Speech recognition probes for the native module and avoids the prior Expo Go crash, but avoiding a crash is not native voice-input success. Development build permissions/plugins and `maidaan` deep-link scheme are present; runtime acceptance remains unverified.

## 21. Web Condition

**WEB PARTIAL.** Current web export passed: **3.4 MB JavaScript**, 35 KB CSS. Actual Chromium browser checks reproduced the captain failure and successfully loaded the OSM map. Auth, dashboards, AI, forms and chat have web implementations; native-sensitive modules have separate/probed implementations in the relevant paths.

Public-hosting configuration is incomplete. `getBaseUrl()` in `mobile/services/api.ts:30` uses the development backend at port 8081, but returns same-origin `''` on other web ports, ignoring `EXPO_PUBLIC_API_URL`. `getSocketUrl()` likewise chooses the web origin. Consequently a separately hosted web export needs `/api`, `/maps` and Socket.IO routing to the Express server, or explicit URL handling changes. No such deployment/rewrite configuration was found. A successful local export does not establish this hosted behavior.

Google web is configured and previously user-confirmed, but no current public-domain callback was tested. Safari/Firefox compatibility, browser microphone permissions, mobile Safari and hosted WebSocket reconnect were not verified. Apple sign-in remains a placeholder.

## 22. Testing Status

**These are current executions, not counts copied from earlier notes.** Live AI keys were removed from the backend test child process to prevent paid/provider-dependent calls. Existing test files and application code were not edited.

| Executed group | Passed | Failed | Skipped | What it establishes |
| --- | ---: | ---: | ---: | --- |
| Backend AI provider suite | 11 | 0 | 0 | Mocked Gemini/Groq request/failover behavior |
| Backend node:test group: reliability, registration, venue/admin, booking policy/API/SQL, locations | 51 | 0 | 0 | APIs/mocks/local SQL; not a complete deployed RLS audit |
| Agent/RAG/HITL script | 43 | 0 | 0 | Graph/tool/retrieval/confirmation behaviors with fixtures |
| Multi-role backend script | 9 | 0 | 0 | Server capability boundaries; **not captain browser guards** |
| Captain/team script | 20 | 0 | 0 | Ownership/team/member APIs in test stores |
| Hub-owner script | 20 | 0 | 0 | Hub/court/verification APIs |
| Admin script | 22 | 0 | 0 | Review and role authorization APIs |
| Data-isolation script | 13 | 0 | 0 | Mode/synthetic-token/production invariants |
| Socket.IO event script | 21 | 0 | 0 | Actual local two-client event flow with in-memory persistence |
| Client auth regressions | 15 | 0 | 0 | Service/store/routing under mocked dependencies |
| Client map bridge | 1 | 0 | 0 | Valid marker/coordinate boundary |
| NativeWind warning regression | 1 | 0 | 0 | Does not inspect throwing navigation getters |
| Speech module compatibility | 4 | 0 | 0 | Expo Go probe and mocked recognizer/browser behavior |
| **Total reported checks** | **231** | **0** | **0** | 210 backend + 21 client |

There are **15 backend test files and four client regression files**. Node's 62 reported backend tests include parent/nested-test reporting; the other 148 backend checks are legacy custom assertions. The total above is a transparent reported-check total, not a claimed count of independently isolated leaf scenarios or a coverage percentage.

Commands/results:

- `npm --prefix backend test`: exit 0; log saved at `output/audit-backend-tests.log`.
- `node --test scripts/auth-flow.test.mjs scripts/maps-bridge.test.mjs scripts/nativewind-warning.test.mjs scripts/speech-recognition.test.mjs`: 21 passed, 0 failed/skipped.
- `npm run build`: exit 0; mobile TypeScript + backend `tsc`.
- `npm run lint`: exit 0. **This script is two TypeScript checks, not ESLint or an accessibility/style linter.**
- Expo export using installed CLI: `export --platform android --platform web --output-dir .expo/audit-condition --max-workers 2`: exit 0. Tailwind reported the existing ambiguous orange-shadow utility warning; no source fix was applied.
- `npm audit --json`: exit 1 due to advisories, **36 total: 22 high, 14 moderate, 0 critical**. Saved at `output/audit-dependencies.json`. Many are SDK/build-tool/transitive paths; this is not 36 demonstrated remotely exploitable app bugs. Some proposed “fixes” downgrade Expo/RN major versions, so no automatic fix was attempted.

Current browser outcome: **a failed acceptance condition was reproduced**, despite the automated green suite. The player-primary/captain-capable account was denied by the UI while the server allowed the operation. Map tile loading passed. Live Gemini and weather probes passed. No load/stress/soak suite, coverage gate, real Supabase two-device chat run, payment transaction, real signup/recovery or current physical Android test was executed.

## 23. Deployment Status

| Deliverable | Current condition | Deployability verdict |
| --- | --- | --- |
| Android APK | EAS profiles and app config exist; JS export passes; package `com.anonymous.maidaan` | Build configuration present, **APK build/install/signing/runtime UNVERIFIED** |
| Web app | Single-page export succeeds | Artifact deployable, **hosting/API/socket/map rewrites and public OAuth NOT configured/verified** |
| Backend API | TypeScript builds and local health is 200 | Can run as Node HTTP server; **no verified public HTTPS deployment, persistent runtime or release operations** |
| Supabase | Existing project, 22 tables/feature columns/storage reachable | Service connected; **deployed constraints/policies/ACLs not fully attested** |
| Payments | Safepay/JazzCash sandbox adapters only | **Not deployable for real-money collection as currently implemented** |

The local health endpoint was read successfully. A health response does not test database permissions or the entire app. Current env metadata: backend `NODE_ENV=development`, `APP_DATA_MODE=development`; mobile `EXPO_PUBLIC_APP_DATA_MODE=development`, empty `EXPO_PUBLIC_API_URL`. The currently running backend may have process-level overrides; file metadata alone cannot prove its effective data mode. The local app also discovers its development host dynamically, which is useful on Wi-Fi but is not production URL configuration.

Express and Socket.IO currently allow wildcard CORS. No domain allowlist, reverse proxy, TLS setup, monitoring/alerting, backup/restore drill, release CI or public deployment manifest was found. Supabase production SMTP/rate-limit/backup settings and OAuth allowed redirect lists cannot be verified from the repository. The payment callback hostname currently returns DNS `ENOTFOUND`; no new tunnel was opened. RAG Markdown must accompany a backend deployment: plain `tsc` does not copy knowledge files into `dist`.

## 24. Security Findings

No confirmed current service-role/AI/payment secret was found in active mobile source. Real env files are ignored; tracked env examples are placeholders. Supabase public keys and restricted public Maps keys are expected client configuration, not server secrets. This was a working-tree inspection, **not a full historical Git secret scan**.

| ID | Severity | Evidence | Finding / practical implication |
| --- | --- | --- | --- |
| SEC-01 | HIGH, conditional provisioning risk | S; live ACL unverified | Old incremental definer RPCs omit execution restrictions/search-path pinning; consolidated script is hardened. Fresh-install path can expose caller-supplied actor IDs if default execution remains available. Do not claim a demonstrated live exploit. |
| SEC-02 | HIGH data integrity | S inference | Recruitment count/update is outside acceptance transaction; concurrent edits can invalidate capacity assumptions. No race reproduction was run against real data. |
| SEC-03 | MEDIUM | S + schema divergence | Team member status/role constraints disagree with controller/types; no unique team-per-captain constraint. |
| SEC-04 | MEDIUM | S | RLS membership self-reference; service-key tests bypass ordinary RLS. Normal-user direct database isolation remains unverified. |
| SEC-05 | MEDIUM | S | Socket session is authenticated at connection; token expiry is not continuously enforced. Same-process moderation disconnect exists; multi-instance revocation does not. |
| SEC-06 | MEDIUM | S | Socket ack loss + REST retry has no durable client-message idempotency; duplicates may be persisted. |
| SEC-07 | MEDIUM | L npm advisory scan | 22 high/14 moderate package advisories require dependency-path triage; broad automated downgrades are inappropriate. |
| SEC-08 | MEDIUM operational | S/L env | Development configuration, wildcard origins, no verified HTTPS endpoint or deployment proxy; test mode must never be exposed as a public service. |
| SEC-09 | LOW integrity/availability | S | Weather cache omits coordinates; public endpoint has no dedicated quota layer; identical labels can collide. |
| SEC-10 | LOW / information quality | S | Stale RAG and zero-on-error admin metrics can misstate current product or operational state. |

**CRITICAL:** none confirmed by this audit. This is not a clean bill of security; conditional high risks and missing live SQL-role checks still block a release sign-off.

Positive boundaries: synthetic tokens rejected outside test mode, no public ADMIN selection, server-authoritative identity/roles, captain/hub ownership tests, member-scoped chat access, validated map bridge, service-only newer moderation/booking functions, signed amount/reference-checked payment events, replay protection, last-superuser protection, and explicit HITL confirmation. ActiveMode spoofing does not grant server permission. User-supplied IDs are not blindly trusted as authenticated actors in normal HTTP controllers.

## 25. Pilot Readiness

Target: **1–3 real owners, 3–5 captains, 20–50 players**. Counts in a development database do not establish a recruited or trained pilot group.

| Area | Pilot assessment | Reason |
| --- | --- | --- |
| Auth | NEEDS MINOR WORK | Core code/tests exist; public callbacks, recovery delivery and installed-app session flows need acceptance |
| Player matchmaking | NEEDS MAJOR WORK | End-to-end fresh-user acceptance blocked by normal captain UI path; completion/history incomplete |
| Captain flow | BLOCKER | Reproduced denial for a valid upgraded PLAYER account |
| Hub management | NEEDS MINOR WORK | Core APIs exist; real owners must populate pins/photos/area/slots and test phones |
| Admin operations | NEEDS MINOR WORK | Real review/moderation exists; run restricted live acceptance and verify SQL ACLs |
| Chat | NEEDS MINOR WORK for single-server trial | Two-client local tests pass; retry dedup/session/revocation/hosted socket acceptance remain |
| AI | NEEDS MINOR WORK | Live coaching works; stale RAG and inconsistent direct-provider paths need correction |
| Weather | NEEDS MINOR WORK | Real provider works; must disclose coarse grounding and unavailable forecasts |
| Location | NEEDS MINOR WORK | Real map exists; current venue coordinates/inventory absent; no GPS/routing claim allowed |
| Data isolation | BLOCKER for public pilot configuration | Current development mode can show demo history; verify live policy/ACL boundaries |
| Deployment | BLOCKER | No verified permanent HTTPS backend/web routing or installed pilot build |
| Security | BLOCKER pending closure/verification | Resolve database provisioning/capacity risks and triage dependency paths |
| Stability | NEEDS MAJOR WORK | No representative hosted two-device/fresh-account/long-session acceptance or load evidence |
| Real-money venue booking | BLOCKER if included | Sandbox-only implementation, dead callback URL, no real inventory; use a declared no-money trial or approved live gateway work |

## 26. Readiness Scores

Scores are **engineering evidence scores, not probabilities of success**. For each area, five named checks are worth 20 points each: `1` = supported for the relevant scope, `0.5` = partial/code-only/runtime-limited, `0` = absent or a release-blocking gap. Vectors are shown so the numbers are not unexplained optimism. High completeness can coexist with a critical acceptance failure.

| Area | Score | Five-check basis, in vector order |
| --- | ---: | --- |
| Frontend completeness | **80/100** | Route coverage, theme, core forms, interaction correctness, accessibility/device layout: `1,1,1,.5,.5` |
| Backend completeness | **80/100** | Domain APIs, authorization, persistence, concurrency completeness, operational handling: `1,1,1,.5,.5` |
| Database completeness | **70/100** | Domain tables, key/index coverage, transactional booking/acceptance, reproducible schema, deployed ordinary-role attestation: `1,1,1,.5,0` |
| AI/agents completeness | **80/100** | Real graph/tools, live coach, retrieval mechanism, production HITL durability, consistent provider/content behavior: `1,1,1,.5,.5` |
| Authentication readiness | **70/100** | Email/session implementation, server identity/permissions, current OAuth acceptance, recovery acceptance, multi-role UI: `1,1,.5,.5,.5` |
| Realtime readiness | **60/100** | Two-client local exchange, persistence/isolation, optimistic retry reliability, reconnect/session lifecycle, hosted scale/long-session evidence: `1,1,.5,.5,0` |
| Security readiness | **40/100** | Normal API identity/ownership, active-source secret separation, reconciled DB authorization, complete concurrency/retry safeguards, production operations/advisory closure: `1,1,0,0,0` |
| Mobile readiness | **50/100** | Current bundle, historical/basic Expo Go use, installed native release, native OAuth code/runtime, voice/permission code/runtime: `1,.5,0,.5,.5` |
| Web readiness | **70/100** | Export, local rendered screens/map, current live auth acceptance, hosted routing, hosted realtime/browser matrix: `1,1,.5,.5,.5` |
| Deployment readiness | **20/100** | Build artifacts, permanent HTTPS, production routing/config, release automation/observability, release acceptance: `1,0,0,0,0` |
| Pilot readiness | **40/100** | Hosting, security sign-off, real inventory/operations, complete critical journeys, bounded internal testability: `0,0,.5,.5,1` |
| Overall project maturity | **60/100** | Equal-weight mean of the 11 area scores above; this does not override blockers |

The multi-role score's half-credit reflects a working backend/store but broken captain UI, rather than pretending the complete feature passes. The scores should be updated only with fixes and fresh evidence, not by relabeling mocked tests as live acceptance.

## 27. Current Maturity Stage

**STAGE 4 — INTEGRATED MVP.**

The app integrates real data, authorization, multiplayer workflows, local realtime behavior, AI, maps and sandbox booking transactions. It is beyond a collection of screens or isolated prototype APIs. It has not reached STAGE 5 because a normal account-upgrade journey is broken, production delivery/security checks remain incomplete, real venue supply is empty and no representative installed-app pilot release has been accepted. No active-pilot or public-product claim is supported.

## 28. Evaluation Readiness

**NOT READY for an unqualified, full-feature university evaluation from fresh accounts.** The reproduced captain failure can stop a central promised journey even though all tests compile/pass. A carefully bounded walkthrough using legacy captain-primary accounts, local servers, email/password in Expo Go and disclosed sandbox/voice limits is possible today. That narrower demonstration is not equivalent to the complete evaluated workflow requested in this brief.

The shortest evaluation preparation is small: correct the capability-based UI decision, exercise fresh-account player/captain/owner flows, refresh stale product guidance and prepare an honest demo script. Do not spend the next phase on another redesign.

## 29. Team Testing Readiness

**READY WITH MINOR ISSUES for controlled internal testing.** The code builds, APIs have useful test coverage, local realtime works, and the known failure is reproducible. Use isolated test data, a single controlled backend and no real money. Team testing is the appropriate next environment for discovering and closing these acceptance gaps, not evidence that they are already solved.

## 30. Pilot Readiness

**NOT READY.** A small real-world pilot still needs permanent reachable infrastructure, working capability-based captain UI, reconciled database permissions/schema, representative native/web acceptance, real venue inventory and a deliberate payment scope. Do not invite 20–50 external players into the current development-mode setup or rely on the expired temporary callback hostname.

## 31. Public Launch Readiness

**NOT READY.** In addition to pilot work, public launch needs dependency/security triage, operational monitoring/recovery, durable payment/refund operations, abuse/reporting paths, real device/browser coverage, concurrency/retry safeguards and support processes. No public-commercial release sign-off is justified by the current green unit/API suite or Expo export.

## 32. P0 / P1 / P2 Issues

P0 means a concrete gate for the stated scope, not an assertion that every item is a confirmed critical exploit.

| Priority | Issue | Gate |
| --- | --- | --- |
| **P0 — demo** | Capability-based captain screens deny normal PLAYER-primary captains | Fresh-account end-to-end evaluation |
| **P0 — pilot** | One consistent hardened schema/ACL path and ordinary-role checks; close recruitment-versus-acceptance capacity race | Data isolation and slot integrity |
| **P0 — pilot** | Permanent HTTPS backend/web/API/socket/map routing, explicit production mode/URLs, installed pilot build | External users can reliably connect |
| **P0 — pilot** | Real owners must enter venue pins, areas, photos and future prices/slots | Usable venue discovery/reservations |
| **P0 — paid pilot** | Sandbox-only payments, unavailable callback hostname, no live merchant/refund acceptance | Any collection of real funds; alternatively exclude money explicitly |
| **P1** | Team member enum/status drift and missing team-per-captain uniqueness | Real DB member operations/concurrency |
| **P1** | Chat retry idempotency, long-session reauth and documented single-server limits | Reliable messages/session boundaries |
| **P1** | RAG content refresh and consistent AI provider/timeout abstraction | Truthful, predictable concierge behavior |
| **P1** | Notification parity across REST and HITL; admin metrics should distinguish query failure from zero | Trustworthy state and operations |
| **P1** | Normalize scheduling dates/times; complete or clearly scope match history/statistics | Predictable match lifecycle |
| **P1** | Triage 36 dependency advisories, add reporter-facing flow and release smoke tests | Public exposure and maintainability |
| **P2** | GPS/geocoding/distance, push notifications, Apple sign-in, second live payment provider, multi-instance scale | Optional expansion; do not market as present |
| **P2** | Remove dead applet/mock/assets, reconcile docs/lockfiles, improve UUID member-selection UX and minor contrast | Cleanup after critical acceptance work |

## 33. Recommended Next Steps

No recommendations below were implemented during this audit.

| Target | Issue / action | Why it matters | Exact component(s) | Complexity |
| --- | --- | --- | --- | --- |
| Evaluation 1 | Use trusted capabilities for captain UI, retaining server checks; add an actual PLAYER→captain browser acceptance case | Fixes the reproduced central failure | Four captain screens, `useAuthStore`, browser acceptance harness | SMALL |
| Evaluation 2 | Run fresh email login/setup, captain publish/apply/accept/chat and owner slot/review flows with disposable accounts; check a physical phone | Prevents prepared fixtures masking integration failures | Auth/onboarding, match/join/chat, hub/admin screens | MEDIUM |
| Evaluation 3 | Update stale knowledge and document demo boundaries, including Expo Go OAuth/voice and sandbox booking | Prevents the app/demo claiming unsupported behavior | `backend/src/rag/knowledge/*`, demo guide | SMALL |
| Pilot 1 | Reconcile consolidated/incremental schemas, restrict legacy RPCs consistently, test normal-user SQL access and member enums | Makes security and fresh installation reproducible | `supabase/00_complete_maidaan_schema.sql`, migrations 20261013/20261016, team controller | MEDIUM |
| Pilot 2 | Make recruitment updates atomic with acceptance and enforce one team per captain | Protects capacity/data integrity under actual simultaneous use | `updateMatchRecruitment`, acceptance RPC, `teams` constraint | MEDIUM |
| Pilot 3 | Deploy one persistent HTTPS API/socket server and web host with correct routing; set production mode/URLs and public callbacks; package RAG files | Replaces LAN-only and temporary-tunnel assumptions | `api.ts`, `socketService.ts`, backend server/CORS, hosting config, EAS/env | MEDIUM |
| Pilot 4 | Have 1–3 real owners populate and validate listings/slots; complete one real two-device player/captain journey | Establishes usable supply and real field evidence | Venue profile/availability and onboarding; acceptance checklist | MEDIUM |
| Pilot 5 | Choose no-money pilot, or implement/approve one live gateway plus callback/refund acceptance before charging | Current sandbox implementation cannot collect real funds | `sandboxGateways.ts`, booking operations, merchant setup | LARGE for live-money release; SMALL to explicitly scope it out |
| Pilot 6 | Add durable chat idempotency and fresh-session behavior; keep first pilot single-server | Prevents duplicate/late-authorized messages | Chat repo/schema, socket server/client, REST fallback | MEDIUM |
| Pilot 7 | Triage reachable dependency advisories and establish error monitoring, restore procedure, reporting and rollback | Gives a small external pilot a support/safety boundary | Dependencies, backend operations, report UI, deployment process | MEDIUM |

Do not start with GPS, another provider or a further visual redesign. The shortest next phase is **critical-flow stabilization and a controlled single-server acceptance release**.

## 34. Final Verdict

The project has real integrated engineering work and meaningful passing tests. Its present limitations are specific and actionable. The strongest positive evidence is the current backend suite, two-client local realtime behavior, reachable live schema, live Gemini response, real weather and geographic map. The strongest negative evidence is a normal multi-role journey failing in the actual browser, unresolved database provisioning/concurrency concerns, incomplete real venue supply and missing public/native release acceptance.

This report stops at assessment. No application fix, dependency upgrade, account change, database migration or deployment was performed.

| Area | Status | Confidence | Main Issue |
|------|--------|------------|------------|
| Frontend | PARTIAL | HIGH | Captain capability UI denial; some static/history/accessibility limits |
| Backend | PARTIAL | HIGH | Good tested API coverage; concurrency and operational gaps |
| Database | PARTIAL | HIGH | 22 tables reachable; schema-path/enum/RLS/ACL consistency unverified |
| Authentication | PARTIAL | HIGH | Implementation/tests present; current live OAuth/recovery/device acceptance absent |
| Player Flow | PARTIAL | HIGH | Backend chain integrated; ordinary captain acceptance UI path blocks full journey |
| Captain Flow | BROKEN | HIGH | Reproduced PLAYER-primary captain denial despite HTTP 200 API access |
| Hub Owner Flow | PARTIAL | HIGH | APIs/schema exist; real venue pin/photo/slot content absent |
| Admin | WORKING | MEDIUM | Tested local operations; live UI/SQL authorization acceptance incomplete |
| Chat | WORKING | HIGH | Local two-client tests pass; hosted reliability/session/dedup still partial |
| AI Agents | PARTIAL | HIGH | Real graph/tools; inconsistent provider paths and non-durable state |
| RAG | PARTIAL | HIGH | Nine files/36 chunks; stale product guidance |
| HITL | PARTIAL | HIGH | Confirmation/ownership tests pass; RAM-only drafts and locks |
| Weather | PARTIAL | HIGH | Real provider; coarse/default coordinates, cache and forecast limits |
| Maps | PARTIAL | HIGH | Real OSM display; no current venue pins, GPS or verified Google backup |
| Notifications | PARTIAL | HIGH | In-app works; push missing and mutation-path parity incomplete |
| Android | UNVERIFIED | HIGH | Current bundle succeeds; no installed current-device release acceptance |
| Web | PARTIAL | HIGH | Local UI/map/export; production hosting/routing and browser matrix incomplete |
| Security | PARTIAL | MEDIUM | Strong API controls; live database ACL and concurrency/advisory work outstanding |
| Deployment | PARTIAL | HIGH | Build configs exist; no verified public release; callback DNS unavailable |
| Pilot Readiness | PARTIAL | HIGH | Critical flow, infrastructure, integrity and real-inventory gates remain |

CURRENT PROJECT STAGE:
STAGE 4 — INTEGRATED MVP

UNIVERSITY EVALUATION:
NOT READY

INTERNAL TESTING:
READY WITH MINOR ISSUES

SMALL PILOT:
NOT READY

PUBLIC LAUNCH:
NOT READY

TOP 5 BLOCKERS:
1. Normal PLAYER-primary accounts with captain capability are denied by the captain UI.
2. Database provisioning/authorization consistency and recruitment-versus-acceptance concurrency are not release-safe or fully verified.
3. Permanent HTTPS web/backend/socket configuration and an accepted installed Android release are missing.
4. Real hub pins/photos/structured areas and future priced slot inventory have not been populated.
5. Payments are sandbox-only and the configured callback hostname is unavailable; real-money booking/refund acceptance is absent.

NEXT RECOMMENDED PHASE:
Critical-flow stabilization followed by a controlled single-server acceptance release.
