# Join Requests & Squad Admission

## How Join Requests Work
When a player finds an open match fixture with available slots, they initiate the admission workflow by submitting a Join Request:
1. Submission: The player sends a join request to the match endpoint. The system verifies that the player is authenticated, has a player profile, and has not already applied for or joined the match.
2. Status Tracking: The join request is initialized in `PENDING` status. The applicant can track all their active and past requests under their profile or join request summary.
3. Captain Notification: The match captain receives an in-app notification indicating a new applicant with their name, preferred sports, and skill level.

## Captain Acceptance and Atomic Slot Allocation
When the team captain reviews a pending join request:
- Acceptance: The captain approves the player. The backend executes an atomic stored procedure (`accept_join_request`) with row-level locks to ensure slot capacity is strictly maintained. The match's `open_slots` counter decrements by 1, and the player is officially added to `match_participants`.
- Status Transition: If `open_slots` reaches 0, the match status automatically transitions from `OPEN` to `FULL`.
- Rejection: The captain can reject the request. The request status updates to `REJECTED`, the slot remains open for other applicants, and the applicant receives a notification.

## Confirmation Ticket & Match Day
Once accepted, the player gains access to the "Spot Confirmed" screen detailing venue directions, emergency arrival advice, and entry into the match's squad group chat. No financial checkout or payment processing occurs within the app; any contribution fee noted in the fixture is settled in person according to the captain's instructions.
