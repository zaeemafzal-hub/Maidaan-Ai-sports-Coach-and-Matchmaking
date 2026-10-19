# Admin desk installed-phone follow-up

2026-10-19. User device: RMX3890, Android 15, installed Maidaan development APK. User reports other app features work, but Hub Verification/Open Reports and their corresponding workspace links open blank desks. The authenticated Admin dashboard displays real queue counts.

Changes are limited to the three Admin screens; server capability checks remain unchanged.

- Both desk banners used `h-18`, which is absent from the Tailwind spacing configuration, with a percentage-height image inside the unbounded container. Each banner now has an explicit 80-point height and an absolutely positioned image; main scroll views explicitly fill remaining screen space.
- Each desk previously mounted two native Modal components and could show inspection and confirmation simultaneously. Each now mounts a single window only while inspecting/confirming, and switches its contents inside that window. Detail sheets have an explicit 85% height, bounded scrolling and Android Back handling. Cancel returns to the existing inspection state.
- Report review previously threw an Error after an HTTP 409, losing the response status, making the intended conflict handling unreachable. It now refreshes the queue and closes the stale review. Both screens display failed decisions inline and preserve confirmation/retry.
- Dashboard queue/workspace buttons and hub inspection/actions have explicit accessibility labels for testing and assistive technology.

Verification completed:

- User reloaded the installed app and confirmed **both desks display correctly**. The earlier symptom was brief zero-count content followed by only the background image. Device: RMX3890, Android 15. This confirms native rendering after the fix; detailed native moderation actions were not separately attested.
- All four actual dashboard buttons opened the correct desk with loaded live data. Both desks passed 390/768/1280 browser layouts, with no nested buttons or uncaught page errors.
- Actual browser inspection → confirmation → hub approval returned HTTP 200; the approved filter showed the changed test record.
- Actual report inspection → follow-up → resolution, a separate dismissal, and an injected temporary HTTP 503 → visible inline error → successful real retry all passed. Decisions persisted through the actual backend/Supabase path. Failure injection is explicitly a browser response test, not a real provider outage.
- Existing Admin authorization/moderation suite: **22 passed, 0 failed**. Final `npm run lint` passed mobile/backend TypeScript. No backend code, capability rules, schema or dependency changed for this fix.
- The first action automation waited for a pending fixture that had already been approved by a different administrator during concurrent phone testing. A fresh disposable fixture was used and all actions passed. That timeout was a test-fixture conflict, not reported as a product pass or hidden application failure.

Three disposable real Supabase users and three test-only reports were used. Existing community records were not reviewed by automation. Cleanup verification is recorded in local `output/admin-desk-cleanup.json`; token/password session artifacts are ignored and removed afterward. The development APK loads the JavaScript change from Metro and does not need rebuilding for this fix.
