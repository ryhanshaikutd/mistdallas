import type { AnnouncementAudience, PositionPhase, Priority, Team, UserRole } from './types'
import { PHASE_IDS, type PhaseId } from './workbook/types'

export { PHASE_IDS }
export type { PhaseId }

export const INTERNAL_EMAIL_DOMAIN = 'getmistified.com'

/** Roles that can review applications, manage interviews, cycles, seats, milestones and announcements. */
export const LEADERSHIP_ROLES: readonly string[] = ['regional_director', 'internal_ad', 'external_ad']
export const isLeadership = (role?: string | null) => !!role && LEADERSHIP_ROLES.includes(role)

/** Everyone on the board, i.e. every role except applicant. */
export const BOARD_ROLES: readonly string[] = [
  'regional_director', 'internal_ad', 'external_ad', 'director', 'chair', 'lead', 'member', 'dream_team',
]
export const isBoard = (role?: string | null) => !!role && BOARD_ROLES.includes(role)

export const DIRECTOR_PLUS: readonly string[] = [...LEADERSHIP_ROLES, 'director']
export const TEAM_MANAGERS: readonly string[] = [...DIRECTOR_PLUS, 'chair', 'lead']

export const TEAM_LABELS: Record<Team, string> = {
  exec: 'Executive',
  competitions: 'Competitions',
  logistics: 'Operations',
  dream_team: 'Dream Team',
  finance: 'Finance',
  pr: 'Marketing',
  sports: 'Sports',
  registration: 'Registration',
  programs: 'Programs',
}

/** Display order for team lists; exec first, then the handbook's order. */
export const TEAM_ORDER: Team[] = [
  'exec', 'competitions', 'pr', 'dream_team', 'logistics', 'finance', 'programs', 'registration', 'sports',
]

/** Portfolios: the handbook's reporting lines (Marketing reports to the Internal AD). */
export const AD_TEAMS: Record<'internal_ad' | 'external_ad', Team[]> = {
  internal_ad: ['competitions', 'pr', 'dream_team', 'logistics'],
  external_ad: ['finance', 'programs', 'registration', 'sports'],
}

export const PHASE_ENUM: Record<PhaseId, PositionPhase> = {
  foundations: 'FOUNDATIONS',
  build: 'BUILD',
  stabilization: 'STABILIZATION',
  execution: 'EXECUTION',
}
export const phaseIdFromEnum = (phase: PositionPhase): PhaseId => phase.toLowerCase() as PhaseId
export const PHASE_LABELS: Record<PhaseId, string> = {
  foundations: 'Foundations',
  build: 'Build',
  stabilization: 'Stabilization',
  execution: 'Execution',
}

export const ROLE_TIER_LABELS: Record<UserRole, string> = {
  regional_director: 'Regional Director',
  internal_ad: 'Internal AD',
  external_ad: 'External AD',
  director: 'Director',
  chair: 'Chair',
  lead: 'Lead',
  member: 'Member',
  dream_team: 'Dream Team',
  applicant: 'Applicant',
}

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'Everyone',
  board: 'Board members',
  leadership: 'Leadership',
  team: 'One team',
}

export const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#6B7280',
}

export const TIME_COMMITMENT_OPTIONS = [
  { value: '1-5', label: '1–5 hours a week' },
  { value: '6-10', label: '6–10 hours a week' },
  { value: '11-15', label: '11–15 hours a week' },
  { value: 'fulltime', label: "This is actually my newest full time job, what are the employee benefits?" },
]
