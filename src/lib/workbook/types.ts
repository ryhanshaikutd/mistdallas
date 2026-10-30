import type { Team } from "@/lib/types";

export const PHASE_IDS = ["foundations", "build", "stabilization", "execution"] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export interface PhaseMeta {
  id: PhaseId;
  label: string;
  shortLabel: string;
  dates: string;
  tagline: string;
  color: string;
}

export interface Framework {
  type: "table";
  title: string;
  columns: string[];
  rows: number;
}

export interface WeeklyPlanItem {
  week: string;
  tasks: string;
}

export interface WorkbookPhase {
  focus: string;
  responsibilities: string[];
  deliverables: string[];
  frameworks: Framework[];
  weeklyPlan: WeeklyPlanItem[];
  reflections: string[];
  risks: string[];
}

export interface RoleWorkbook {
  slug: string;
  title: string;
  team: Team | "exec";
  startPhase: PhaseId;
  badge: string;
  reportsTo: string | null;
  manages: string[];
  phases: Record<PhaseId, WorkbookPhase>;
}
