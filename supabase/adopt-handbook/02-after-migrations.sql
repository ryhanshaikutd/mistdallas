-- ─────────────────────────────────────────────────────────────────────────────
-- Adopting the 2027 Handbook portal's Supabase project — step 2 of 2.
-- Run AFTER schema.sql and every migration.
--
-- Carries the handbook's organizers into the new tables: profiles keep their
-- ids (so existing accounts and Google sign-ins by the same email just work),
-- their roles become seats through legacy_seat_assignments, reminder
-- preferences and workbook notes/fields come across. Checked deliverables
-- were stored by array position and cannot be mapped in SQL; a NOTICE says
-- how many were dropped (scripts/sync-handbook-data.mjs can map them from a
-- pre-adoption export if that matters). Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  dropped_checks int := 0;
  seated int;
begin
  if to_regclass('public.handbook_profiles') is null then
    raise notice 'No handbook_profiles table; nothing to carry over.';
    return;
  end if;

  -- 1. Profiles: same ids, the new shape. Accounts without an email are skipped.
  insert into profiles (id, email, full_name, created_at)
  select h.id, lower(h.email), coalesce(h.full_name, ''), coalesce(h.created_at, now())
    from handbook_profiles h
   where h.email is not null
     and exists (select 1 from auth.users u where u.id = h.id)
  on conflict do nothing;

  -- 2. Roles become seats. Unknown role ids keep a row with a null slug so
  --    leadership can see who still needs a seat.
  insert into legacy_seat_assignments (email, full_name, position_slug, is_admin, source)
  select lower(h.email),
         nullif(trim(coalesce(h.full_name, '')), ''),
         case when exists (select 1 from positions p where p.slug = coalesce(a.slug, h.role_id) and p.is_active)
              then coalesce(a.slug, h.role_id) end,
         coalesce(h.is_admin, false),
         'handbook-adoption'
    from handbook_profiles h
    left join (values ('groups', 'group-projects'), ('communications', 'comms')) as a(old_id, slug) on a.old_id = h.role_id
   where h.email is not null and h.role_id is not null
  on conflict (email) do update
    set position_slug = excluded.position_slug,
        full_name = coalesce(excluded.full_name, legacy_seat_assignments.full_name),
        is_admin = excluded.is_admin,
        source = excluded.source;

  -- 3. Reminder preferences.
  if to_regclass('public.handbook_reminder_preferences') is not null then
    insert into reminder_preferences (user_id, email_enabled, days_before)
    select r.user_id, r.email_enabled, r.days_before
      from handbook_reminder_preferences r
     where exists (select 1 from profiles p where p.id = r.user_id)
    on conflict (user_id) do nothing;
  end if;

  -- 4. Workbook notes and fields (checks cannot be mapped here, see above).
  if to_regclass('public.handbook_workbook_progress') is not null then
    insert into legacy_workbook_progress (email, position_slug, phase, data, percent_complete, updated_at)
    select lower(h.email), l.position_slug, w.phase,
           jsonb_build_object(
             'checks', '{}'::jsonb,
             'notes', coalesce(w.data->>'notes', ''),
             'fields', coalesce(w.data->'fields', '{}'::jsonb)
           ),
           0, w.updated_at
      from handbook_workbook_progress w
      join handbook_profiles h on h.id = w.user_id
      join legacy_seat_assignments l on l.email = lower(h.email) and l.position_slug is not null
     where w.phase in ('foundations', 'build', 'stabilization', 'execution')
    on conflict (email, position_slug, phase) do nothing;

    select count(*) into dropped_checks
      from handbook_workbook_progress w
     where jsonb_typeof(w.data->'checks') = 'array'
       and exists (select 1 from jsonb_array_elements(w.data->'checks') c where c = 'true'::jsonb);
    if dropped_checks > 0 then
      raise notice '% handbook workbook row(s) had checked deliverables that could not be mapped in SQL.', dropped_checks;
    end if;
  end if;

  -- 5. Seat everyone (and copy their progress).
  select public.apply_legacy_seats_all() into seated;
  raise notice 'legacy seats applied to % profile(s)', seated;

  if not exists (select 1 from handbook_adoption where note = '02-after-migrations') then
    insert into handbook_adoption (note) values ('02-after-migrations');
  end if;
end $$;
