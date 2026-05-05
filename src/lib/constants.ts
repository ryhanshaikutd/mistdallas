import type { Position, Team } from './types'

export const INTERNAL_EMAIL_DOMAIN = 'getmistified.com'

export const MIST_COLORS = {
  navy: '#1B3464',
  blue: '#2E7BC4',
  lightBlue: '#90C8EA',
  green: '#1A6B3C',
  midGreen: '#2EA87A',
  mint: '#7ADBB8',
  charcoal: '#2D2F3A',
}

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

export const POSITIONS: Omit<Position, 'id' | 'description' | 'is_active'>[] = [
  { title: 'Regional Director', phase: 'FOUNDATIONS', team: 'logistics' },
  { title: 'Internal Associate Director', phase: 'FOUNDATIONS', team: 'logistics' },
  { title: 'External Associate Director', phase: 'FOUNDATIONS', team: 'logistics' },
  { title: 'Registration Director', phase: 'FOUNDATIONS', team: 'registration' },
  { title: 'Sports Director', phase: 'FOUNDATIONS', team: 'sports' },
  { title: 'Sisters Sports Lead', phase: 'BUILD', team: 'sports' },
  { title: 'Brothers Sports Lead', phase: 'BUILD', team: 'sports' },
  { title: 'eSports Chair', phase: 'STABILIZATION', team: 'sports' },
  { title: 'Ops Director 1 — Command Center Lead', phase: 'FOUNDATIONS', team: 'logistics' },
  { title: 'Ops Director 2 — Communications Lead', phase: 'FOUNDATIONS', team: 'logistics' },
  { title: 'Food & Safety Chair', phase: 'BUILD', team: 'logistics' },
  { title: 'Competitions Director', phase: 'FOUNDATIONS', team: 'competitions' },
  { title: 'Judges Chair', phase: 'BUILD', team: 'competitions' },
  { title: 'Brackets Lead', phase: 'STABILIZATION', team: 'competitions' },
  { title: 'Writing & Oratory Zone Lead', phase: 'BUILD', team: 'competitions' },
  { title: 'Arts Zone Lead', phase: 'BUILD', team: 'competitions' },
  { title: 'Group Comps Zone Lead', phase: 'BUILD', team: 'competitions' },
  { title: 'Knowledge & Quran Zone Lead', phase: 'BUILD', team: 'competitions' },
  { title: 'Dream Team Director', phase: 'FOUNDATIONS', team: 'dream_team' },
  { title: 'Recruitment Lead', phase: 'BUILD', team: 'dream_team' },
  { title: 'Training & Development Lead', phase: 'BUILD', team: 'dream_team' },
  { title: 'Dream Team Member', phase: 'EXECUTION', team: 'dream_team' },
  { title: 'PR Director', phase: 'FOUNDATIONS', team: 'pr' },
  { title: 'Graphics Chair', phase: 'BUILD', team: 'pr' },
  { title: 'Marketing Chair', phase: 'BUILD', team: 'pr' },
  { title: 'Programs Director', phase: 'FOUNDATIONS', team: 'programs' },
  { title: 'Awards & Ceremonies Chair', phase: 'STABILIZATION', team: 'programs' },
  { title: 'Workshops Chair', phase: 'STABILIZATION', team: 'programs' },
  { title: 'Finance Director', phase: 'FOUNDATIONS', team: 'finance' },
  { title: 'Sponsorships Chair', phase: 'BUILD', team: 'finance' },
]

export const PHASE_COLORS: Record<string, string> = {
  FOUNDATIONS: 'bg-navy-100 text-navy-800',
  BUILD: 'bg-blue-100 text-blue-800',
  STABILIZATION: 'bg-green-100 text-green-800',
  EXECUTION: 'bg-mint-100 text-mint-800',
}

export const TIME_COMMITMENT_OPTIONS = [
  { value: '1-5', label: '1–5 hours a week' },
  { value: '6-10', label: '6–10 hours a week' },
  { value: '11-15', label: '11–15 hours a week' },
  { value: 'fulltime', label: "This is actually my newest full time job, what are the employee benefits?" },
]

export const RECURRING_MILESTONES = [
  { title: 'Board Kickoff Dinner', team: null },
  { title: 'MockMist', team: null },
  { title: 'Board Photoshoot', team: null },
  { title: 'Sponsorship Outreach Deadline', team: 'finance' },
  { title: 'Registration Opens', team: 'registration' },
  { title: 'Registration Closes', team: 'registration' },
  { title: 'Tournament Day', team: null },
]
