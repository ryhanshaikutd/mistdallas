import { requireRole } from "@/lib/auth";
import { DIRECTOR_PLUS, isLeadership } from "@/lib/constants";
import type { Milestone, Position } from "@/lib/types";
import { buildRoster, teamReadiness, attentionTeams, type RosterProfile, type RosterProgress } from "@/lib/roster";
import { localDateIso, overdueDeadlines, dueWithinDays, upcomingDeadlines } from "@/lib/deadlines";
import CommandCenter from "@/components/portal/command/CommandCenter";

export default async function CommandPage() {
  const { profile, supabase } = await requireRole(DIRECTOR_PLUS);
  const [{ data: positions }, { data: profiles }, { data: progress }, { data: milestones }] = await Promise.all([
    supabase.from("positions").select("*").eq("is_active", true),
    supabase.from("profiles").select("id, full_name, email, avatar_url, position_id").not("position_id", "is", null),
    supabase.from("workbook_progress").select("user_id, position_slug, phase, data"),
    supabase.from("milestones").select("*").not("target_date", "is", null).order("target_date"),
  ]);

  const rows = buildRoster((positions ?? []) as Position[], (profiles ?? []) as RosterProfile[], (progress ?? []) as RosterProgress[]);
  const readiness = teamReadiness(rows);
  const todayIso = localDateIso(new Date());
  const dated = (milestones ?? []) as Milestone[];

  return (
    <CommandCenter
      readiness={readiness}
      attention={attentionTeams(readiness)}
      openSeats={rows.filter((r) => !r.holder)}
      overdue={overdueDeadlines(dated, todayIso)}
      dueThisWeek={dueWithinDays(dated, todayIso, 7)}
      next={upcomingDeadlines(dated, todayIso, 5)}
      todayIso={todayIso}
      canManageSeats={isLeadership(profile.role)}
    />
  );
}
