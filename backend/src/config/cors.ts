import { isProduction } from "./runtime.js";

/** Native apps have no Origin header. Browser origins require an exact allowlist in production. */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin || !isProduction()) return true;
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .includes(origin);
}
export const corsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => callback(null, isOriginAllowed(origin));
