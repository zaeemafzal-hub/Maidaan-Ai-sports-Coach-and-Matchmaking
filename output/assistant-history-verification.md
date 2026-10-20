# Account conversation history

AI Coach and Maidaan Concierge now save conversations to the signed-in account. Shared client state keeps messages and in-flight requests through navigation; a per-account device cache restores recent messages and drafts, and the authenticated backend restores history across devices. Coach maintains a separate conversation for each sport. Reset clears only the selected sport.

The user applied `supabase/migrations/20261020000001_assistant_history.sql` successfully on 2026-10-20. The migration adds private conversation/message tables without changing existing records. Authenticated users can read only their own rows; only the backend writes assistant replies. Clearing a conversation cascades its messages and rejects late replies targeting that conversation.

The latest 100 messages load initially, with earlier messages available through pagination. Retries reuse a client message ID and replay an existing successful answer. Concierge saves structured results and sources; restoring a confirmation card never executes an action. Completed/cancelled statuses are saved, and lost or expired pending drafts are shown as expired.

## Validation

- TypeScript checks for mobile and backend pass.
- Nine focused tests cover migration/RLS, cross-account foreign keys, retry identity, reset cascade, navigation during generation, cross-device restore, offline cache, storage failure, sport isolation, pagination and logout races.
- 22 existing AI provider and API reliability tests pass.
- Live checks against the applied Supabase migration and a production-mode local backend used disposable accounts and real AI responses: saved turns, repeat request replay, restored Coach and Concierge messages/sources, authenticated API access, live RLS read/write denial, sport isolation and rejection of cleared conversation IDs all pass.

Run focused automated checks with `npm --prefix backend run test:history`.

## Release notes

Existing installed versions can continue sending prompts; their new replies are persisted by the updated backend. The updated website and Android APK are required to display restored account history. Previously discarded conversations cannot be recovered. Histories refresh when the screen gains focus or the app returns to the foreground; this is not a live cross-device subscription.

Hosted browser verification and Android build details are recorded after deployment below.
