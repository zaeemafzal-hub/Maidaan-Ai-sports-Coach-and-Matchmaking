/** Shared by REST, Socket.IO and the map bridge; explicit configuration wins. */
export function resolveBackendUrl(
  configured: string | undefined,
  location?: { hostname: string; port: string; origin: string },
  devHost?: string | null,
  allowLocal = true,
): string {
  if (configured?.trim()) {
    if (configured.trim() === "same-origin" && location) return location.origin;
    const url = new URL(configured.trim());
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("API URL must use HTTP or HTTPS.");
    if (!allowLocal && url.protocol !== "https:")
      throw new Error("Installed releases require an HTTPS backend URL.");
    return url.toString().replace(/\/+$/, "");
  }
  if (!allowLocal)
    throw new Error("Set EXPO_PUBLIC_API_URL to the public HTTPS backend before building a release.");
  if (location?.port === "8081") return `http://${location.hostname}:5000`;
  if (devHost) return `http://${devHost}:5000`;
  if (location)
    throw new Error(
      "Set EXPO_PUBLIC_API_URL to the backend URL, or same-origin.",
    );
  return "http://localhost:5000";
}
