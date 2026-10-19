# User Roles and Permissions

## Supported User Roles
PLAYER discovers and joins games and uses coaching and chat. TEAM_CAPTAIN creates owned fixtures, manages one primary team and reviews join requests. HUB_OWNER manages their own venue, photos, location pin, courts, availability and booking policy. ADMIN manages accounts, reports and administrative hub verification.

## Public Onboarding vs Administrative Role
Public signup is player-first. After Player Setup, activate Captain or Hub Owner in Profile and submit the corresponding setup form. Existing capabilities stay on the same account. A roster VICE_CAPTAIN label is not a platform TEAM_CAPTAIN permission. ADMIN is granted only by a trusted server command or an existing superuser. Superusers can grant or revoke other superusers, while the last active superuser is protected.

## Role Switching and Multi-Profile Management
Choose an available mode from Profile. Switching back to Player retains the Captain or Hub Owner capability. The authoritative capabilities come from active user_roles rows on the backend. activeMode is presentation state only. A legacy primary profiles.role does not override capabilities. Suspended accounts lose access and listings are hidden until reinstated.
