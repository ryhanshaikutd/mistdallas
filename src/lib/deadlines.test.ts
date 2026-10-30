import { describe, it, expect } from "vitest";
import {
  localDateIso, addDaysIso, compactDate, deadlineTiming, upcomingDeadlines, overdueDeadlines, dueWithinDays,
  buildIcsCalendar, googleCalendarUrl,
} from "@/lib/deadlines";

const items = [
  { id: "a", legacy_id: null, title: "Undated", description: null, target_date: null },
  { id: "b", legacy_id: "oct-01", title: "Past", description: null, target_date: "2026-10-01" },
  { id: "c", legacy_id: "oct-20", title: "Later", description: null, target_date: "2026-10-20" },
  { id: "d", legacy_id: "oct-10", title: "Soon", description: null, target_date: "2026-10-10" },
];
const TODAY = "2026-10-08";

describe("date helpers", () => {
  it("localDateIso uses the Chicago calendar day by default", () => {
    expect(localDateIso(new Date("2027-03-26T03:30:00Z"))).toBe("2027-03-25");
    expect(localDateIso(new Date("2027-03-26T03:30:00Z"), "UTC")).toBe("2027-03-26");
  });

  it("addDaysIso and compactDate", () => {
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-10-08", -3)).toBe("2026-10-05");
    expect(compactDate("2027-03-25")).toBe("20270325");
  });
});

describe("deadlineTiming", () => {
  it("labels overdue, today, tomorrow, future and undated", () => {
    expect(deadlineTiming("2026-10-05", TODAY)).toEqual({ label: "3 days overdue", isOverdue: true, daysAway: -3 });
    expect(deadlineTiming("2026-10-07", TODAY)).toEqual({ label: "1 day overdue", isOverdue: true, daysAway: -1 });
    expect(deadlineTiming("2026-10-08", TODAY)).toEqual({ label: "Due today", isOverdue: false, daysAway: 0 });
    expect(deadlineTiming("2026-10-09", TODAY)).toEqual({ label: "Due tomorrow", isOverdue: false, daysAway: 1 });
    expect(deadlineTiming("2026-10-13", TODAY)).toEqual({ label: "5 days away", isOverdue: false, daysAway: 5 });
    expect(deadlineTiming(null, TODAY)).toEqual({ label: "No date", isOverdue: false, daysAway: null });
  });
});

describe("deadline lists", () => {
  it("upcomingDeadlines skips undated and overdue items, sorts ascending, respects limit", () => {
    expect(upcomingDeadlines(items, TODAY).map((i) => i.id)).toEqual(["d", "c"]);
    expect(upcomingDeadlines(items, TODAY, 1).map((i) => i.id)).toEqual(["d"]);
  });

  it("overdueDeadlines and dueWithinDays", () => {
    expect(overdueDeadlines(items, TODAY).map((i) => i.id)).toEqual(["b"]);
    expect(dueWithinDays(items, TODAY, 7).map((i) => i.id)).toEqual(["d"]);
    expect(dueWithinDays(items, TODAY, 12).map((i) => i.id)).toEqual(["d", "c"]);
  });
});

describe("calendar export", () => {
  const item = {
    id: "abc", legacy_id: "nov-30-nationals", title: "Nationals deadline",
    description: "Line one, with comma\nLine two", target_date: "2026-11-30",
  };
  const opts = { portalUrl: "https://mistdallas.org/portal/calendar", now: new Date("2026-10-08T12:00:00Z") };

  it("buildIcsCalendar produces an all-day VEVENT with escaped text and CRLF lines", () => {
    const expected = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MIST Dallas//Organizer Portal//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:nov-30-nationals@mist-dallas-portal", "DTSTAMP:20261008T120000Z",
      "DTSTART;VALUE=DATE:20261130", "DTEND;VALUE=DATE:20261201", "SUMMARY:MIST Dallas: Nationals deadline",
      "DESCRIPTION:Line one\\, with comma\\nLine two\\n\\nPortal: https://mistdallas.org/portal/calendar",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    expect(buildIcsCalendar([item], opts)).toBe(expected);
  });

  it("buildIcsCalendar skips undated items and falls back to the row id", () => {
    const ics = buildIcsCalendar([items[0], { ...item, legacy_id: null }], opts);
    expect(ics).not.toContain("Undated");
    expect(ics).toContain("UID:abc@mist-dallas-portal");
  });

  it("googleCalendarUrl builds a template link and returns null without a date", () => {
    const url = googleCalendarUrl(item, opts.portalUrl)!;
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("dates=20261130%2F20261201");
    expect(url).toContain("text=MIST+Dallas%3A+Nationals+deadline");
    expect(googleCalendarUrl(items[0], opts.portalUrl)).toBeNull();
  });
});
