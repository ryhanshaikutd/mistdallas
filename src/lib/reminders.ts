/**
 * Decides who gets which deadline reminder today. Pure so the cron route and
 * tests share the exact rule: a user with reminders on gets one email per
 * milestone whose date is exactly `days_before` days away, once per day.
 */
import { addDaysIso } from "@/lib/deadlines";

export interface ReminderPick {
  user_id: string;
  milestone_id: string;
  days_before: number;
}

export function selectReminders(input: {
  todayIso: string;
  prefs: { user_id: string; email_enabled: boolean; days_before: number }[];
  milestones: { id: string; target_date: string | null; send_reminders: boolean }[];
  delivered: { user_id: string; milestone_id: string }[];
}): ReminderPick[] {
  const done = new Set(input.delivered.map((d) => `${d.user_id}|${d.milestone_id}`));
  const picks: ReminderPick[] = [];
  for (const pref of input.prefs) {
    if (!pref.email_enabled) continue;
    const target = addDaysIso(input.todayIso, pref.days_before);
    for (const m of input.milestones) {
      if (!m.send_reminders || !m.target_date || m.target_date !== target) continue;
      if (done.has(`${pref.user_id}|${m.id}`)) continue;
      picks.push({ user_id: pref.user_id, milestone_id: m.id, days_before: pref.days_before });
    }
  }
  return picks;
}
