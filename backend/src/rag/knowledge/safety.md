# Platform Safety, Moderation & Security

## Server-Side Authorization Enforcement
Maidaan enforces strict security boundaries to protect player privacy and match integrity:
- Verified Session Tokens: All client requests to private endpoints must present a valid Supabase Bearer JWT token. User IDs and roles are resolved strictly from the verified session, never from client-provided request bodies or headers.
- Role-Based Access Control (RBAC): Privileged operations such as match publishing (TEAM_CAPTAIN), court status updates (HUB_OWNER), and verification reviews (ADMIN) are enforced by server-side middleware.
- Anti-Tampering: AI agents and models have no permissions to modify user roles, bypass authentication, or execute unverified transactional commands.

## Reporting and Conduct Moderation
To maintain a safe and respectful sporting environment:
- Player Reports: Participants can submit reports regarding unsportsmanlike behavior, no-shows, harassment, or venue discrepancies.
- Admin Review: Reports are queued in the Admin Governance Desk where platform administrators audit details and mark them as reviewed or resolved.
- Chat Room Isolation: Match squad chat rooms are restricted strictly to confirmed players and the match captain, preventing unsolicited external messaging.
