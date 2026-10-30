import { requireBoard } from "@/lib/auth";
import { getCurrentSeason } from "@/lib/season";
import { localDateIso } from "@/lib/deadlines";
import type { Milestone } from "@/lib/types";
import TimelineView from "@/components/portal/timeline/TimelineView";

export default async function TimelinePage() {
  const { supabase } = await requireBoard();
  const [{ data: milestones }, season] = await Promise.all([
    supabase.from("milestones").select("*").not("target_date", "is", null).order("target_date"),
    getCurrentSeason(supabase),
  ]);
  return <TimelineView milestones={(milestones ?? []) as Milestone[]} season={season} todayIso={localDateIso(new Date())} />;
}
