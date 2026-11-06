-- ─────────────────────────────────────────────────────────────────────────────
-- Handbook port, step 1 — 2026-10-29
--
-- Positions become seats: each has a stable slug (the handbook's role id), a
-- reporting line, the permission tier its holder gets, and an "open for
-- applications" flag. Profiles link to a seat through position_id. Seats from
-- the 2027 Handbook portal are carried over by email through
-- legacy_seat_assignments and applied on first sign-in.
--
-- Requires 20261029_00_exec_team.sql to have been run (and committed) first.
-- Every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Positions become seats ─────────────────────────────────────────────────
alter table positions add column if not exists slug text;
alter table positions add column if not exists reports_to_position_id uuid references positions(id) on delete set null;
alter table positions add column if not exists role_tier user_role not null default 'member';
alter table positions add column if not exists is_exec boolean not null default false;
alter table positions add column if not exists open_for_applications boolean not null default false;
alter table positions add column if not exists max_holders int;
alter table positions add column if not exists sort_order int not null default 0;
alter table positions drop constraint if exists positions_max_holders_check;
alter table positions add constraint positions_max_holders_check check (max_holders is null or max_holders > 0);

-- 1a. Rows seeded from SETUP.md get their slug by title (oldest row per title),
--     so they are updated in place and any application rankings that point at
--     them keep working.
update positions p set slug = m.slug
from (values
  ('Regional Director', 'rd'),
  ('Internal Associate Director', 'internal-ad'),
  ('External Associate Director', 'external-ad'),
  ('Competitions Director', 'comps-lead'),
  ('Writing & Oratory Zone Lead', 'writing-oratory'),
  ('Knowledge & Quran Zone Lead', 'sisters-kq'),
  ('Group Comps Zone Lead', 'group-projects'),
  ('Arts Zone Lead', 'arts'),
  ('eSports Chair', 'esports'),
  ('Brackets Lead', 'brackets'),
  ('Judges Chair', 'judges'),
  ('PR Director', 'marketing-lead'),
  ('Graphics Chair', 'graphic-design'),
  ('Marketing Chair', 'marketing-coord'),
  ('Dream Team Director', 'dt-lead'),
  ('Dream Team Member', 'dream-team'),
  ('Ops Director 1 — Command Center Lead', 'logistics-lead'),
  ('Ops Director 2 — Communications Lead', 'comms'),
  ('Food & Safety Chair', 'food'),
  ('Awards & Ceremonies Chair', 'ceremonies'),
  ('Finance Director', 'finance-lead'),
  ('Sponsorships Chair', 'sponsorships'),
  ('Programs Director', 'programs-lead'),
  ('Workshops Chair', 'programs-coord'),
  ('Registration Director', 'registration'),
  ('Sports Director', 'sports-lead'),
  ('Sisters Sports Lead', 'sports-sisters'),
  ('Brothers Sports Lead', 'sports-brothers')
) as m(title, slug)
where p.slug is null
  and p.title = m.title
  and p.id = (select q.id from positions q where q.title = m.title and q.slug is null order by q.created_at, q.id limit 1)
  and not exists (select 1 from positions s where s.slug = m.slug);

create unique index if not exists positions_slug_key on positions (slug);

-- 1b. The canonical catalog: the handbook's 34 roles plus the Dream Team seat.
insert into positions (slug, title, team, phase, role_tier, is_exec, sort_order, is_active) values
  ('rd',                 'Regional Director',                      'exec',         'FOUNDATIONS',   'regional_director', true,  1,  true),
  ('internal-ad',        'Internal Associate Director',            'exec',         'FOUNDATIONS',   'internal_ad',       true,  2,  true),
  ('external-ad',        'External Associate Director',            'exec',         'FOUNDATIONS',   'external_ad',       true,  3,  true),
  ('comps-lead',         'Competitions Lead',                      'competitions', 'FOUNDATIONS',   'director',          true,  4,  true),
  ('writing-oratory',    'Writing & Oratory Coordinator',          'competitions', 'BUILD',         'chair',             false, 5,  true),
  ('sisters-kq',         'Sisters Knowledge & Quran Coordinator',  'competitions', 'BUILD',         'chair',             false, 6,  true),
  ('knowledge-brothers', 'Brothers Knowledge & Quran Coordinator', 'competitions', 'BUILD',         'chair',             false, 7,  true),
  ('group-projects',     'Group Projects Coordinator',             'competitions', 'BUILD',         'chair',             false, 8,  true),
  ('arts',               'Arts Coordinator',                       'competitions', 'BUILD',         'chair',             false, 9,  true),
  ('esports',            'Esports Coordinator',                    'competitions', 'BUILD',         'chair',             false, 10, true),
  ('brackets',           'Brackets Coordinator',                   'competitions', 'STABILIZATION', 'chair',             false, 11, true),
  ('judges',             'Judges Coordinator',                     'competitions', 'BUILD',         'chair',             false, 12, true),
  ('marketing-lead',     'Marketing Lead',                         'pr',           'FOUNDATIONS',   'director',          true,  13, true),
  ('content-creator',    'Content Creator',                        'pr',           'BUILD',         'chair',             false, 14, true),
  ('graphic-design',     'Graphic Design Coordinator',             'pr',           'BUILD',         'chair',             false, 15, true),
  ('marketing-coord',    'Marketing Coordinator',                  'pr',           'BUILD',         'chair',             false, 16, true),
  ('outreach',           'Outreach Coordinator',                   'pr',           'FOUNDATIONS',   'chair',             false, 17, true),
  ('dt-lead',            'Dream Team Lead',                        'dream_team',   'FOUNDATIONS',   'director',          true,  18, true),
  ('dream-team',         'Dream Team Member',                      'dream_team',   'EXECUTION',     'dream_team',        false, 19, true),
  ('logistics-lead',     'Logistics Lead',                         'logistics',    'FOUNDATIONS',   'director',          true,  20, true),
  ('comms',              'Communications Coordinator',             'logistics',    'BUILD',         'chair',             false, 21, true),
  ('food',               'Food Coordinator',                       'logistics',    'BUILD',         'chair',             false, 22, true),
  ('hospitality',        'Hospitality Coordinator',                'logistics',    'BUILD',         'chair',             false, 23, true),
  ('ceremonies',         'Ceremonies Coordinator',                 'programs',     'BUILD',         'chair',             false, 24, true),
  ('finance-lead',       'Finance Lead',                           'finance',      'FOUNDATIONS',   'director',          true,  25, true),
  ('finance-coord',      'Finance Coordinator',                    'finance',      'BUILD',         'chair',             false, 26, true),
  ('sponsorships',       'Sponsorships Coordinator',               'finance',      'FOUNDATIONS',   'chair',             false, 27, true),
  ('programs-lead',      'Programs Lead',                          'programs',     'FOUNDATIONS',   'director',          true,  28, true),
  ('programs-coord',     'Programs Coordinator',                   'programs',     'BUILD',         'chair',             false, 29, true),
  ('tech-lead',          'Tech Lead',                              'registration', 'FOUNDATIONS',   'director',          true,  30, true),
  ('tech-coord',         'Tech Coordinator',                       'registration', 'BUILD',         'chair',             false, 31, true),
  ('registration',       'Registration Coordinator',               'registration', 'FOUNDATIONS',   'chair',             false, 32, true),
  ('sports-lead',        'Sports Co-Lead',                         'sports',       'FOUNDATIONS',   'director',          true,  33, true),
  ('sports-sisters',     'Sisters Sports Coordinator',             'sports',       'BUILD',         'chair',             false, 34, true),
  ('sports-brothers',    'Brothers Sports Coordinator',            'sports',       'BUILD',         'chair',             false, 35, true)
on conflict (slug) do update set
  title      = excluded.title,
  team       = excluded.team,
  phase      = excluded.phase,
  role_tier  = excluded.role_tier,
  is_exec    = excluded.is_exec,
  sort_order = excluded.sort_order,
  is_active  = true;

-- 1c. Reporting lines.
update positions p set reports_to_position_id = r.id
from (values
  ('internal-ad', 'rd'), ('external-ad', 'rd'),
  ('comps-lead', 'internal-ad'), ('marketing-lead', 'internal-ad'), ('dt-lead', 'internal-ad'), ('logistics-lead', 'internal-ad'),
  ('finance-lead', 'external-ad'), ('programs-lead', 'external-ad'), ('tech-lead', 'external-ad'), ('sports-lead', 'external-ad'),
  ('writing-oratory', 'comps-lead'), ('sisters-kq', 'comps-lead'), ('knowledge-brothers', 'comps-lead'), ('group-projects', 'comps-lead'),
  ('arts', 'comps-lead'), ('esports', 'comps-lead'), ('brackets', 'comps-lead'), ('judges', 'comps-lead'),
  ('content-creator', 'marketing-lead'), ('graphic-design', 'marketing-lead'), ('marketing-coord', 'marketing-lead'), ('outreach', 'marketing-lead'),
  ('dream-team', 'dt-lead'),
  ('comms', 'logistics-lead'), ('food', 'logistics-lead'), ('hospitality', 'logistics-lead'),
  ('ceremonies', 'programs-lead'), ('programs-coord', 'programs-lead'),
  ('finance-coord', 'finance-lead'), ('sponsorships', 'finance-lead'),
  ('tech-coord', 'tech-lead'), ('registration', 'tech-lead'),
  ('sports-sisters', 'sports-lead'), ('sports-brothers', 'sports-lead')
) as m(slug, boss)
join positions r on r.slug = m.boss
where p.slug = m.slug;

update positions set reports_to_position_id = null where slug = 'rd';

-- 1d. Anything left without a slug has no place in the catalog; keep the row
--     (applications may reference it) but hide it.
update positions set is_active = false where slug is null;

-- 1e. Leadership, not only the RD, manages the catalog.
drop policy if exists "RD can manage positions" on positions;
drop policy if exists "Leadership can manage positions" on positions;

-- 2. Role helpers (SECURITY DEFINER so policies never recurse through profiles) ─
create or replace function public.is_leadership()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('regional_director', 'internal_ad', 'external_ad') from profiles where id = auth.uid()),
    false);
$$;
revoke all on function public.is_leadership() from public;
grant execute on function public.is_leadership() to authenticated, anon;

create or replace function public.is_board()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role <> 'applicant' from profiles where id = auth.uid()), false);
$$;
revoke all on function public.is_board() from public;
grant execute on function public.is_board() to authenticated, anon;

create or replace function public.current_user_team()
returns team_type language sql stable security definer set search_path = public as $$
  select team from profiles where id = auth.uid();
$$;
revoke all on function public.current_user_team() from public;
grant execute on function public.current_user_team() to authenticated, anon;

-- Seats are changed by the service role (server actions), by SQL run as the
-- project owner, or by signed-in leadership. The public anon key and ordinary
-- signed-in users are refused even if they reach a seat function.
create or replace function public.assert_seat_manager()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_leadership() then
    raise exception 'forbidden';
  end if;
end;
$$;
revoke all on function public.assert_seat_manager() from public, anon, authenticated;

create policy "Leadership can manage positions" on positions
  for all using (public.is_leadership()) with check (public.is_leadership());

-- 3. Profiles get a seat ────────────────────────────────────────────────────
alter table profiles add column if not exists position_id uuid references positions(id) on delete set null;
create index if not exists profiles_position_id_idx on profiles (position_id);

-- 3a. Nobody changes their own role, seat, team or email through the API
--     (email is what legacy seats are matched on). Server
--     actions use the service role (auth.uid() is null) and leadership edits
--     other people's rows, so both keep working.
create or replace function public.guard_privileged_profile_columns()
returns trigger language plpgsql as $$
begin
  if auth.uid() = old.id and not public.is_leadership() and (
       new.role is distinct from old.role
    or new.position_id is distinct from old.position_id
    or new.team is distinct from old.team
    or new.email is distinct from old.email
  ) then
    raise exception 'privileged profile columns can only be changed by leadership';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_privileged on profiles;
create trigger profiles_guard_privileged before update on profiles
  for each row execute procedure public.guard_privileged_profile_columns();

-- 4. Seats carried over from the 2027 Handbook portal ───────────────────────
create table if not exists legacy_seat_assignments (
  email text primary key check (email = lower(email)),
  full_name text,
  position_slug text,
  is_admin boolean not null default false,
  source text not null default 'handbook-2027',
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
alter table legacy_seat_assignments enable row level security;
drop policy if exists "Leadership can manage legacy seats" on legacy_seat_assignments;
create policy "Leadership can manage legacy seats" on legacy_seat_assignments
  for all using (public.is_leadership()) with check (public.is_leadership());

create table if not exists legacy_workbook_progress (
  email text not null check (email = lower(email)),
  position_slug text not null,
  phase text not null check (phase in ('foundations', 'build', 'stabilization', 'execution')),
  data jsonb not null default '{}'::jsonb,
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  updated_at timestamptz,
  primary key (email, position_slug, phase)
);
alter table legacy_workbook_progress enable row level security;
drop policy if exists "Leadership can manage legacy progress" on legacy_workbook_progress;
create policy "Leadership can manage legacy progress" on legacy_workbook_progress
  for all using (public.is_leadership()) with check (public.is_leadership());

-- The three leaders the app used to hard-code in auth/callback/route.ts.
insert into legacy_seat_assignments (email, position_slug, is_admin, source) values
  ('sdin@getmistified.com',    'rd',          true, 'mistdallas-role-map'),
  ('fhafeez@getmistified.com', 'internal-ad', true, 'mistdallas-role-map'),
  ('rshaik@getmistified.com',  'external-ad', true, 'mistdallas-role-map')
on conflict (email) do nothing;

-- 5. Seat functions ─────────────────────────────────────────────────────────
-- Executable only by the service role (server actions) and the project owner;
-- see the REVOKEs at the end of this section. assert_seat_manager() is a
-- second line of defence inside each function.
create or replace function public.assign_seat(p_profile_id uuid, p_position_slug text)
returns void language plpgsql security definer set search_path = public as $$
declare
  pos positions%rowtype;
  holders int;
begin
  perform public.assert_seat_manager();
  select * into pos from positions where slug = p_position_slug and is_active;
  if not found then
    raise exception 'position_not_found: %', p_position_slug;
  end if;
  if pos.max_holders is not null then
    select count(*) into holders from profiles where position_id = pos.id and id <> p_profile_id;
    if holders >= pos.max_holders then
      raise exception 'position_full: %', p_position_slug;
    end if;
  end if;
  update profiles set position_id = pos.id, role = pos.role_tier, team = pos.team where id = p_profile_id;
  if not found then
    raise exception 'profile_not_found: %', p_profile_id;
  end if;
end;
$$;

create or replace function public.unassign_seat(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_seat_manager();
  update profiles
     set position_id = null,
         role = case when role in ('regional_director', 'internal_ad', 'external_ad') then role else 'member' end
   where id = p_profile_id;
end;
$$;

-- Accepting an application: seat + status + alternate seat in one transaction,
-- so a failure (full seat, missing position) leaves the application untouched.
create or replace function public.accept_application(p_application_id uuid, p_position_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  app applications%rowtype;
  pos positions%rowtype;
  first_choice uuid;
begin
  perform public.assert_seat_manager();
  select * into app from applications where id = p_application_id;
  if not found then
    raise exception 'application_not_found: %', p_application_id;
  end if;
  select * into pos from positions where id = p_position_id and is_active and slug is not null;
  if not found then
    raise exception 'position_not_found: %', p_position_id;
  end if;
  perform public.assign_seat(app.applicant_id, pos.slug);
  select position_id into first_choice from application_rankings where application_id = app.id order by rank limit 1;
  update applications
     set status = 'accepted',
         alternate_position_id = case when first_choice = pos.id then null else pos.id end
   where id = app.id;
end;
$$;

-- Applies a legacy seat (matched on lower-cased email) to one profile.
-- Returns true when a legacy row matched. Safe to call repeatedly, and it runs
-- inside the sign-up trigger, so nothing in here may fail the caller: a full
-- seat is skipped (applied_at stays null) and name copying is best effort.
create or replace function public.apply_legacy_seat(p_profile_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  prof profiles%rowtype;
  legacy legacy_seat_assignments%rowtype;
  seated boolean := false;
begin
  select * into prof from profiles where id = p_profile_id;
  if not found then return false; end if;
  select * into legacy from legacy_seat_assignments where email = lower(prof.email);
  if not found then return false; end if;

  if legacy.position_slug is null then
    seated := true;
  else
    begin
      perform public.assign_seat(p_profile_id, legacy.position_slug);
      seated := true;
    exception when others then
      raise notice 'apply_legacy_seat: % for %', sqlerrm, legacy.email;
    end;
  end if;

  begin
    if coalesce(prof.full_name, '') = '' and coalesce(legacy.full_name, '') <> '' then
      update profiles set full_name = legacy.full_name where id = p_profile_id;
    end if;
  exception when others then
    raise notice 'apply_legacy_seat: % copying name for %', sqlerrm, legacy.email;
  end;

  if seated then
    update legacy_seat_assignments set applied_at = now() where email = legacy.email;
  end if;
  return true;
end;
$$;

create or replace function public.apply_legacy_seats_all()
returns int language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  perform public.assert_seat_manager();
  select count(*) into n from (select public.apply_legacy_seat(id) as matched from profiles) s where s.matched;
  return n;
end;
$$;

-- Only the service role (and SQL run as the owner) may call the seat functions;
-- the browser never does. Leadership changes seats through server actions.
revoke all on function public.assign_seat(uuid, text) from public, anon, authenticated;
revoke all on function public.unassign_seat(uuid) from public, anon, authenticated;
revoke all on function public.accept_application(uuid, uuid) from public, anon, authenticated;
revoke all on function public.apply_legacy_seat(uuid) from public, anon, authenticated;
revoke all on function public.apply_legacy_seats_all() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function
      public.assign_seat(uuid, text), public.unassign_seat(uuid), public.accept_application(uuid, uuid),
      public.apply_legacy_seat(uuid), public.apply_legacy_seats_all()
    to service_role;
  end if;
end $$;

-- 6. New sign-ups pick up their legacy seat immediately ─────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  perform public.apply_legacy_seat(new.id);
  return new;
end;
$$;

-- 7. Profiles that already exist get their seats now.
select public.apply_legacy_seats_all();
