-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create type user_role as enum (
  'regional_director', 'internal_ad', 'external_ad',
  'director', 'chair', 'lead', 'member', 'dream_team', 'applicant'
);

create type team_type as enum (
  'competitions', 'logistics', 'dream_team',
  'finance', 'pr', 'sports', 'registration', 'programs'
);

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text not null default '',
  role user_role not null default 'applicant',
  team team_type,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Board can read all profiles" on profiles
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role != 'applicant'
    )
  );

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── POSITIONS ────────────────────────────────────────────────────────────────
create type position_phase as enum ('FOUNDATIONS', 'BUILD', 'STABILIZATION', 'EXECUTION');

create table positions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  phase position_phase not null,
  team team_type not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table positions enable row level security;
create policy "Everyone can read positions" on positions for select using (true);
create policy "RD can manage positions" on positions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'regional_director')
);

-- ─── RECRUITMENT CYCLES ───────────────────────────────────────────────────────
create type cycle_type as enum ('internal', 'external', 'closed');

create table recruitment_cycles (
  id uuid primary key default uuid_generate_v4(),
  year int not null,
  type cycle_type not null default 'closed',
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table recruitment_cycles enable row level security;
create policy "Board can read cycles" on recruitment_cycles for select using (
  exists (select 1 from profiles where id = auth.uid() and role != 'applicant')
);
create policy "Applicants can read open cycles" on recruitment_cycles for select using (
  type != 'closed'
);
create policy "RD and ADs can manage cycles" on recruitment_cycles for all using (
  exists (
    select 1 from profiles where id = auth.uid()
    and role in ('regional_director', 'internal_ad', 'external_ad')
  )
);

-- ─── APPLICATIONS ─────────────────────────────────────────────────────────────
create type application_status as enum (
  'submitted', 'under_review', 'interview_scheduled',
  'accepted', 'rejected', 'redirected_dream_team', 'offered_different_position'
);

create table applications (
  id uuid primary key default uuid_generate_v4(),
  cycle_id uuid references recruitment_cycles not null,
  applicant_id uuid references profiles not null,
  applicant_email text not null,
  applicant_name text not null,
  gender text not null check (gender in ('brother', 'sister')),
  still_in_school boolean not null,
  is_internal boolean not null default false,
  current_position_id uuid references positions,
  wants_position_change boolean,
  expected_time_commitment text not null,
  one_change_essay text not null,
  fell_short_essay text not null,
  why_mist text,
  relevant_experience text,
  understands_not_guaranteed boolean not null default false,
  understands_volunteering boolean not null default false,
  doing_for_allah boolean not null default false,
  will_be_professional boolean not null default false,
  understands_confidentiality boolean not null default false,
  will_attend_meetings boolean not null default false,
  willing_to_drive boolean not null default false,
  status application_status not null default 'submitted',
  alternate_position_id uuid references positions,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table applications enable row level security;

create policy "Applicants can read own applications" on applications
  for select using (applicant_id = auth.uid());

create policy "Applicants can insert own applications" on applications
  for insert with check (applicant_id = auth.uid());

create policy "RD and ADs can read all applications" on applications
  for select using (
    exists (
      select 1 from profiles where id = auth.uid()
      and role in ('regional_director', 'internal_ad', 'external_ad')
    )
  );

create policy "RD and ADs can update applications" on applications
  for update using (
    exists (
      select 1 from profiles where id = auth.uid()
      and role in ('regional_director', 'internal_ad', 'external_ad')
    )
  );

-- ─── APPLICATION RANKINGS ─────────────────────────────────────────────────────
create table application_rankings (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid references applications on delete cascade not null,
  position_id uuid references positions not null,
  rank int not null check (rank between 1 and 3),
  unique (application_id, rank)
);

alter table application_rankings enable row level security;
create policy "Applicants can manage own rankings" on application_rankings
  for all using (
    exists (select 1 from applications where id = application_id and applicant_id = auth.uid())
  );
create policy "RD and ADs can read rankings" on application_rankings for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('regional_director', 'internal_ad', 'external_ad'))
);

-- ─── REVIEWER NOTES ───────────────────────────────────────────────────────────
create table reviewer_notes (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid references applications on delete cascade not null,
  reviewer_id uuid references profiles not null,
  note text not null,
  knows_applicant boolean not null default false,
  knows_applicant_context text,
  created_at timestamptz not null default now()
);

alter table reviewer_notes enable row level security;
create policy "RD and ADs can manage reviewer notes" on reviewer_notes for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('regional_director', 'internal_ad', 'external_ad'))
);

-- ─── INTERVIEW SLOTS ──────────────────────────────────────────────────────────
create table interview_slots (
  id uuid primary key default uuid_generate_v4(),
  cycle_id uuid references recruitment_cycles not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table interview_slots enable row level security;
create policy "Board can manage slots" on interview_slots for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('regional_director', 'internal_ad', 'external_ad'))
);
create policy "Applicants can read available slots" on interview_slots
  for select using (not is_booked);

-- ─── INTERVIEW BOOKINGS ───────────────────────────────────────────────────────
create table interview_bookings (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid references applications on delete cascade not null unique,
  slot_id uuid references interview_slots not null unique,
  meet_link text,
  calendar_event_id text,
  created_at timestamptz not null default now()
);

alter table interview_bookings enable row level security;
create policy "Applicants can read own bookings" on interview_bookings for select using (
  exists (select 1 from applications where id = application_id and applicant_id = auth.uid())
);
create policy "Applicants can insert own bookings" on interview_bookings for insert with check (
  exists (select 1 from applications where id = application_id and applicant_id = auth.uid())
);
create policy "Board can manage all bookings" on interview_bookings for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('regional_director', 'internal_ad', 'external_ad'))
);

-- ─── TASKS ────────────────────────────────────────────────────────────────────
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high');

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  team team_type not null,
  assigned_to uuid references profiles,
  assigned_by uuid references profiles not null,
  due_date date,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  parent_task_id uuid references tasks,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "Board members can read their team tasks" on tasks for select using (
  exists (
    select 1 from profiles p where p.id = auth.uid()
    and (
      p.role in ('regional_director', 'internal_ad', 'external_ad')
      or p.team = tasks.team
    )
  )
);

create policy "Directors and above can manage tasks" on tasks for all using (
  exists (
    select 1 from profiles p where p.id = auth.uid()
    and (
      p.role in ('regional_director', 'internal_ad', 'external_ad', 'director')
      or (p.role in ('chair', 'lead') and p.team = tasks.team)
    )
  )
);

-- ─── MILESTONES ───────────────────────────────────────────────────────────────
create table milestones (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  target_date date,
  is_recurring boolean not null default true,
  team team_type,
  created_at timestamptz not null default now()
);

alter table milestones enable row level security;
create policy "Board can read milestones" on milestones for select using (
  exists (select 1 from profiles where id = auth.uid() and role != 'applicant')
);
create policy "RD and ADs can manage milestones" on milestones for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('regional_director', 'internal_ad', 'external_ad'))
);

-- ─── ATTENDANCE RECORDS ───────────────────────────────────────────────────────
create table attendance_records (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  event_date date not null,
  attendee_name text not null,
  attendee_email text,
  school text,
  category text,
  team team_type,
  cycle_year int not null,
  uploaded_at timestamptz not null default now()
);

alter table attendance_records enable row level security;
create policy "Board can read attendance" on attendance_records for select using (
  exists (select 1 from profiles where id = auth.uid() and role != 'applicant')
);
create policy "RD and ADs can manage attendance" on attendance_records for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('regional_director', 'internal_ad', 'external_ad'))
);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_updated_at before update on applications
  for each row execute procedure update_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute procedure update_updated_at();
