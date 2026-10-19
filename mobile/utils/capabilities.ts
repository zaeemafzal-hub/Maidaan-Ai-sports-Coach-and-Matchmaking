import type { AppMode, Role } from "../types";

/** Presentation requires both a server-granted capability and the chosen mode. */
export function isActiveCapability(
  roles: readonly Role[],
  activeMode: AppMode,
  role: Role,
): boolean {
  return roles.includes(role) && activeMode === role;
}

export function resolveActiveMode(
  roles: readonly Role[],
  requested: AppMode,
): AppMode {
  return roles.includes(requested)
    ? requested
    : roles.includes("PLAYER")
      ? "PLAYER"
      : roles[0] || "PLAYER";
}
