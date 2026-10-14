import type { Team } from './types'

export const INTERNAL_EMAIL_DOMAIN = 'getmistified.com'

/** Roles that can review applications, manage interviews, cycles and milestones. */
export const LEADERSHIP_ROLES: readonly string[] = ['regional_director', 'internal_ad', 'external_ad']
export const isLeadership = (role?: string | null) => !!role && LEADERSHIP_ROLES.includes(role)

export const TEAM_LABELS: Record<Team, string> = {
  competitions: 'Competitions',
  logistics: 'Logistics',
  dream_team: 'Dream Team',
  finance: 'Finance',
  pr: 'PR',
  sports: 'Sports',
  registration: 'Registration',
  programs: 'Programs',
}

export const AD_TEAMS: Record<'internal_ad' | 'external_ad', Team[]> = {
  internal_ad: ['competitions', 'dream_team', 'logistics'],
  external_ad: ['registration', 'sports', 'programs', 'finance', 'pr'],
}

export const TIME_COMMITMENT_OPTIONS = [
  { value: '1-5', label: '1–5 hours a week' },
  { value: '6-10', label: '6–10 hours a week' },
  { value: '11-15', label: '11–15 hours a week' },
  { value: 'fulltime', label: "This is actually my newest full time job, what are the employee benefits?" },
]

