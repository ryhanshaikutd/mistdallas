import { describe, it, expect } from "vitest";
import { selectReminders } from "@/lib/reminders";

const prefs = [
  { user_id: "u1", email_enabled: true, days_before: 7 },
  { user_id: "u2", email_enabled: false, days_before: 7 },
  { user_id: "u3", email_enabled: true, days_before: 1 },
];
const milestones = [
  { id: "m7", target_date: "2026-11-07", send_reminders: true },
  { id: "m6", target_date: "2026-11-06", send_reminders: true },
  { id: "m1", target_date: "2026-11-01", send_reminders: true },
  { id: "mx", target_date: "2026-11-07", send_reminders: false },
  { id: "mn", target_date: null, send_reminders: true },
];
const TODAY = "2026-10-31";

describe("selectReminders", () => {
  it("matches each enabled user's lead time exactly and skips opted-out milestones and null dates", () => {
    expect(selectReminders({ todayIso: TODAY, prefs, milestones, delivered: [] })).toEqual([
      { user_id: "u1", milestone_id: "m7", days_before: 7 },
      { user_id: "u3", milestone_id: "m1", days_before: 1 },
    ]);
  });

  it("never selects a pair that was already delivered", () => {
    expect(selectReminders({ todayIso: TODAY, prefs, milestones, delivered: [{ user_id: "u1", milestone_id: "m7" }] })).toEqual([
      { user_id: "u3", milestone_id: "m1", days_before: 1 },
    ]);
  });

  it("returns nothing when nobody has reminders on", () => {
    expect(selectReminders({ todayIso: TODAY, prefs: [prefs[1]], milestones, delivered: [] })).toEqual([]);
  });
});
