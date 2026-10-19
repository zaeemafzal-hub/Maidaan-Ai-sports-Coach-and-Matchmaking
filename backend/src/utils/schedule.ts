/** New fixtures use Pakistan local calendar date and 24-hour wall time (UTC+05:00, no DST). */
export function validateFutureSchedule(
  date: unknown,
  time: unknown,
  now = Date.now(),
): string | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return "Date must use YYYY-MM-DD.";
  const day = new Date(date + "T00:00:00Z");
  if (
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== date
  )
    return "Invalid calendar date.";
  if (
    typeof time !== "string" ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)
  )
    return "Start time must use 24-hour HH:mm.";
  if (Date.parse(`${date}T${time}+05:00`) <= now)
    return "Match must start in the future (Pakistan time).";
  return null;
}
