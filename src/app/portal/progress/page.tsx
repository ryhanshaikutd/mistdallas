import { requireBoard } from "@/lib/auth";
import type { Position } from "@/lib/types";
import { buildRoster, type RosterProfile, type RosterProgress } from "@/lib/roster";
import ProgressBoard from "@/components/portal/progress/ProgressBoard";

export default async function ProgressPage() {
  const { supabase } = await requireBoard();
  const [{ data: positions }, { data: profiles }, { data: progress }] = await Promise.all([
    supabase.from("positions").select("*").eq("is_active", true),
    supabase.from("profiles").select("id, full_name, email, avatar_url, position_id").not("position_id", "is", null),
    supabase.from("workbook_progress").select("user_id, position_slug, phase, data, updated_at"),
  ]);
  const rows = buildRoster((positions ?? []) as Position[], (profiles ?? []) as RosterProfile[], (progress ?? []) as RosterProgress[]);

  const lastUpdated: Record<string, string> = {};
  for (const row of (progress ?? []) as (RosterProgress & { updated_at: string })[]) {
    if (!lastUpdated[row.user_id] || row.updated_at > lastUpdated[row.user_id]) lastUpdated[row.user_id] = row.updated_at;
  }

  return <ProgressBoard rows={rows} lastUpdated={lastUpdated} />;
}
