import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth";
import { TEAM_LABELS } from "@/lib/constants";
import type { Milestone, Position, Team } from "@/lib/types";
import { buildRoster, teamDeadlines, type RosterProfile, type RosterProgress } from "@/lib/roster";
import { localDateIso, upcomingDeadlines } from "@/lib/deadlines";
import TeamDetail from "@/components/portal/teams/TeamDetail";

export default async function TeamPage({ params }: { params: Promise<{ team: string }> }) {
  const { team } = await params;
  if (!(team in TEAM_LABELS)) notFound();
  const teamKey = team as Team;

  const { supabase } = await requireBoard();
  const { data: positions } = await supabase.from("positions").select("*").eq("is_active", true);
  const teamPositions = ((positions ?? []) as Position[]).filter((p) => p.team === teamKey);
  const positionIds = teamPositions.map((p) => p.id);

  const [{ data: profiles }, { data: milestones }] = await Promise.all([
    positionIds.length
      ? supabase.from("profiles").select("id, full_name, email, avatar_url, position_id").in("position_id", positionIds)
      : Promise.resolve({ data: [] as RosterProfile[] }),
    supabase.from("milestones").select("*").not("target_date", "is", null).order("target_date"),
  ]);
  const holderIds = ((profiles ?? []) as RosterProfile[]).map((p) => p.id);
  const { data: progress } = holderIds.length
    ? await supabase.from("workbook_progress").select("user_id, position_slug, phase, data").in("user_id", holderIds)
    : { data: [] as RosterProgress[] };

  // Reporting lines may point outside the team; pass every position so they resolve.
  const rows = buildRoster((positions ?? []) as Position[], (profiles ?? []) as RosterProfile[], (progress ?? []) as RosterProgress[])
    .filter((r) => r.team === teamKey);
  const today = localDateIso(new Date());
  const deadlines = upcomingDeadlines(teamDeadlines((milestones ?? []) as Milestone[], teamKey), today, 5);

  return <TeamDetail team={teamKey} rows={rows} allPositions={(positions ?? []) as Position[]} deadlines={deadlines} today={today} />;
}
