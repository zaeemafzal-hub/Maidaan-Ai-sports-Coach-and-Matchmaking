# Hub availability and super-user controls

## Hub owners

1. Open **Hub Workspace → Venue details & photos**. Save the venue name, full address, contact number, sports and photos. Coordinates are optional; the address also opens in Maps.
2. Open **Playing spaces & availability**. Create each pitch or court separately, with a ground/hall name, sport, playing format, surface, capacity, indoor/outdoor setting and optional photos.
3. Add a dated slot to a playing space. Enter the date as `YYYY-MM-DD`, start/end times as 24-hour `HH:MM`, and the **full-slot price in PKR**. Times use Pakistan time.
4. Overlapping available slots on the same playing space are rejected by the database. Adjacent slots and simultaneous slots on different courts are allowed.
5. Edit or remove slots as availability changes. Marking a playing space unavailable hides it and its slots. Expired and unpublished slots are excluded from the public page.
6. Use **Preview public venue** to check the listing. Players can open **Discover → Browse hubs, prices & available slots**; captains have **Find a hub & available slots** in their workspace.

This version publishes availability and contact details. Reservation, advance payment and pay-at-venue settlement remain deferred. Publishing a slot does not reserve it.

## Super-users

`chaudharyzaeem182@gmail.com` has been granted ADMIN capability through the private backend setup command. Sign out and sign in again, or reload the app, to refresh capabilities.

Open **Profile → Open super-user dashboard → Accounts & super-users**. The web route is `/admin/dashboard`.

- Search accounts by name/email and filter players, captains, hub owners or super-users.
- Open an account to inspect player, captain and venue details and moderation history.
- Suspend/reinstate an account with a reason. Suspension blocks backend access, disconnects current chat sockets and hides its venue/match listings. Existing data is preserved.
- Grant/revoke super-user access for an existing active account. Public signup cannot grant ADMIN.
- You cannot suspend yourself, suspend another active super-user, revoke your own access or remove the last super-user. Revoke another account's ADMIN access before suspending it.
- Existing hub verification and report-review screens remain available.

The backend checks trusted capabilities on each admin request. Hiding a UI button is not the access-control mechanism.

## Verification

- Migration applied successfully in Supabase. All new columns/tables verified through the API.
- Migration compiled and reran in local PostgreSQL (PGlite); moderation, super-user changes and the exclusion constraint passed.
- Backend regression suite, new venue/admin integration checks, client auth regressions, TypeScript/build and diff checks passed.
- Live Supabase: photo upload/public retrieval, coordinates, all four sports, priced slots, overlaps, ownership, admin filters/details, suspend/reinstate and grant/revoke passed using disposable accounts.
- Browser at 390 px: owner saved venue details, added a pitch and published a slot; player saw the same price; admin searched, suspended and reinstated the owner.
- Desktop: admin dashboard, super-user grant/revoke, hub search and sport filter passed.
- Temporary accounts, listings, photos and the credential fixture were removed. Screenshot artifacts use temporary data.
- Android Metro bundle completed. Physical Expo Go interaction is awaiting the user's test result; browser phone-width checks do not establish physical-device behavior.

Repeatable commands: `npm run lint`, `npm run build`, `npm --prefix backend test`, and `npm run test:auth`.

For a new live verification run, use `npx tsx scripts/verifyVenueAdmin.ts` from `backend/`. It creates and removes disposable accounts. The optional `--keep` flag retains a local ignored fixture for browser checks; always run `npx tsx scripts/verifyVenueAdmin.ts --cleanup` afterward. Never share the fixture or credentials.
