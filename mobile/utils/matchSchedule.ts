/** Resolve the existing quick presets before sending canonical values to the API. */
export function normalizeMatchSchedule(
  date: string,
  time: string,
  now = Date.now(),
) {
  const local = new Date(now + 5 * 60 * 60 * 1000);
  const label = date.trim().toLowerCase();
  if (label === "tomorrow") local.setUTCDate(local.getUTCDate() + 1);
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const weekday = weekdays.indexOf(label);
  if (weekday >= 0)
    local.setUTCDate(
      local.getUTCDate() + ((weekday - local.getUTCDay() + 7) % 7 || 7),
    );
  const matchDate =
    ["today", "tonight", "tomorrow"].includes(label) || weekday >= 0
      ? local.toISOString().slice(0, 10)
      : date.trim();
  const start = time.split(/\s*[-–]\s*/)[0].trim();
  const parsed = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(start);
  const startTime = parsed
    ? `${String((Number(parsed[1]) % 12) + (parsed[3].toUpperCase() === "PM" ? 12 : 0)).padStart(2, "0")}:${parsed[2]}`
    : start;
  return { date: matchDate, startTime };
}
