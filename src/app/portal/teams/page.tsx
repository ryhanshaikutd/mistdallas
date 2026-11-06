import { requireBoard } from "@/lib/auth";
import type { Position } from "@/lib/types";
import { buildRoster, teamReadiness, type RosterProfile, type RosterProgress } from "@/lib/roster";
import TeamsOverview from "@/components/portal/teams/TeamsOverview";

export default async function TeamsPage() {
  const { supabase } = await requireBoard();
  const [{ data: positions }, { data: profiles }, { data: progress }] = await Promise.all([
    supabase.from("positions").select("*").eq("is_active", true),
    supabase.from("profiles").select("id, full_name, email, avatar_url, position_id").not("position_id", "is", null),
    supabase.from("workbook_progress").select("user_id, position_slug, phase, data"),
  ]);
  const rows = buildRoster((positions ?? []) as Position[], (profiles ?? []) as RosterProfile[], (progress ?? []) as RosterProgress[]);
  return <TeamsOverview readiness={teamReadiness(rows)} rows={rows} />;
}
