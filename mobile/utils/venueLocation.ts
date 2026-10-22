/** Match mapPosition is a presentation percentage, never a geographic coordinate. */
export function venueMapUrl(name: string, area: string) {
  const query = [name.trim(), area.trim(), "Lahore", "Pakistan"]
    .filter(Boolean)
    .join(", ");
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}` as const;
}
