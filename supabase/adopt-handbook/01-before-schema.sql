-- ─────────────────────────────────────────────────────────────────────────────
-- Adopting the 2027 Handbook portal's Supabase project as the board portal's
-- single backend — step 1 of 2. Run this BEFORE supabase/schema.sql.
--
-- Every handbook table that holds rows is renamed to handbook_<name> (with its
-- constraints, indexes and sequences, so schema.sql and the migrations can
-- create fresh tables without name clashes); empty handbook tables are
-- dropped. Policies on the renamed tables are removed (several let anyone
-- with the public key read them) and RLS stays on, so only the service role
-- and SQL run as the owner can see the old rows.
--
-- Then run: schema.sql, the migrations in order (20261029_00 on its own),
-- and adopt-handbook/02-after-migrations.sql. Safe to re-run: a marker table
-- records that adoption happened and later runs do nothing.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  handbook_tables text[] := array[
    'profiles', 'announcements', 'role_applications', 'workbook_progress', 'deadline_events',
    'reminder_preferences', 'reminder_deliveries', 'messages',
    'tournament_rooms', 'room_availability', 'competition_blocks', 'student_registrations',
    'student_competition_entries', 'room_assignments', 'nfc_scan_logs',
    'mymist_import_batches', 'mymist_participants', 'mymist_schools', 'mymist_judges'
  ];
  t text;
  n bigint;
  r record;
begin
  if to_regclass('public.handbook_adoption') is not null then
    raise notice 'Handbook adoption already recorded; nothing to do.';
    return;
  end if;

  foreach t in array handbook_tables loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;

    execute format('select count(*) from public.%I', t) into n;

    if n = 0 then
      execute format('drop table public.%I cascade', t);
      raise notice 'dropped empty handbook table %', t;
      continue;
    end if;

    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);

    for r in select conname from pg_constraint where conrelid = format('public.%I', t)::regclass loop
      execute format('alter table public.%I rename constraint %I to %I', t, r.conname, 'handbook_' || r.conname);
    end loop;

    for r in
      select c.relname
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
       where i.indrelid = format('public.%I', t)::regclass
         and not exists (select 1 from pg_constraint k where k.conindid = i.indexrelid)
    loop
      execute format('alter index public.%I rename to %I', r.relname, 'handbook_' || r.relname);
    end loop;

    for r in
      select s.relname
        from pg_class s
        join pg_depend d on d.objid = s.oid and d.deptype = 'a'
       where s.relkind = 'S' and d.refobjid = format('public.%I', t)::regclass
    loop
      execute format('alter sequence public.%I rename to %I', r.relname, 'handbook_' || r.relname);
    end loop;

    execute format('alter table public.%I rename to %I', t, 'handbook_' || t);
    raise notice 'renamed % (% rows) to handbook_%', t, n, t;
  end loop;

  create table handbook_adoption (
    note text not null,
    adopted_at timestamptz not null default now()
  );
  alter table handbook_adoption enable row level security;
  insert into handbook_adoption (note) values ('01-before-schema');
end $$;
