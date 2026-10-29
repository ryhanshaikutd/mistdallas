-- ─────────────────────────────────────────────────────────────────────────────
-- Handbook port, step 4 — 2026-10-29
--
-- Meeting notes and the decision log (the handbook kept these in
-- localStorage), plus feedback themes. Every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helpers ────────────────────────────────────────────────────────────────
create or replace function public.current_user_team()
returns team_type language sql stable security definer set search_path = public as $$
  select team from profiles where id = auth.uid();
$$;
revoke all on function public.current_user_team() from public;
grant execute on function public.current_user_team() to authenticated, anon;

-- Leadership writes anywhere; directors, chairs and leads write for their own team.
create or replace function public.can_write_team(t team_type)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_leadership()
      or (public.current_user_role() in ('director', 'chair', 'lead')
          and t is not null
          and t = public.current_user_team());
$$;
revoke all on function public.can_write_team(team_type) from public;
grant execute on function public.can_write_team(team_type) to authenticated, anon;

-- 2. Meeting notes ──────────────────────────────────────────────────────────
create table if not exists meeting_notes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  meeting_date date not null,
  team team_type,
  agenda text not null default '',
  blockers text not null default '',
  action_items text not null default '',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meeting_notes_date_idx on meeting_notes (meeting_date desc);
drop trigger if exists meeting_notes_updated_at on meeting_notes;
create trigger meeting_notes_updated_at before update on meeting_notes
  for each row execute procedure update_updated_at();

alter table meeting_notes enable row level security;
drop policy if exists "Board can read meeting notes" on meeting_notes;
create policy "Board can read meeting notes" on meeting_notes for select using (public.is_board());
drop policy if exists "Team managers can insert meeting notes" on meeting_notes;
create policy "Team managers can insert meeting notes" on meeting_notes for insert with check (public.can_write_team(team));
drop policy if exists "Team managers can update meeting notes" on meeting_notes;
create policy "Team managers can update meeting notes" on meeting_notes
  for update using (public.can_write_team(team)) with check (public.can_write_team(team));
drop policy if exists "Team managers can delete meeting notes" on meeting_notes;
create policy "Team managers can delete meeting notes" on meeting_notes for delete using (public.can_write_team(team));

-- 3. Decision log ───────────────────────────────────────────────────────────
create table if not exists decisions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null default 'General' check (category in
    ('General', 'Budget', 'Venue', 'Roles', 'Competitions', 'Marketing', 'Programs', 'Registration', 'Sports', 'Event Weekend')),
  decision text not null default '',
  rationale text not null default '',
  owner_label text not null default '',
  team team_type,
  decided_on date not null default current_date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists decisions_decided_on_idx on decisions (decided_on desc);
drop trigger if exists decisions_updated_at on decisions;
create trigger decisions_updated_at before update on decisions
  for each row execute procedure update_updated_at();

alter table decisions enable row level security;
drop policy if exists "Board can read decisions" on decisions;
create policy "Board can read decisions" on decisions for select using (public.is_board());
drop policy if exists "Team managers can insert decisions" on decisions;
create policy "Team managers can insert decisions" on decisions for insert with check (public.can_write_team(team));
drop policy if exists "Team managers can update decisions" on decisions;
create policy "Team managers can update decisions" on decisions
  for update using (public.can_write_team(team)) with check (public.can_write_team(team));
drop policy if exists "Team managers can delete decisions" on decisions;
create policy "Team managers can delete decisions" on decisions for delete using (public.can_write_team(team));

-- 4. Feedback themes ────────────────────────────────────────────────────────
create table if not exists feedback_themes (
  id uuid primary key default uuid_generate_v4(),
  slug text,
  theme text not null,
  source text not null default '',
  sentiment text not null default '',
  owner_label text not null default '',
  phase position_phase,
  status text not null default 'Open',
  color text,
  action text not null default '',
  sort_order int not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists feedback_themes_slug_key on feedback_themes (slug);
drop trigger if exists feedback_themes_updated_at on feedback_themes;
create trigger feedback_themes_updated_at before update on feedback_themes
  for each row execute procedure update_updated_at();

alter table feedback_themes enable row level security;
drop policy if exists "Board can read feedback themes" on feedback_themes;
create policy "Board can read feedback themes" on feedback_themes for select using (public.is_board());
drop policy if exists "Leadership can manage feedback themes" on feedback_themes;
create policy "Leadership can manage feedback themes" on feedback_themes
  for all using (public.is_leadership()) with check (public.is_leadership());

insert into feedback_themes (slug, theme, source, sentiment, owner_label, phase, status, color, action, sort_order) values
  ('communication', 'Communication Clarity', 'Previous organizer and participant feedback',
   'People need fewer conflicting updates and clearer source-of-truth messaging.',
   'Ops 2 + PR', 'BUILD', 'In progress', '#1f8a9b',
   'Centralize announcements through Command Center, publish one approved update per change, and use the Calendar page for deadline clarity.', 1),
  ('room-flow', 'Room Flow & Competition Timing', 'Event weekend debriefs',
   'Room changes, late starts, and unclear competition locations create stress for students and volunteers.',
   'Operations + Competitions', 'STABILIZATION', 'In build', '#7b61ff',
   'Use Weekend Tournament Manager for room inventory, competition blocks, room rosters, and live schedule conflict checks.', 2),
  ('training', 'Organizer Training', 'Past board reflections',
   'New organizers need clearer expectations before event week, not just during event week.',
   'RD / ADs + Directors', 'FOUNDATIONS', 'Needs owner check', '#247a52',
   'Use role workbooks, team pages, meeting templates, and execution runbook training before January.', 3),
  ('registration', 'Registration Data Accuracy', 'Check-in and roster issues',
   'Wrong names, missing competitions, and unclear status slow down check-in and room entry.',
   'Registration + MyMIST leads', 'BUILD', 'Staged', '#c9972b',
   'Import MyMIST snapshots into the portal, audit fields before event week, and map badge/NFC IDs to participant records.', 4),
  ('accountability', 'Role Accountability', 'Leadership debriefs',
   'It should be easier to tell who owns what, what is late, and where support is needed.',
   'RD / ADs', 'FOUNDATIONS', 'Live', '#b13f4a',
   'Use role claims, progress board, team pages, deadlines, and Meeting Hub action items as the accountability loop.', 5)
on conflict (slug) do nothing;
