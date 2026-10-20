# Account conversation history

AI Coach and Maidaan Concierge now save conversations to the signed-in account. Shared client state keeps messages and in-flight requests through navigation; a per-account device cache restores recent messages and drafts, and the authenticated backend restores history across devices. Coach maintains a separate conversation for each sport. Reset clears only the selected sport.

The user applied `supabase/migrations/20261020000001_assistant_history.sql` successfully on 2026-10-20. The migration adds private conversation/message tables without changing existing records. Authenticated users can read only their own rows; only the backend writes assistant replies. Clearing a conversation cascades its messages and rejects late replies targeting that conversation.

The latest 100 messages load initially, with earlier messages available through pagination. Retries reuse a client message ID and replay an existing successful answer. Concierge saves structured results and sources; restoring a confirmation card never executes an action. Completed/cancelled statuses are saved, and lost or expired pending drafts are shown as expired.

## Validation

- TypeScript checks for mobile and backend pass.
- Nine focused tests cover migration/RLS, cross-account foreign keys, retry identity, reset cascade, navigation during generation, cross-device restore, offline cache, storage failure, sport isolation, pagination and logout races.
- 22 existing AI provider and API reliability tests pass.
- 43 existing Concierge, RAG and captain-action tests pass; three cloud configuration checks pass (77 reported automated checks total).
- Live checks against the applied Supabase migration and a production-mode local backend used disposable accounts and real AI responses: saved turns, repeat request replay, restored Coach and Concierge messages/sources, authenticated API access, live RLS read/write denial, sport isolation and rejection of cleared conversation IDs all pass.

Run focused automated checks with `npm --prefix backend run test:history`.

## Release notes

Existing installed versions can continue sending prompts; their new replies are persisted by the updated backend. The updated website and Android APK are required to display restored account history. Previously discarded conversations cannot be recovered. Histories refresh when the screen gains focus or the app returns to the foreground; this is not a live cross-device subscription.

## Hosted verification and Android artifact

- Render deployment `dep-dbbjh4mi0phs738ip110` is live at `https://maidaan-api-7fs8.onrender.com`, serving commit `3ed1566` from `deploy/public-hosting`.
- Vercel production deployment `dpl_4JRw5nup7a1t2vWv31BjSw3auP9x` was promoted to `https://maidaan-sports.vercel.app`.
- Hosted API checks restore exchanges saved by a different backend process. Live RLS denies cross-account reads and client-written replies. Concurrent identical requests share one persisted answer. Cancelled action-card status survives loss of action memory; restoring a lost pending draft marks it expired without execution.
- Production browser checks for both assistants used real upstream AI replies with HTTP delivery held until after navigating away. Returning to the screen and reloading restored each reply without duplicate prompts. Coach retained an unsent draft; Concierge retained its source cards. Neither browser test produced a runtime error or horizontal overflow at 390×844. Screenshots are local under ignored `output/playwright/`.
- Android preview build `32f96212-b2ee-4c57-9d0e-45ef8faea84d` finished successfully. Version code 2, package `com.anonymous.maidaan`, Android 15 signature verification passes, certificate matches the previous APK. ZIP CRC checks pass; the embedded release bundle contains the hosted HTTPS API and new history feature.
- APK: https://expo.dev/artifacts/eas/xqhcyYo1MXaBfRLyXXHMpwuXaZYAgZCvfDwEOM5b29w.apk (117,388,879 bytes).
- SHA-256: `1b555caabd0356b0c624ec75807e05772265a784c7e92c87aa0575d2b846fbc9`.
- The phone was disconnected from USB during this update. The user has been sent the APK and an installed-device persistence/sync check; that confirmation remains pending. Previous standalone mobile-data acceptance belongs to the prior APK, not this update.

Disposable accounts and their history rows are removed after verification; no existing user's conversation is edited by these checks.
