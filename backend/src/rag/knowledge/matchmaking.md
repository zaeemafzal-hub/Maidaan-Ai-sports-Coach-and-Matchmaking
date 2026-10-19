# Match Discovery and Matchmaking Workflow

## The Matchmaking Lifecycle
A captain publishes a future cricket, football, badminton or padel fixture with venue, area, Pakistan-local date and start time, skill, total capacity and open slots. Players find fixtures on Discover, inspect Match Details, then submit a join request. Only the owning captain accepts or rejects. Acceptance confirms the participant, reduces open slots atomically, creates an in-app notification and unlocks the match group chat. Recruitment can be closed early; confirmed participants plus open slots cannot exceed capacity.

## Discovery, Location and Venue Map
Discover is for games. Venues is for hub inventory and real map pins. Search venues by Lahore area, name or address and filter sport. OpenStreetMap is primary, with Google used only as a configured failure backup. The fixture schematic marker is not a GPS coordinate or a venue reservation. The app does not track device GPS or guarantee travel distance.

## Real Fixtures vs Venue Booking
Captain-organized match admission and venue reservations are separate flows. A match contribution is informational and arranged with the captain outside checkout. Venue slots have their own full or advance payment and cancellation policies. Checkout remains sandbox or disabled in the controlled pilot; never imply a real-money reservation has been paid.
