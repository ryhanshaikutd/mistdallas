/**
 * The seat roster: positions × holders × workbook progress, plus the per-team
 * readiness numbers the command center and team pages show.
 */
import type { Milestone, Position, Profile, Team, UserRole, WorkbookProgressRow } from "@/lib/types";
import { TEAM_LABELS, TEAM_ORDER, phaseIdFromEnum } from "@/lib/constants";
import { workbookFor } from "@/lib/workbook/content";
import { overallPercent, type WorkbookPhaseData } from "@/lib/workbook/progress";
import { PHASE_IDS, type PhaseId } from "@/lib/workbook/types";

export interface RosterHolder {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface RosterRow {
  positionId: string;
  slug: string;
  title: string;
  team: Team;
  startPhase: PhaseId;
  tier: UserRole;
  isExec: boolean;
  openForApplications: boolean;
  maxHolders: number | null;
  reportsToSlug: string | null;
  holder: RosterHolder | null;
  progress: number;
}

export type RosterProfile = Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "position_id">;
export type RosterProgress = Pick<WorkbookProgressRow, "user_id" | "position_slug" | "phase" | "data">;

const teamRank = (team: Team) => {
  const i = TEAM_ORDER.indexOf(team);
  return i === -1 ? TEAM_ORDER.length : i;
};

/** One row per holder; an unfilled seat yields one row with `holder: null`. */
export function buildRoster(positions: Position[], profiles: RosterProfile[], progress: RosterProgress[]): RosterRow[] {
  const slugById = new Map(positions.map((p) => [p.id, p.slug]));
  const byUserSlug = new Map<string, Partial<Record<PhaseId, WorkbookPhaseData>>>();
  for (const row of progress) {
    const key = `${row.user_id}|${row.position_slug}`;
    const entry = byUserSlug.get(key) ?? {};
    entry[row.phase] = row.data;
    byUserSlug.set(key, entry);
  }

  const active = positions
    .filter((p): p is Position & { slug: string } => p.is_active && !!p.slug)
    .sort((a, b) => teamRank(a.team) - teamRank(b.team) || a.sort_order - b.sort_order);

  const rows: RosterRow[] = [];
  for (const pos of active) {
    const base = {
      positionId: pos.id,
      slug: pos.slug,
      title: pos.title,
      team: pos.team,
      startPhase: phaseIdFromEnum(pos.phase),
      tier: pos.role_tier,
      isExec: pos.is_exec,
      openForApplications: pos.open_for_applications,
      maxHolders: pos.max_holders,
      reportsToSlug: pos.reports_to_position_id ? (slugById.get(pos.reports_to_position_id) ?? null) : null,
    };
    const holders = profiles
      .filter((pr) => pr.position_id === pos.id)
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
    if (holders.length === 0) {
      rows.push({ ...base, holder: null, progress: 0 });
      continue;
    }
    const role = workbookFor(pos.slug);
    for (const h of holders) {
      const byPhase = byUserSlug.get(`${h.id}|${pos.slug}`) ?? {};
      rows.push({
        ...base,
        holder: { id: h.id, fullName: h.full_name, email: h.email, avatarUrl: h.avatar_url },
        progress: role ? overallPercent(role, byPhase) : 0,
      });
    }
  }
  return rows;
}

export interface TeamReadiness {
  team: Team;
  total: number;
  filled: number;
  open: number;
  progress: number;
  starts: PhaseId[];
}

/** Per-team totals, sorted so the teams needing attention come first. */
export function teamReadiness(rows: RosterRow[]): TeamReadiness[] {
  const byTeam = new Map<Team, RosterRow[]>();
  for (const row of rows) byTeam.set(row.team, [...(byTeam.get(row.team) ?? []), row]);
  return [...byTeam.entries()]
    .map(([team, teamRows]) => {
      const filled = teamRows.filter((r) => r.holder).length;
      const starts = PHASE_IDS.filter((p) => teamRows.some((r) => r.startPhase === p));
      return {
        team,
        total: teamRows.length,
        filled,
        open: teamRows.length - filled,
        progress: Math.round(teamRows.reduce((sum, r) => sum + r.progress, 0) / teamRows.length),
        starts,
      };
    })
    .sort((a, b) => b.open - a.open || a.progress - b.progress);
}

export function attentionTeams(readiness: TeamReadiness[]): TeamReadiness[] {
  return readiness.filter((t) => t.open > 0 || t.progress < 35).slice(0, 4);
}

/** Milestones owned by everyone or by this team (owner labels are free text). */
export function teamDeadlines<T extends Pick<Milestone, "owner_label">>(milestones: T[], team: Team): T[] {
  const label = TEAM_LABELS[team].toLowerCase();
  return milestones.filter((m) => {
    const owner = (m.owner_label || "All Teams").toLowerCase();
    return owner === "all teams" || owner.includes(label);
  });
}
