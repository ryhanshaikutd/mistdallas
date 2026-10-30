-- ─────────────────────────────────────────────────────────────────────────────
-- Handbook port, step 5 — 2026-10-29
--
-- Tournament-weekend operations and MyMIST staging tables, adopted from the
-- handbook's supabase-tournament-only.sql and supabase-mymist-only.sql with
-- the same columns, checks and indexes. Access is keyed on the profile role:
-- leadership manages everything, board members can read room/block data and
-- log NFC scans. The UI for these tables is a later phase; the schema is here
-- so it exists before event-week work starts. Every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Rooms ──────────────────────────────────────────────────────────────────
create table if not exists tournament_rooms (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tournament_rooms enable row level security;
drop policy if exists "Board can read tournament rooms" on tournament_rooms;
create policy "Board can read tournament rooms" on tournament_rooms for select using (public.is_board());
drop policy if exists "Leadership can manage tournament rooms" on tournament_rooms;
create policy "Leadership can manage tournament rooms" on tournament_rooms
  for all using (public.is_leadership()) with check (public.is_leadership());

create table if not exists room_availability (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references tournament_rooms(id) on delete cascade,
  available_date date not null,
  starts_at time not null,
  ends_at time not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists room_availability_room_date_idx on room_availability (room_id, available_date, starts_at);
alter table room_availability enable row level security;
drop policy if exists "Board can read room availability" on room_availability;
create policy "Board can read room availability" on room_availability for select using (public.is_board());
drop policy if exists "Leadership can manage room availability" on room_availability;
create policy "Leadership can manage room availability" on room_availability
  for all using (public.is_leadership()) with check (public.is_leadership());

-- 2. Competition blocks ─────────────────────────────────────────────────────
create table if not exists competition_blocks (
  id uuid primary key default gen_random_uuid(),
  competition_name text not null,
  round_label text not null default 'Round 1',
  division text,
  room_id text references tournament_rooms(id) on delete set null,
  block_date date not null,
  starts_at time not null,
  ends_at time not null,
  capacity integer not null default 0 check (capacity >= 0),
  judge_count integer not null default 0 check (judge_count >= 0),
  materials text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'locked', 'complete', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists competition_blocks_room_date_idx on competition_blocks (room_id, block_date, starts_at);
create index if not exists competition_blocks_competition_idx on competition_blocks (competition_name, block_date);
alter table competition_blocks enable row level security;
drop policy if exists "Board can read published competition blocks" on competition_blocks;
create policy "Board can read published competition blocks" on competition_blocks
  for select using (public.is_leadership() or (public.is_board() and status in ('scheduled', 'locked', 'complete')));
drop policy if exists "Leadership can manage competition blocks" on competition_blocks;
create policy "Leadership can manage competition blocks" on competition_blocks
  for all using (public.is_leadership()) with check (public.is_leadership());

-- 3. Students, entries, assignments ─────────────────────────────────────────
create table if not exists student_registrations (
  id uuid primary key default gen_random_uuid(),
  external_student_id text unique,
  full_name text not null,
  email text,
  school text,
  grade_level text,
  gender_label text,
  nfc_uid text unique,
  registration_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_registrations_nfc_uid_idx on student_registrations (nfc_uid);
create index if not exists student_registrations_school_idx on student_registrations (school);
alter table student_registrations enable row level security;
drop policy if exists "Leadership can manage student registrations" on student_registrations;
create policy "Leadership can manage student registrations" on student_registrations
  for all using (public.is_leadership()) with check (public.is_leadership());

create table if not exists student_competition_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_registrations(id) on delete cascade,
  competition_name text not null,
  division text,
  registration_status text not null default 'registered' check (registration_status in ('registered', 'waitlisted', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (student_id, competition_name, division)
);
create index if not exists student_competition_entries_competition_idx on student_competition_entries (competition_name, division);
alter table student_competition_entries enable row level security;
drop policy if exists "Leadership can manage student competition entries" on student_competition_entries;
create policy "Leadership can manage student competition entries" on student_competition_entries
  for all using (public.is_leadership()) with check (public.is_leadership());

create table if not exists room_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_registrations(id) on delete cascade,
  competition_block_id uuid not null references competition_blocks(id) on delete cascade,
  assignment_status text not null default 'assigned' check (assignment_status in ('assigned', 'checked_in', 'missed', 'excused', 'removed')),
  checked_in_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, competition_block_id)
);
create index if not exists room_assignments_block_idx on room_assignments (competition_block_id, assignment_status);
create index if not exists room_assignments_student_idx on room_assignments (student_id);
alter table room_assignments enable row level security;
drop policy if exists "Leadership can manage room assignments" on room_assignments;
create policy "Leadership can manage room assignments" on room_assignments
  for all using (public.is_leadership()) with check (public.is_leadership());

-- 4. NFC scan log ───────────────────────────────────────────────────────────
create table if not exists nfc_scan_logs (
  id bigserial primary key,
  nfc_uid text not null,
  student_id uuid references student_registrations(id) on delete set null,
  room_id text references tournament_rooms(id) on delete set null,
  competition_block_id uuid references competition_blocks(id) on delete set null,
  scan_type text not null default 'room_entry' check (scan_type in ('event_checkin', 'room_entry', 'room_exit', 'manual_override')),
  scan_result text not null default 'accepted' check (scan_result in ('accepted', 'unknown_tag', 'wrong_room', 'duplicate', 'manual_review')),
  scanned_by uuid references profiles(id) on delete set null,
  notes text,
  scanned_at timestamptz not null default now()
);
create index if not exists nfc_scan_logs_nfc_uid_idx on nfc_scan_logs (nfc_uid, scanned_at desc);
create index if not exists nfc_scan_logs_block_idx on nfc_scan_logs (competition_block_id, scanned_at desc);
alter table nfc_scan_logs enable row level security;
drop policy if exists "Leadership can read nfc scan logs" on nfc_scan_logs;
create policy "Leadership can read nfc scan logs" on nfc_scan_logs for select using (public.is_leadership());
drop policy if exists "Board can insert nfc scan logs" on nfc_scan_logs;
create policy "Board can insert nfc scan logs" on nfc_scan_logs for insert with check (public.is_board());
drop policy if exists "Leadership can update nfc scan logs" on nfc_scan_logs;
create policy "Leadership can update nfc scan logs" on nfc_scan_logs
  for update using (public.is_leadership()) with check (public.is_leadership());

-- 5. MyMIST staging ─────────────────────────────────────────────────────────
create table if not exists mymist_import_batches (
  id text primary key,
  source_name text not null,
  import_type text not null default 'participants',
  row_count integer not null default 0,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table mymist_import_batches enable row level security;
drop policy if exists "Leadership can manage mymist import batches" on mymist_import_batches;
create policy "Leadership can manage mymist import batches" on mymist_import_batches
  for all using (public.is_leadership()) with check (public.is_leadership());

create table if not exists mymist_participants (
  id uuid primary key default gen_random_uuid(),
  import_batch_id text references mymist_import_batches(id) on delete set null,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mymist_participants_school_idx on mymist_participants (school);
create index if not exists mymist_participants_nfc_idx on mymist_participants (nfc_uid);
create index if not exists mymist_participants_badge_idx on mymist_participants (badge_code);
alter table mymist_participants enable row level security;
drop policy if exists "Leadership can manage mymist participants" on mymist_participants;
create policy "Leadership can manage mymist participants" on mymist_participants
  for all using (public.is_leadership()) with check (public.is_leadership());

create table if not exists mymist_schools (
  id uuid primary key default gen_random_uuid(),
  school_name text not null unique,
  city text,
  state text,
  primary_contact text,
  contact_email text,
  participant_count integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table mymist_schools enable row level security;
drop policy if exists "Leadership can manage mymist schools" on mymist_schools;
create policy "Leadership can manage mymist schools" on mymist_schools
  for all using (public.is_leadership()) with check (public.is_leadership());

create table if not exists mymist_judges (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  competition_areas text[] not null default '{}'::text[],
  availability text,
  status text not null default 'prospect' check (status in ('prospect', 'confirmed', 'trained', 'cancelled')),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mymist_judges_email_idx on mymist_judges (email);
alter table mymist_judges enable row level security;
drop policy if exists "Leadership can manage mymist judges" on mymist_judges;
create policy "Leadership can manage mymist judges" on mymist_judges
  for all using (public.is_leadership()) with check (public.is_leadership());
