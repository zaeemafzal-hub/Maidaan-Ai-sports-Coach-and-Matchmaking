# Platform Safety, Moderation and Security

## Server-Side Authorization Enforcement
Private APIs verify Supabase bearer tokens and resolve active capabilities from user_roles. activeMode and client role fields do not grant permission. Synthetic tokens and in-memory repositories belong only to isolated automated tests. Production has no automatic demo seeding. AI tools cannot bypass permissions, capacity checks or explicit human confirmation for captain mutations.

## Reporting and Conduct Moderation
Users can submit reports about misconduct, harassment, no-shows or venue issues. Granted administrators review and resolve or dismiss reports. Administrators may suspend accounts and hide listings while preserving history, then reinstate them. Administrative hub verification is not a physical inspection. Public users cannot grant themselves ADMIN.

## Chat and Payment Boundaries
Match group chat requires captain ownership or confirmed participation. Retried messages retain the same client message ID, preventing duplicate stored rows. Notifications are in-app; device push is not implemented. Payment checkout is sandbox or disabled for pilot testing; no real funds are collected. Never share passwords, tokens or provider secrets in chats or screenshots.
