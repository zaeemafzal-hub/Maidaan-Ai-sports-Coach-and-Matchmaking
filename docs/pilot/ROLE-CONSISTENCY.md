# F0 frontend role consistency inventory

Search covers application routes, shared components and the auth store. Legacy `profiles.role` remains for backward-compatible display and sender attribution only. It does not grant access. Backend authorization uses active `user_roles`; client activeMode cannot expand capabilities.

Captain screens require `isActiveCapability(roles, activeMode, TEAM_CAPTAIN)`. Hub dashboards require the granted HUB_OWNER capability and owner mode. Admin screens require the granted ADMIN capability; an administrator may follow a privileged link from Player mode without acquiring any new permission. Match-details and Concierge presentation resolve a granted active mode rather than the legacy primary role. Store mode setters validate against loaded roles, and stale persisted modes fall back safely. Legacy Role Selection now keeps a local form choice rather than mutating activeMode.

Activation submits Captain/Hub setup to the authenticated backend, reloads capabilities, then selects the new mode. Switching back to Player retains other capabilities. Admin is never offered as a public signup/activation choice.

Live browser evidence: PLAYER-primary account completed Captain Setup and loaded Captain Dashboard; Profile mode switching survives reload; player-only access remains restricted. Real owner and administrator capability switches loaded their workspaces. Automated tests cover spoofed modes, missing capability, legacy primary-role compatibility and backend denial.

| Source | Classification | Use |
| --- | --- | --- |
| `mobile/app/(auth)/role-selection.tsx:53` | ONBOARDING (local form choice) | `const [selectedRole, setSelectedRole] = useState<Role>("PLAYER");` |
| `mobile/app/(auth)/role-selection.tsx:58` | ONBOARDING (local form choice) | `if (!selectedRole) {` |
| `mobile/app/(auth)/role-selection.tsx:61` | ONBOARDING (local form choice) | `}, [selectedRole, setSelectedRole]);` |
| `mobile/app/(auth)/role-selection.tsx:63` | ONBOARDING (local form choice) | `const currentRole = selectedRole &#124;&#124; "PLAYER";` |
| `mobile/app/(tabs)/profile.tsx:58` | UI MODE | `activeMode = "PLAYER",` |
| `mobile/app/(tabs)/profile.tsx:94` | DISPLAY ONLY / LEGACY PRIMARY ROLE | `const profileRole = currentUser?.role &#124;&#124; "PLAYER";` |
| `mobile/app/(tabs)/profile.tsx:113` | AUTHORIZATION (server-granted capability presentation guard) | `const adminEntry = roles.includes("ADMIN") ? (` |
| `mobile/app/(tabs)/profile.tsx:359` | UI MODE | `const isActive = activeMode === r;` |
| `mobile/app/(tabs)/profile.tsx:712` | AUTHORIZATION (server-granted capability presentation guard) | `{(!roles.includes("TEAM_CAPTAIN") &#124;&#124; !roles.includes("HUB_OWNER")) && (` |
| `mobile/app/(tabs)/profile.tsx:722` | AUTHORIZATION (server-granted capability presentation guard) | `{!roles.includes("TEAM_CAPTAIN") && (` |
| `mobile/app/(tabs)/profile.tsx:764` | AUTHORIZATION (server-granted capability presentation guard) | `{!roles.includes("HUB_OWNER") && (` |
| `mobile/app/admin/account/[id].tsx:59` | AUTHORIZATION (server-granted capability presentation guard) | `allowed = useAuthStore((s) => s.roles.includes("ADMIN")),` |
| `mobile/app/admin/account/[id].tsx:119` | AUTHORIZATION (server-granted capability presentation guard) | `const admin = details?.account.roles.includes("ADMIN");` |
| `mobile/app/admin/accounts.tsx:21` | AUTHORIZATION (server-granted capability presentation guard) | `allowed = useAuthStore((s) => s.roles.includes("ADMIN"));` |
| `mobile/app/admin/dashboard.tsx:35` | AUTHORIZATION (server-granted capability presentation guard) | `const isAdmin = roles.includes("ADMIN");` |
| `mobile/app/admin/hub-verification.tsx:38` | AUTHORIZATION (server-granted capability presentation guard) | `const isAdmin = roles.includes("ADMIN");` |
| `mobile/app/admin/report-review.tsx:109` | AUTHORIZATION (server-granted capability presentation guard) | `const isAdmin = roles.includes("ADMIN");` |
| `mobile/app/bookings/index.tsx:27` | AUTHORIZATION (server-granted capability presentation guard) | `? roles.includes("HUB_OWNER")` |
| `mobile/app/bookings/index.tsx:29` | AUTHORIZATION (server-granted capability presentation guard) | `? roles.includes("ADMIN")` |
| `mobile/app/captain/create-match.tsx:187` | UI MODE | `const { currentUser, roles, activeMode, captainProfile } = useAuthStore();` |
| `mobile/app/captain/create-match.tsx:190` | UI MODE | `const isCaptain = isActiveCapability(roles, activeMode, "TEAM_CAPTAIN");` |
| `mobile/app/captain/dashboard.tsx:104` | UI MODE | `const { currentUser, roles, activeMode, captainProfile } = useAuthStore();` |
| `mobile/app/captain/dashboard.tsx:107` | UI MODE | `const isCaptain = isActiveCapability(roles, activeMode, "TEAM_CAPTAIN");` |
| `mobile/app/captain/join-requests.tsx:53` | UI MODE | `const { currentUser, roles, activeMode, captainProfile } = useAuthStore();` |
| `mobile/app/captain/join-requests.tsx:56` | UI MODE | `const isCaptain = isActiveCapability(roles, activeMode, "TEAM_CAPTAIN");` |
| `mobile/app/captain/team.tsx:46` | UI MODE | `const { currentUser, roles, activeMode, captainProfile } = useAuthStore();` |
| `mobile/app/captain/team.tsx:47` | UI MODE | `const isCaptain = isActiveCapability(roles, activeMode, "TEAM_CAPTAIN");` |
| `mobile/app/chat/[id].tsx:256` | DISPLAY ONLY / LEGACY PRIMARY ROLE | `senderRole: (currentUser?.role &#124;&#124; "PLAYER") as any,` |
| `mobile/app/concierge.tsx:64` | UI MODE | `const { currentUser, roles, activeMode } = useAuthStore();` |
| `mobile/app/concierge.tsx:65` | AUTHORIZATION (server-granted capability presentation guard) | `const userRole = roles.includes(activeMode) ? activeMode : "PLAYER";` |
| `mobile/app/hub/dashboard.tsx:32` | UI MODE | `const { roles, activeMode, hubOwnerProfile, currentUser } = useAuthStore();` |
| `mobile/app/hub/dashboard.tsx:34` | AUTHORIZATION (server-granted capability presentation guard) | `const isHubOwner = roles.includes("HUB_OWNER") && activeMode === "HUB_OWNER";` |
| `mobile/app/hub/verification.tsx:24` | UI MODE | `const { roles, activeMode, hubOwnerProfile } = useAuthStore();` |
| `mobile/app/hub/verification.tsx:25` | AUTHORIZATION (server-granted capability presentation guard) | `const isHubOwner = roles.includes("HUB_OWNER") && activeMode === "HUB_OWNER";` |
| `mobile/app/index.tsx:12` | UI MODE | `activeMode,` |
| `mobile/app/index.tsx:37` | UI MODE | `switch (activeMode) {` |
| `mobile/app/index.tsx:56` | UI MODE | `if (activeMode === "ADMIN") {` |
| `mobile/app/index.tsx:63` | UI MODE | `}, [isInitialized, authStatus, currentUser, activeMode]);` |
| `mobile/app/match/[id].tsx:61` | UI MODE | `const { currentUser, roles, activeMode } = useAuthStore();` |
| `mobile/app/match/[id].tsx:62` | AUTHORIZATION (server-granted capability presentation guard) | `const currentRole = roles.includes(activeMode) ? activeMode : "PLAYER";` |
| `mobile/components/venues/AvailabilityEditor.tsx:52` | AUTHORIZATION (server-granted capability presentation guard) | `const allowed = useAuthStore((s) => s.roles.includes("HUB_OWNER"));` |
| `mobile/components/venues/VenueEditor.tsx:46` | AUTHORIZATION (server-granted capability presentation guard) | `const allowed = roles.includes("HUB_OWNER");` |
| `mobile/store/useAuthStore.ts:26` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: AppMode;` |
| `mobile/store/useAuthStore.ts:27` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: Role &#124; null; // legacy compatibility` |
| `mobile/store/useAuthStore.ts:62` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:63` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:85` | UI MODE / ONBOARDING (validated against loaded roles) | `// Validate activeMode strictly against granted server roles` |
| `mobile/store/useAuthStore.ts:105` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: validatedMode,` |
| `mobile/store/useAuthStore.ts:106` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: validatedMode,` |
| `mobile/store/useAuthStore.ts:155` | UI MODE / ONBOARDING (validated against loaded roles) | `// Retrieve locally persisted activeMode preference` |
| `mobile/store/useAuthStore.ts:159` | AUTHORIZATION (server-granted capability presentation guard) | `if (storedMode && roles.includes(storedMode as Role)) {` |
| `mobile/store/useAuthStore.ts:162` | AUTHORIZATION (server-granted capability presentation guard) | `resolvedMode = roles.includes('PLAYER') ? 'PLAYER' : (roles[0] as AppMode);` |
| `mobile/store/useAuthStore.ts:165` | AUTHORIZATION (server-granted capability presentation guard) | `resolvedMode = roles.includes('PLAYER') ? 'PLAYER' : (roles[0] as AppMode);` |
| `mobile/store/useAuthStore.ts:183` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: resolvedMode,` |
| `mobile/store/useAuthStore.ts:184` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: resolvedMode,` |
| `mobile/store/useAuthStore.ts:220` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:221` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:280` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:281` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:330` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:331` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:382` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:383` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:406` | UI MODE / ONBOARDING (validated against loaded roles) | `activeMode: 'PLAYER',` |
| `mobile/store/useAuthStore.ts:407` | UI MODE / ONBOARDING (validated against loaded roles) | `selectedRole: 'PLAYER',` |
