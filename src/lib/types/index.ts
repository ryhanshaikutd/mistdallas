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
  | 'competitions'
  | 'logistics'
  | 'dream_team'
  | 'finance'
  | 'pr'
  | 'sports'
  | 'registration'
  | 'programs'

export type PositionPhase = 'FOUNDATIONS' | 'BUILD' | 'STABILIZATION' | 'EXECUTION'

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
  avatar_url: string | null
  theme: 'light' | 'dark'
  nav_style: 'sidebar' | 'topnav'
  onboarded: boolean
  created_at: string
}

export interface Position {
  id: string
  title: string
  phase: PositionPhase
  team: Team
  description: string | null
  is_active: boolean
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
  title: string
  description: string | null
  target_date: string | null
  is_recurring: boolean
  team: Team | null
  created_at: string
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
