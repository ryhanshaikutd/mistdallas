/**
 * Workbook progress math. Checkmarks are keyed by a stable id derived from the
 * deliverable text, so editing one deliverable in content.ts resets only that
 * item and reordering resets nothing.
 *
 * scripts/lib/handbook-map.mjs carries a JavaScript copy of deliverableId for
 * the one-off data sync; keep the two in step.
 */
import { PHASE_IDS, type PhaseId, type RoleWorkbook, type WorkbookPhase } from "./types";

export interface WorkbookPhaseData {
  checks: Record<string, true>;
  notes: string;
  fields: Record<string, string>;
}

export const emptyPhaseData = (): WorkbookPhaseData => ({ checks: {}, notes: "", fields: {} });

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const normalize = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

export function deliverableId(text: string, ordinal = 0): string {
  const base = `d-${fnv1a(normalize(text))}`;
  return ordinal > 0 ? `${base}-${ordinal}` : base;
}

/** Ids for every deliverable in a phase; repeated texts get an ordinal suffix. */
export function deliverableIds(deliverables: string[]): string[] {
  const seen = new Map<string, number>();
  return deliverables.map((text) => {
    const key = normalize(text);
    const ordinal = seen.get(key) ?? 0;
    seen.set(key, ordinal + 1);
    return deliverableId(text, ordinal);
  });
}

export function phasePercent(phase: WorkbookPhase, data: WorkbookPhaseData | null | undefined): number {
  const ids = deliverableIds(phase.deliverables);
  if (ids.length === 0) return 0;
  const checked = ids.filter((id) => data?.checks?.[id] === true).length;
  return Math.round((checked / ids.length) * 100);
}

export function overallPercent(role: RoleWorkbook, byPhase: Partial<Record<PhaseId, WorkbookPhaseData>>): number {
  const total = PHASE_IDS.reduce((sum, phase) => sum + phasePercent(role.phases[phase], byPhase[phase]), 0);
  return Math.round(total / PHASE_IDS.length);
}

export function fieldKey(kind: "framework" | "weekly" | "reflection", ...indices: number[]): string {
  return `${kind}-${indices.join("-")}`;
}

export interface LegacyPhaseData {
  checks?: boolean[];
  notes?: string;
  fields?: Record<string, string>;
}

/** The handbook stored checks as an array aligned to the deliverables list. */
export function convertLegacyProgress(role: RoleWorkbook, phase: PhaseId, legacy: LegacyPhaseData): WorkbookPhaseData {
  const ids = deliverableIds(role.phases[phase].deliverables);
  const checks: Record<string, true> = {};
  (legacy.checks ?? []).forEach((checked, i) => {
    if (checked === true && ids[i]) checks[ids[i]] = true;
  });
  return { checks, notes: legacy.notes ?? "", fields: { ...(legacy.fields ?? {}) } };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export interface SeasonSpan {
  foundations_start: string;
  season_end: string;
}

/**
 * "Oct 1: …", "Mar 26–28: …" and "Oct 15+: …" start with a month and day;
 * September–December fall in the season's first calendar year, January–August
 * in its second. Anything else ("Mid-Ramadan", "Ongoing") has no date.
 */
export function deliverableDueDate(text: string, season: SeasonSpan): string | null {
  const m = /^\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})\b/.exec(text);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = Number(m[2]);
  if (!month || day < 1 || day > 31) return null;
  const year = month >= 9 ? Number(season.foundations_start.slice(0, 4)) : Number(season.season_end.slice(0, 4));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface NextAction {
  phase: PhaseId;
  text: string;
  due: string;
  overdue: boolean;
}

/** Unchecked deliverables that are overdue or due within 14 days, soonest first. */
export function nextActions(
  role: RoleWorkbook,
  byPhase: Partial<Record<PhaseId, WorkbookPhaseData>>,
  season: SeasonSpan,
  todayIso: string,
  limit = 5
): NextAction[] {
  const horizon = plusDays(todayIso, 14);
  const out: NextAction[] = [];
  for (const phase of PHASE_IDS) {
    const deliverables = role.phases[phase].deliverables;
    const ids = deliverableIds(deliverables);
    deliverables.forEach((text, i) => {
      if (byPhase[phase]?.checks?.[ids[i]] === true) return;
      const due = deliverableDueDate(text, season);
      if (!due || due > horizon) return;
      out.push({ phase, text, due, overdue: due < todayIso });
    });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due)).slice(0, limit);
}
