import type { PhaseId } from "../workbook/types";
import type { WorkbookPhaseData } from "../workbook/progress";

export type UserRole =
  | 'regional_director'
  | 'internal_ad'
  | 'external_ad'
  | 'director'
  | 'chair'
  | 'lead'
  | 'member'
  | 'dream_team'
  | 'applicant'

export type Team =
  | 'exec'
  | 'competitions'
  | 'logistics'
  | 'dream_team'
  | 'finance'
  | 'pr'
  | 'sports'
  | 'registration'
  | 'programs'

export type PositionPhase = 'FOUNDATIONS' | 'BUILD' | 'STABILIZATION' | 'EXECUTION'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'interview_scheduled'
  | 'accepted'
  | 'rejected'
  | 'redirected_dream_team'
  | 'offered_different_position'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type RecruitmentCycleType = 'internal' | 'external' | 'closed'

export interface Profile {
  id: string
  email: string
  full_name: string
  preferred_name: string | null
  fun_fact: string | null
  role: UserRole
  team: Team | null
  position_id: string | null
  avatar_url: string | null
  theme: 'light' | 'dark'
  nav_style: 'sidebar' | 'topnav'
  onboarded: boolean
  created_at: string
}

export interface Position {
  id: string
  slug: string | null
  title: string
  phase: PositionPhase
  team: Team
  description: string | null
  is_active: boolean
  reports_to_position_id: string | null
  role_tier: UserRole
  is_exec: boolean
  open_for_applications: boolean
  max_holders: number | null
  sort_order: number
}

export interface SeasonSettings {
  year: number
  tournament_start: string
  tournament_end: string
  applications_due: string | null
  foundations_start: string
  build_start: string
  stabilization_start: string
  execution_start: string
  season_end: string
  is_current: boolean
}

export interface RecruitmentCycle {
  id: string
  year: number
  type: RecruitmentCycleType
  opened_at: string | null
  closed_at: string | null
  created_at: string
}

export interface Application {
  id: string
  cycle_id: string
  applicant_id: string
  applicant_email: string
  applicant_name: string
  gender: 'brother' | 'sister'
  still_in_school: boolean
  is_internal: boolean
  current_position_id: string | null
  wants_position_change: boolean | null
  expected_time_commitment: string
  one_change_essay: string
  fell_short_essay: string
  // External only
  why_mist: string | null
  relevant_experience: string | null
  // Commitments
  understands_not_guaranteed: boolean
  understands_volunteering: boolean
  doing_for_allah: boolean
  will_be_professional: boolean
  understands_confidentiality: boolean
  will_attend_meetings: boolean
  willing_to_drive: boolean
  status: ApplicationStatus
  alternate_position_id: string | null
  reviewer_notes: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationRanking {
  id: string
  application_id: string
  position_id: string
  rank: number
  position?: Position
}

export interface ReviewerNote {
  id: string
  application_id: string
  reviewer_id: string
  note: string
  knows_applicant: boolean
  knows_applicant_context: string | null
  created_at: string
  reviewer?: Profile
}

export interface InterviewSlot {
  id: string
  cycle_id: string
  starts_at: string
  ends_at: string
  is_booked: boolean
  created_at: string
}

export interface InterviewBooking {
  id: string
  application_id: string
  slot_id: string
  meet_link: string | null
  calendar_event_id: string | null
  created_at: string
  slot?: InterviewSlot
  application?: Application
}

export interface Task {
  id: string
  title: string
  description: string | null
  team: Team
  assigned_to: string | null
  assigned_by: string
  due_date: string | null
  status: TaskStatus
  priority: TaskPriority
  parent_task_id: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
  assigner?: Profile
  subtasks?: Task[]
}

export interface Milestone {
  id: string
  legacy_id: string | null
  title: string
  description: string | null
  target_date: string | null
  date_label: string | null
  phase: PositionPhase | null
  priority: Priority
  deadline_type: string
  owner_label: string
  send_reminders: boolean
  is_recurring: boolean
  team: Team | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AnnouncementAudience = 'all' | 'board' | 'leadership' | 'team'

export interface Announcement {
  id: string
  legacy_id: string | null
  title: string
  body: string
  audience: AnnouncementAudience
  audience_team: Team | null
  priority: Priority
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WorkbookProgressRow {
  user_id: string
  position_slug: string
  phase: PhaseId
  data: WorkbookPhaseData
  percent_complete: number
  updated_at: string
}

export type ReminderLeadTime = 1 | 3 | 7 | 14

export interface ReminderPreference {
  user_id: string
  email_enabled: boolean
  days_before: ReminderLeadTime
  created_at: string
  updated_at: string
}

export interface MeetingNote {
  id: string
  title: string
  meeting_date: string
  team: Team | null
  agenda: string
  blockers: string
  action_items: string
  created_by: string | null
  created_at: string
  updated_at: string
  author?: Pick<Profile, 'id' | 'full_name'> | null
}

export const DECISION_CATEGORIES = [
  'General', 'Budget', 'Venue', 'Roles', 'Competitions', 'Marketing', 'Programs', 'Registration', 'Sports', 'Event Weekend',
] as const
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number]

export interface Decision {
  id: string
  title: string
  category: DecisionCategory
  decision: string
  rationale: string
  owner_label: string
  team: Team | null
  decided_on: string
  created_by: string | null
  created_at: string
  updated_at: string
  author?: Pick<Profile, 'id' | 'full_name'> | null
}

export interface FeedbackTheme {
  id: string
  slug: string | null
  theme: string
  source: string
  sentiment: string
  owner_label: string
  phase: PositionPhase | null
  status: string
  color: string | null
  action: string
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LegacySeatAssignment {
  email: string
  full_name: string | null
  position_slug: string | null
  is_admin: boolean
  source: string
  created_at: string
  applied_at: string | null
}

export interface AttendanceRecord {
  id: string
  event_name: string
  event_date: string
  attendee_name: string
  attendee_email: string | null
  school: string | null
  category: string | null
  team: Team | null
  uploaded_at: string
  cycle_year: number
}
