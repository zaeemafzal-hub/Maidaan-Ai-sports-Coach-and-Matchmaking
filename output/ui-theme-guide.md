# Shared Maidaan theme

The approved look uses the existing charcoal canvas and orange actions:
`#0C0D0E`, `#141518`, `#1B1D22`, `#E85D26`, white and muted text. Cards use
translucent charcoal so the supplied backgrounds remain visible. Inputs,
primary actions and persistent save/composer bars retain readable surfaces.

## Artwork

| Local asset | Main use |
| --- | --- |
| `form-atmosphere.png` | Sign-in/signup, recovery, setup forms, venue management, bookings and administration |
| `venue-court.png` | Venue browsing, captain tools and match details |
| `discover-football.png` | Discover background and full-image hero |
| `profile-equipment.png` | Player profiles, coaching and concierge |
| `welcome-sports-cutout.png` | Unframed transparent Welcome scene |

The four backgrounds came from the user's supplied images. The Welcome image
was generated with transparency. Existing image aliases point to these assets;
older image files are retained on disk. Venue photos uploaded by owners and
player profile photos continue to use the actual saved URLs.

## Shared components

- `constants/artwork.ts`: local image registry and glass-card values.
- `components/ui/ThemedScreen.tsx`: safe-area screen canvas and route artwork.
- `components/ui/Artwork.tsx`: scrolling background, image layer and compact hero.
- `components/ui/WelcomeScene.tsx`: responsive Welcome with reduced-motion support.
- `components/venues/VenueUI.tsx`: consistent venue, booking and admin pages/cards.

Discover focuses on matches. Venues has its own navigation tab, with the existing
area search, sport filters, map, venue details and booking links. Wide web layouts
use a side rail; phones keep bottom tabs. The venue form groups its original
fields into sections and uses two columns on wide layouts, with one persistent
save action.

The screen wrappers preserve scroll refs, refresh controls, keyboard handling and
safe-area edges. Horizontal lists keep their native ScrollView. Authentication,
API calls, role checks, booking/payment policies and validation are retained.
Runtime verification also uncovered conditional-hook crashes in captain/admin
and confirmation views; hooks now run in stable order without changing access
rules or workflow decisions.

## Review

See the dated entry in `verification.md` for checks actually completed. Local
browser fixtures never write to Supabase. Phone-sized browser checks and native
bundling do not replace a physical Expo Go visual check; reload the project on
the phone to review the final spacing and artwork.
