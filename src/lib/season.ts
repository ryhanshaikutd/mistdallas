import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeasonSettings } from "@/lib/types";
import type { PhaseId } from "@/lib/workbook/types";

export async function getCurrentSeason(supabase: SupabaseClient): Promise<SeasonSettings | null> {
  const { data } = await supabase.from("season_settings").select("*").eq("is_current", true).maybeSingle();
  return (data as SeasonSettings | null) ?? null;
}

/** Whole days from today to `iso`; negative when it has passed. */
export function daysUntil(iso: string, todayIso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

export function currentPhase(season: SeasonSettings, todayIso: string): PhaseId {
  if (todayIso >= season.execution_start) return "execution";
  if (todayIso >= season.stabilization_start) return "stabilization";
  if (todayIso >= season.build_start) return "build";
  return "foundations";
}

/** "2026–27" for the 2027 tournament season. */
export function seasonLabel(season: SeasonSettings): string {
  return `${season.year - 1}–${String(season.year).slice(2)}`;
}
