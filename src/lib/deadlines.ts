/**
 * Deadline timing and calendar export helpers. Pure functions: callers pass
 * "today" as an ISO date so pages, the cron and tests agree on the day.
 */

export interface DeadlineLike {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  legacy_id?: string | null;
}

/** Calendar day (YYYY-MM-DD) for `now` in a time zone; the board runs on Dallas time. */
export function localDateIso(now: Date, timeZone = "America/Chicago"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export interface DeadlineTiming {
  label: string;
  isOverdue: boolean;
  daysAway: number | null;
}

export function deadlineTiming(targetDate: string | null | undefined, todayIso: string): DeadlineTiming {
  if (!targetDate) return { label: "No date", isOverdue: false, daysAway: null };
  const daysAway = daysBetween(todayIso, targetDate);
  if (daysAway < 0) {
    const n = Math.abs(daysAway);
    return { label: `${n} day${n === 1 ? "" : "s"} overdue`, isOverdue: true, daysAway };
  }
  if (daysAway === 0) return { label: "Due today", isOverdue: false, daysAway };
  if (daysAway === 1) return { label: "Due tomorrow", isOverdue: false, daysAway };
  return { label: `${daysAway} days away`, isOverdue: false, daysAway };
}

const dated = <T extends DeadlineLike>(items: T[]) =>
  items.filter((i): i is T & { target_date: string } => typeof i.target_date === "string");
const byDate = <T extends DeadlineLike>(a: T, b: T) => (a.target_date ?? "").localeCompare(b.target_date ?? "");

export function upcomingDeadlines<T extends DeadlineLike>(items: T[], todayIso: string, limit = 5): T[] {
  return dated(items).filter((i) => i.target_date >= todayIso).sort(byDate).slice(0, limit);
}

export function overdueDeadlines<T extends DeadlineLike>(items: T[], todayIso: string): T[] {
  return dated(items).filter((i) => i.target_date < todayIso).sort(byDate);
}

export function dueWithinDays<T extends DeadlineLike>(items: T[], todayIso: string, days: number): T[] {
  const horizon = addDaysIso(todayIso, days);
  return dated(items).filter((i) => i.target_date >= todayIso && i.target_date <= horizon).sort(byDate);
}

export function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** All-day VEVENTs, one per dated item, in the handbook's exact format. */
export function buildIcsCalendar(items: DeadlineLike[], opts: { portalUrl: string; now: Date }): string {
  const stamp = icsStamp(opts.now);
  const events = dated(items).map((item) =>
    [
      "BEGIN:VEVENT",
      `UID:${escapeIcs(item.legacy_id || item.id)}@mist-dallas-portal`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(item.target_date)}`,
      `DTEND;VALUE=DATE:${compactDate(addDaysIso(item.target_date, 1))}`,
      `SUMMARY:${escapeIcs(`MIST Dallas: ${item.title}`)}`,
      `DESCRIPTION:${escapeIcs(`${item.description ?? ""}\n\nPortal: ${opts.portalUrl}`)}`,
      "END:VEVENT",
    ].join("\r\n")
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MIST Dallas//Organizer Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(item: DeadlineLike, portalUrl: string): string | null {
  if (!item.target_date) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `MIST Dallas: ${item.title}`,
    dates: `${compactDate(item.target_date)}/${compactDate(addDaysIso(item.target_date, 1))}`,
    details: `${item.description ?? ""}\n\nPortal: ${portalUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
