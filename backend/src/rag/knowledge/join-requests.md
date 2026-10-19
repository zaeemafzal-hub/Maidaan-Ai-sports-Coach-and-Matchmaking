# Join Requests and Squad Admission

## How Join Requests Work
Open a future fixture on Discover, read Match Details and select Request to Join. An optional short introduction goes to the captain. A pending request is not a confirmed spot. Duplicate active requests, own-match requests and already-confirmed participants are rejected. The captain receives an in-app notification. These are in-app notifications, not device push notifications.

## Captain Acceptance and Atomic Slot Allocation
The owning captain reviews pending requests in the Captain Desk. Accept adds one match participant and reduces open slots under the same database match lock used for recruitment updates. Capacity cannot be exceeded. If open slots reaches zero the fixture becomes FULL. Reject leaves recruitment unchanged. Both decisions create a player notification. Concierge proposals require explicit confirmation and use the same domain decision as the manual screen.

## Confirmation Ticket and Match Day
An accepted player sees Spot Confirmed and can open the squad group chat. Unrelated users cannot enter the room. Captain and player messages persist on the server. Match contributions are settled with the captain; match admission does not process payment. A venue reservation is a separate sandbox-only or disabled checkout flow.
