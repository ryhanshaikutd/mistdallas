-- ─────────────────────────────────────────────────────────────────────────────
-- Handbook port, step 3 — 2026-10-29
--
-- Workbook progress (per person, per seat, per phase) and deadline reminder
-- preferences/deliveries. Every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Workbook progress ──────────────────────────────────────────────────────
-- data = { checks: { "<deliverable id>": true }, notes: string, fields: { "<key>": string } }
create table if not exists workbook_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  position_slug text not null,
  phase text not null check (phase in ('foundations', 'build', 'stabilization', 'execution')),
  data jsonb not null default '{}'::jsonb,
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, position_slug, phase)
);
create index if not exists workbook_progress_slug_idx on workbook_progress (position_slug);

alter table workbook_progress enable row level security;
drop policy if exists "Board can read workbook progress" on workbook_progress;
create policy "Board can read workbook progress" on workbook_progress
  for select using (public.is_board());
drop policy if exists "Users can insert own workbook progress" on workbook_progress;
create policy "Users can insert own workbook progress" on workbook_progress
  for insert with check (user_id = auth.uid());
drop policy if exists "Users can update own workbook progress" on workbook_progress;
create policy "Users can update own workbook progress" on workbook_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Leadership can manage workbook progress" on workbook_progress;
create policy "Leadership can manage workbook progress" on workbook_progress
  for all using (public.is_leadership()) with check (public.is_leadership());

-- 2. Reminder preferences ───────────────────────────────────────────────────
create table if not exists reminder_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  days_before int not null default 7 check (days_before in (1, 3, 7, 14)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists reminder_preferences_updated_at on reminder_preferences;
create trigger reminder_preferences_updated_at before update on reminder_preferences
  for each row execute procedure update_updated_at();

alter table reminder_preferences enable row level security;
drop policy if exists "Users can read own reminder preferences" on reminder_preferences;
create policy "Users can read own reminder preferences" on reminder_preferences
  for select using (user_id = auth.uid() or public.is_leadership());
drop policy if exists "Users can insert own reminder preferences" on reminder_preferences;
create policy "Users can insert own reminder preferences" on reminder_preferences
  for insert with check (user_id = auth.uid());
drop policy if exists "Users can update own reminder preferences" on reminder_preferences;
create policy "Users can update own reminder preferences" on reminder_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Reminder deliveries (dedupe: one email per person, milestone and day) ──
create table if not exists reminder_deliveries (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  milestone_id uuid not null references milestones(id) on delete cascade,
  reminder_date date not null default current_date,
  sent_at timestamptz not null default now(),
  unique (user_id, milestone_id, reminder_date)
);

alter table reminder_deliveries enable row level security;
drop policy if exists "Leadership can read reminder deliveries" on reminder_deliveries;
create policy "Leadership can read reminder deliveries" on reminder_deliveries
  for select using (public.is_leadership());

-- 4. Legacy seat application also carries over workbook progress ────────────
create or replace function public.apply_legacy_seat(p_profile_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  prof profiles%rowtype;
  legacy legacy_seat_assignments%rowtype;
begin
  select * into prof from profiles where id = p_profile_id;
  if not found then return false; end if;
  select * into legacy from legacy_seat_assignments where email = lower(prof.email);
  if not found then return false; end if;

  if legacy.position_slug is not null then
    begin
      perform public.assign_seat(p_profile_id, legacy.position_slug);
    exception when others then
      raise notice 'apply_legacy_seat: % for %', sqlerrm, legacy.email;
    end;
  end if;

  if coalesce(prof.full_name, '') = '' and coalesce(legacy.full_name, '') <> '' then
    update profiles set full_name = legacy.full_name where id = p_profile_id;
  end if;

  insert into workbook_progress (user_id, position_slug, phase, data, percent_complete, updated_at)
  select p_profile_id, l.position_slug, l.phase, l.data, l.percent_complete, coalesce(l.updated_at, now())
    from legacy_workbook_progress l
   where l.email = legacy.email
  on conflict (user_id, position_slug, phase) do nothing;

  update legacy_seat_assignments set applied_at = now() where email = legacy.email;
  return true;
end;
$$;
