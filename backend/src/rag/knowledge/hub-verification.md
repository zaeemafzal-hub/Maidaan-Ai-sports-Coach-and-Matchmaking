# Hub Verification & Venue Management

## What is a Verified Hub?
A Verified Hub in Maidaan is a sports venue whose profile details, court count, contact number, and location have been submitted by a registered Hub Owner and reviewed and approved by a platform Administrator. Verified hubs display a verified badge across the platform to indicate administrative approval.

## Verification Workflow
The verification lifecycle operates through an administrative review workflow:
1. Hub Setup: The venue owner registers with the HUB_OWNER role, submitting the hub name, location, contact number, supported sports, and court count.
2. Verification Submission: The Hub Owner submits a verification request (`POST /api/hub/verification-request`), which is created in `PENDING` status.
3. Admin Review: A platform Administrator inspects pending requests from the Admin Dashboard (`GET /api/admin/hub-verifications`).
4. Decision: The Administrator approves or rejects the request (`PATCH /api/admin/hub-verifications/:id`) with an optional administrative note. Upon approval, the hub's `is_verified` status is updated to `true` in the database.

## Verification Scope
Hub verification confirms that the venue's profile was submitted by an authenticated Hub Owner and approved by platform administration. It is strictly an administrative platform review confirming venue profile details, contact information, and listed sports facilities. It does not involve on-site physical inspections or equipment audits.
