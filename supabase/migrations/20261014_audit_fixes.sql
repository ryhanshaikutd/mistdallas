-- ─────────────────────────────────────────────────────────────────────────────
-- Audit fixes — 2026-10-14
--
-- Brings the committed schema in line with what the app already expects and
-- fixes two policy problems. Every statement is idempotent, so the file is
-- safe to run on a fresh project (after schema.sql) and on the live project.
-- Review against the live database before running there.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profile preference columns used by /onboarding and /portal/settings ─────
alter table profiles add column if not exists preferred_name text;
alter table profiles add column if not exists fun_fact text;
alter table profiles add column if not exists theme text not null default 'dark';
alter table profiles add column if not exists nav_style text not null default 'sidebar';
alter table profiles add column if not exists onboarded boolean not null default false;

alter table profiles drop constraint if exists profiles_theme_check;
alter table profiles add constraint profiles_theme_check check (theme in ('light', 'dark'));
alter table profiles drop constraint if exists profiles_nav_style_check;
alter table profiles add constraint profiles_nav_style_check check (nav_style in ('sidebar', 'topnav'));

-- 2. Role lookup that does not recurse through profiles' own RLS ─────────────
-- The original "Board can read all profiles" policy selected from profiles
-- inside a policy on profiles, which Postgres rejects as infinite recursion.
-- A SECURITY DEFINER function bypasses RLS for that one lookup.
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated, anon;

drop policy if exists "Board can read all profiles" on profiles;
create policy "Board can read all profiles" on profiles
  for select using (coalesce(public.current_user_role()::text, 'applicant') <> 'applicant');

-- 3. Qualifiers (public Nationals page) ─────────────────────────────────────
create table if not exists qualifiers (
  id uuid primary key default uuid_generate_v4(),
  year int not null,
  name text not null,
  school text not null,
  category text not null,
  placement text,
  qualified_for_nationals boolean not null default false,
  mist_ids text,
  created_at timestamptz not null default now()
);
alter table qualifiers add column if not exists mist_ids text;
create index if not exists qualifiers_year_category_idx on qualifiers (year, category);

alter table qualifiers enable row level security;
drop policy if exists "Anyone can read qualifiers" on qualifiers;
create policy "Anyone can read qualifiers" on qualifiers for select using (true);
drop policy if exists "RD and ADs can manage qualifiers" on qualifiers;
create policy "RD and ADs can manage qualifiers" on qualifiers for all using (
  public.current_user_role() in ('regional_director', 'internal_ad', 'external_ad')
);

-- 4. One recruitment cycle per year ──────────────────────────────────────────
-- The old /api/cycle upsert had no conflict target, so it could insert a new
-- row each call. If duplicates exist, keep the newest row per year first:
--
--   delete from recruitment_cycles c using recruitment_cycles newer
--   where c.year = newer.year and c.created_at < newer.created_at;
--
create unique index if not exists recruitment_cycles_year_key on recruitment_cycles (year);

-- 5. Applicants can only ever insert a 'submitted' application ───────────────
-- Submission now goes through a server action, but keep the database honest.
drop policy if exists "Applicants can insert own applications" on applications;
create policy "Applicants can insert own applications" on applications
  for insert with check (applicant_id = auth.uid() and status = 'submitted');
