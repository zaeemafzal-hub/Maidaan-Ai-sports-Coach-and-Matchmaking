// Fixtures currently use Pakistan local dates and times, independent of server timezone.
export function isUpcomingMatch(date: string, startTime: string, now = Date.now()): boolean {
  const start = Date.parse(`${date}T${startTime}+05:00`);
  return Number.isFinite(start) && start > now;
}
