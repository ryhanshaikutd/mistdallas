create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role_id text,
  team text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create unique index if not exists profiles_role_id_unique
on public.profiles (role_id)
where role_id is not null;

drop policy if exists "users can view all profiles" on public.profiles;
create policy "users can view all profiles"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "admins can update any profile" on public.profiles;
create policy "admins can update any profile"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
);

drop policy if exists "admins can insert profiles" on public.profiles;
create policy "admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
);

create table if not exists public.announcements (
  id text primary key,
  title text not null,
  body text not null default '',
  audience text not null default 'all',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.announcements enable row level security;

drop policy if exists "anyone can view active announcements" on public.announcements;
create policy "anyone can view active announcements"
on public.announcements
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admins can manage announcements" on public.announcements;
create policy "admins can manage announcements"
on public.announcements
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

insert into public.announcements (id, title, body, audience, priority, is_active)
values
  ('welcome', 'Welcome to the MIST Dallas 2027 portal', 'Use this space to find roles, apply, track planning phases, and keep team work organized in one place.', 'all', 'medium', true)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  audience = excluded.audience,
  priority = excluded.priority,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.role_applications (
  id uuid primary key default gen_random_uuid(),
  role_id text not null,
  full_name text not null,
  email text not null,
  phone text,
  experience text not null default '',
  availability text not null default '',
  selected_roles text[] not null default '{}'::text[],
  responses jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.role_applications add column if not exists selected_roles text[] not null default '{}'::text[];
alter table public.role_applications add column if not exists responses jsonb not null default '{}'::jsonb;

alter table public.role_applications enable row level security;

drop policy if exists "anyone can submit role applications" on public.role_applications;
create policy "anyone can submit role applications"
on public.role_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "anyone can check limited application status" on public.role_applications;
create policy "anyone can check limited application status"
on public.role_applications
for select
to anon, authenticated
using (true);

drop policy if exists "admins can view role applications" on public.role_applications;
create policy "admins can view role applications"
on public.role_applications
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

drop policy if exists "admins can update role applications" on public.role_applications;
create policy "admins can update role applications"
on public.role_applications
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

drop policy if exists "admins can delete role applications" on public.role_applications;
create policy "admins can delete role applications"
on public.role_applications
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.workbook_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null,
  data jsonb not null default '{}'::jsonb,
  percent_complete integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, phase)
);

alter table public.workbook_progress enable row level security;

drop policy if exists "users can view all workbook progress" on public.workbook_progress;
create policy "users can view all workbook progress"
on public.workbook_progress
for select
to anon, authenticated
using (true);

drop policy if exists "users can insert own workbook progress" on public.workbook_progress;
create policy "users can insert own workbook progress"
on public.workbook_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own workbook progress" on public.workbook_progress;
create policy "users can update own workbook progress"
on public.workbook_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.deadline_events (
  id text primary key,
  title text not null,
  detail text not null default '',
  phase text not null check (phase in ('foundations', 'build', 'stabilization', 'execution')),
  due_date date not null,
  date_label text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  deadline_type text not null default 'Deadline',
  owner_label text not null default 'All Teams',
  send_reminders boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deadline_events add column if not exists priority text not null default 'medium';
alter table public.deadline_events add column if not exists deadline_type text not null default 'Deadline';
alter table public.deadline_events add column if not exists owner_label text not null default 'All Teams';

alter table public.deadline_events enable row level security;

drop policy if exists "anyone can view deadline events" on public.deadline_events;
create policy "anyone can view deadline events"
on public.deadline_events
for select
to anon, authenticated
using (true);

drop policy if exists "admins can manage deadline events" on public.deadline_events;
create policy "admins can manage deadline events"
on public.deadline_events
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

insert into public.deadline_events (id, title, detail, phase, due_date, date_label, priority, deadline_type, owner_label, send_reminders)
values
  ('foundations-core-roles', 'Core roles claimed', 'RD, ADs, directors, and foundational leads are claimed in the portal.', 'foundations', '2026-09-15', 'Sep 15', 'high', 'Onboarding', 'Executive', true),
  ('foundations-checkin', 'Foundations check-in', 'Team structures, communication norms, and first planning priorities are drafted.', 'foundations', '2026-09-30', 'Sep 30', 'medium', 'Review', 'All Teams', true),
  ('build-roles-onboarded', 'Build roles onboarded', 'Build-phase chairs and leads are claimed and briefed on first deliverables.', 'build', '2026-10-15', 'Oct 15', 'high', 'Onboarding', 'All Teams', true),
  ('build-mid-review', 'Mid-build progress review', 'Venue, registration, competitions, PR, sponsorship, and DT progress are reviewed.', 'build', '2026-11-15', 'Nov 15', 'medium', 'Review', 'All Teams', true),
  ('stabilization-roles', 'Stabilization roles onboarded', 'December roles are claimed and readiness gaps are assigned owners.', 'stabilization', '2026-12-01', 'Dec 1', 'high', 'Onboarding', 'All Teams', true),
  ('stabilization-lock', 'Schedules and rosters locked', 'Major schedules, rosters, brackets, and staffing plans are ready for execution prep.', 'stabilization', '2026-12-20', 'Dec 20', 'critical', 'Planning', 'All Teams', true),
  ('execution-training', 'Execution training complete', 'Dream Team and event-day operators complete walkthroughs and escalation training.', 'execution', '2027-01-10', 'Jan 10', 'high', 'Training', 'Dream Team', true),
  ('execution-run-show', 'Final run-of-show confirmed', 'Command Center, communications, and all team leads confirm event-week readiness.', 'execution', '2027-01-20', 'Event Week', 'critical', 'Event Week', 'All Teams', true)
on conflict (id) do update set
  title = excluded.title,
  detail = excluded.detail,
  phase = excluded.phase,
  due_date = excluded.due_date,
  date_label = excluded.date_label,
  priority = excluded.priority,
  deadline_type = excluded.deadline_type,
  owner_label = excluded.owner_label,
  send_reminders = excluded.send_reminders,
  updated_at = now();

create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  days_before integer not null default 7 check (days_before in (1, 3, 7, 14)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reminder_preferences enable row level security;

drop policy if exists "users can view own reminder preferences" on public.reminder_preferences;
create policy "users can view own reminder preferences"
on public.reminder_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own reminder preferences" on public.reminder_preferences;
create policy "users can insert own reminder preferences"
on public.reminder_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own reminder preferences" on public.reminder_preferences;
create policy "users can update own reminder preferences"
on public.reminder_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.reminder_deliveries (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deadline_id text not null references public.deadline_events(id) on delete cascade,
  reminder_date date not null default current_date,
  sent_at timestamptz not null default now(),
  unique (user_id, deadline_id, reminder_date)
);

alter table public.reminder_deliveries enable row level security;

drop policy if exists "admins can view reminder deliveries" on public.reminder_deliveries;
create policy "admins can view reminder deliveries"
on public.reminder_deliveries
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

-- Weekend Tournament Manager setup
-- Paste this into Supabase SQL Editor when you are ready to make the
-- room, competition, student placement, and NFC check-in system live.

create table if not exists public.tournament_rooms (
  id text primary key,
  room_name text not null,
  building text,
  floor_label text,
  capacity integer not null default 0 check (capacity >= 0),
  room_type text not null default 'Competition Room',
  privacy_notes text,
  av_notes text,
  setup_notes text,
  room_captain_role text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tournament_rooms enable row level security;

drop policy if exists "anyone can view active tournament rooms" on public.tournament_rooms;
create policy "anyone can view active tournament rooms"
on public.tournament_rooms
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admins can manage tournament rooms" on public.tournament_rooms;
create policy "admins can manage tournament rooms"
on public.tournament_rooms
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.room_availability (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.tournament_rooms(id) on delete cascade,
  available_date date not null,
  starts_at time not null,
  ends_at time not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (ends_at > starts_at)
);

create index if not exists room_availability_room_date_idx
on public.room_availability (room_id, available_date, starts_at);

alter table public.room_availability enable row level security;

drop policy if exists "anyone can view room availability" on public.room_availability;
create policy "anyone can view room availability"
on public.room_availability
for select
to anon, authenticated
using (true);

drop policy if exists "admins can manage room availability" on public.room_availability;
create policy "admins can manage room availability"
on public.room_availability
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.competition_blocks (
  id uuid primary key default gen_random_uuid(),
  competition_name text not null,
  round_label text not null default 'Round 1',
  division text,
  room_id text references public.tournament_rooms(id) on delete set null,
  block_date date not null,
  starts_at time not null,
  ends_at time not null,
  capacity integer not null default 0 check (capacity >= 0),
  judge_count integer not null default 0 check (judge_count >= 0),
  materials text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'locked', 'complete', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (ends_at > starts_at)
);

create index if not exists competition_blocks_room_date_idx
on public.competition_blocks (room_id, block_date, starts_at);

create index if not exists competition_blocks_competition_idx
on public.competition_blocks (competition_name, block_date);

alter table public.competition_blocks enable row level security;

drop policy if exists "anyone can view scheduled competition blocks" on public.competition_blocks;
create policy "anyone can view scheduled competition blocks"
on public.competition_blocks
for select
to anon, authenticated
using (status in ('scheduled', 'locked', 'complete'));

drop policy if exists "admins can manage competition blocks" on public.competition_blocks;
create policy "admins can manage competition blocks"
on public.competition_blocks
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.student_registrations (
  id uuid primary key default gen_random_uuid(),
  external_student_id text unique,
  full_name text not null,
  email text,
  school text,
  grade_level text,
  gender_label text,
  nfc_uid text unique,
  registration_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists student_registrations_nfc_uid_idx
on public.student_registrations (nfc_uid);

create index if not exists student_registrations_school_idx
on public.student_registrations (school);

alter table public.student_registrations enable row level security;

drop policy if exists "admins can manage student registrations" on public.student_registrations;
create policy "admins can manage student registrations"
on public.student_registrations
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.student_competition_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_registrations(id) on delete cascade,
  competition_name text not null,
  division text,
  registration_status text not null default 'registered' check (registration_status in ('registered', 'waitlisted', 'withdrawn')),
  created_at timestamptz default now(),
  unique (student_id, competition_name, division)
);

create index if not exists student_competition_entries_competition_idx
on public.student_competition_entries (competition_name, division);

alter table public.student_competition_entries enable row level security;

drop policy if exists "admins can manage student competition entries" on public.student_competition_entries;
create policy "admins can manage student competition entries"
on public.student_competition_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_registrations(id) on delete cascade,
  competition_block_id uuid not null references public.competition_blocks(id) on delete cascade,
  assignment_status text not null default 'assigned' check (assignment_status in ('assigned', 'checked_in', 'missed', 'excused', 'removed')),
  checked_in_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, competition_block_id)
);

create index if not exists room_assignments_block_idx
on public.room_assignments (competition_block_id, assignment_status);

create index if not exists room_assignments_student_idx
on public.room_assignments (student_id);

alter table public.room_assignments enable row level security;

drop policy if exists "admins can manage room assignments" on public.room_assignments;
create policy "admins can manage room assignments"
on public.room_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.nfc_scan_logs (
  id bigserial primary key,
  nfc_uid text not null,
  student_id uuid references public.student_registrations(id) on delete set null,
  room_id text references public.tournament_rooms(id) on delete set null,
  competition_block_id uuid references public.competition_blocks(id) on delete set null,
  scan_type text not null default 'room_entry' check (scan_type in ('event_checkin', 'room_entry', 'room_exit', 'manual_override')),
  scan_result text not null default 'accepted' check (scan_result in ('accepted', 'unknown_tag', 'wrong_room', 'duplicate', 'manual_review')),
  scanned_by uuid references auth.users(id) on delete set null,
  notes text,
  scanned_at timestamptz not null default now()
);

create index if not exists nfc_scan_logs_nfc_uid_idx
on public.nfc_scan_logs (nfc_uid, scanned_at desc);

create index if not exists nfc_scan_logs_block_idx
on public.nfc_scan_logs (competition_block_id, scanned_at desc);

alter table public.nfc_scan_logs enable row level security;

drop policy if exists "admins can view nfc scan logs" on public.nfc_scan_logs;
create policy "admins can view nfc scan logs"
on public.nfc_scan_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

drop policy if exists "authenticated organizers can insert nfc scan logs" on public.nfc_scan_logs;
create policy "authenticated organizers can insert nfc scan logs"
on public.nfc_scan_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role_id is not null
  )
);

drop policy if exists "admins can manage nfc scan logs" on public.nfc_scan_logs;
create policy "admins can manage nfc scan logs"
on public.nfc_scan_logs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

insert into public.tournament_rooms (id, room_name, building, floor_label, capacity, room_type, privacy_notes, av_notes, setup_notes, room_captain_role, is_active)
values
  ('sample-main-auditorium', 'Main Auditorium', 'Venue TBD', 'Level 1', 450, 'Ceremony / Large Competition', 'Public mixed seating', 'Projector, microphones, sound board', 'Needs early access and stage manager', 'Operations Director', true),
  ('sample-room-101', 'Room 101', 'Venue TBD', 'Level 1', 40, 'Competition Room', 'Standard room', 'Projector preferred', 'Classroom setup', 'Competitions Director', true),
  ('sample-room-102', 'Room 102', 'Venue TBD', 'Level 1', 40, 'Competition Room', 'Standard room', 'Projector preferred', 'Classroom setup', 'Competitions Director', true),
  ('sample-sisters-space', 'Sisters Sports / Private Space', 'Venue TBD', 'TBD', 80, 'Private / Sports', 'Sisters-only access when scheduled', 'Depends on venue', 'Privacy signage required', 'Sports Director', true)
on conflict (id) do update set
  room_name = excluded.room_name,
  building = excluded.building,
  floor_label = excluded.floor_label,
  capacity = excluded.capacity,
  room_type = excluded.room_type,
  privacy_notes = excluded.privacy_notes,
  av_notes = excluded.av_notes,
  setup_notes = excluded.setup_notes,
  room_captain_role = excluded.room_captain_role,
  is_active = excluded.is_active,
  updated_at = now();

-- MyMIST Integration Center setup
-- Run this when you want to stage MyMIST exports inside the portal.

create table if not exists public.mymist_import_batches (
  id text primary key,
  source_name text not null,
  import_type text not null default 'participants',
  row_count integer not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.mymist_import_batches enable row level security;

drop policy if exists "admins can manage mymist import batches" on public.mymist_import_batches;
create policy "admins can manage mymist import batches"
on public.mymist_import_batches
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.mymist_participants (
  id uuid primary key default gen_random_uuid(),
  import_batch_id text references public.mymist_import_batches(id) on delete set null,
  external_participant_id text unique,
  full_name text not null,
  email text,
  school text,
  grade_level text,
  gender_label text,
  competitions text[] not null default '{}'::text[],
  badge_code text unique,
  nfc_uid text unique,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists mymist_participants_school_idx
on public.mymist_participants (school);

create index if not exists mymist_participants_nfc_idx
on public.mymist_participants (nfc_uid);

create index if not exists mymist_participants_badge_idx
on public.mymist_participants (badge_code);

alter table public.mymist_participants enable row level security;

drop policy if exists "admins can manage mymist participants" on public.mymist_participants;
create policy "admins can manage mymist participants"
on public.mymist_participants
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.mymist_schools (
  id uuid primary key default gen_random_uuid(),
  school_name text not null unique,
  city text,
  state text,
  primary_contact text,
  contact_email text,
  participant_count integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.mymist_schools enable row level security;

drop policy if exists "admins can manage mymist schools" on public.mymist_schools;
create policy "admins can manage mymist schools"
on public.mymist_schools
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table if not exists public.mymist_judges (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  competition_areas text[] not null default '{}'::text[],
  availability text,
  status text not null default 'prospect' check (status in ('prospect', 'confirmed', 'trained', 'cancelled')),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists mymist_judges_email_idx
on public.mymist_judges (email);

alter table public.mymist_judges enable row level security;

drop policy if exists "admins can manage mymist judges" on public.mymist_judges;
create policy "admins can manage mymist judges"
on public.mymist_judges
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'general',
  user_id uuid references auth.users(id) on delete cascade,
  user_name text not null,
  body text not null,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "Read messages" on messages for select using (auth.role() = 'authenticated');
create policy "Insert own messages" on messages for insert with check (auth.uid() = user_id);

-- The live project dropped this when it allowed several holders per role (two Marketing Coordinators exist).
drop index if exists profiles_role_id_unique;
