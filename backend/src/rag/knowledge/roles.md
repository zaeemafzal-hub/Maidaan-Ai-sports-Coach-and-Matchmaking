# User Roles & Permissions

## Supported User Roles
Maidaan distinguishes between four explicit user roles defined in the authentication and authorization model:
- PLAYER: Individual athletes seeking local matches, looking to join team squads, or practicing with the AI Coach.
- TEAM_CAPTAIN: Match organizers who create fixtures, define team requirements, and evaluate player join requests.
- HUB_OWNER: Facility managers who register and control sports courts, managing availability states across their venues.
- ADMIN: Platform administrators responsible for governance, reviewing safety incident reports, and auditing hub verifications.

## Public Onboarding vs Administrative Role
During initial registration on the mobile app, new users can choose from three public roles:
- Player (requires sports preferences, skill level, and home neighborhood).
- Team Captain (requires team name, preferred sports, and primary area).
- Hub Owner (requires venue name, contact number, court count, and venue location).

The ADMIN role is restricted and cannot be selected during public onboarding. Administrator privileges are granted strictly via secure backend configuration or direct database role assignment.

## Role Switching and Multi-Profile Management
A user's primary active role is preserved in their profile and session state. While a user may participate in matches as a player, match hosting and squad approval workflows require the TEAM_CAPTAIN role, and facility management requires the HUB_OWNER role. All role actions are validated server-side by authorization middleware.
