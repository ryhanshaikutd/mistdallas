# Cutover: one site on one Supabase project

The merged portal runs on the **2027 Handbook portal's Supabase project** (`pgdrhoifisonmzuaeetu`), because it holds the 29 organizer accounts. The old mistdallas project (`xgocnplfuwicxejmlndh`) contributes only its gallery pictures. Work through this list in order; every SQL file is safe to re-run.

## 0. Access

- [ ] Handbook project → Project Settings → API: put the URL, anon key and service-role key into `.env.local` (and later into Vercel).
- [ ] Optional snapshot for the record: `node scripts/sync-handbook-data.mjs` writes a git-ignored SQL copy of the roster. Only needed later if the adoption reports checked workbook items it could not map.

## 1. Database (Supabase SQL editor, exactly this order)

1. `supabase/adopt-handbook/01-before-schema.sql` — renames every handbook table that holds rows to `handbook_<name>` and drops empty ones. Nothing is deleted that has data.
2. `supabase/schema.sql`
3. `supabase/migrations/20261014_audit_fixes.sql`
4. `supabase/migrations/20261029_00_exec_team.sql` — **run alone**
5. `supabase/migrations/20261029_01_positions_seats.sql` through `20261029_05_tournament_mymist.sql`
6. `supabase/adopt-handbook/02-after-migrations.sql` — copies the organizers into the new `profiles` with the same ids, turns their old roles into seats, carries reminder preferences and workbook notes over.

Check afterwards:

```sql
select count(*) from profiles;                                  -- = number of handbook organizers (29)
select count(*) from positions where is_active;                 -- 35
select count(*) from milestones where legacy_id is not null;    -- 46
select email, position_slug from legacy_seat_assignments
 where source = 'handbook-adoption' and position_slug is null;  -- anyone whose old role has no seat
```

The script prints a NOTICE if any handbook workbook row had checked deliverables; those cannot be mapped in SQL. If it matters, run `scripts/sync-handbook-data.mjs --from <export dir>` with the snapshot from step 0.

## 2. Sign-in

- [ ] Supabase → Authentication → Providers → Google: enable it with the Google Cloud client id and secret.
- [ ] Google Cloud → the OAuth client: add `https://pgdrhoifisonmzuaeetu.supabase.co/auth/v1/callback` as an authorized redirect URI.
- [ ] Supabase → Authentication → URL configuration: site URL `https://mistdallas.org`; redirect URLs `https://mistdallas.org/auth/callback` and `http://localhost:3000/auth/callback`.
- [ ] Leave the Email provider on: existing accounts were created with it, and a Google sign-in with the same verified email links to the existing account automatically, keeping the user id and seat.

## 3. Pictures

- [ ] `node scripts/copy-gallery.mjs --dry-run` lists the objects found on the live site (19 today).
- [ ] `node --env-file=.env.local scripts/copy-gallery.mjs` creates a public `gallery` bucket on the handbook project and uploads them.

## 4. Deploy

- [ ] Vercel environment: the handbook project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; plus `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` (see SETUP.md step 4). Google Calendar variables as before.
- [ ] Merge the PR and deploy. If the existing Vercel project is not yours, import the repo into your own account and move the `mistdallas.org` domain when ready.
- [ ] Smoke test: sign in as one of the three leaders → **Positions** shows the seats filled; `/gallery` shows the pictures; the dashboard shows the season tiles and the welcome announcement.
- [ ] Open the seats you are hiring for on **Positions** before announcing the application link; applicants can only rank open seats.

## 5. Old site and old data

- [ ] Replace the handbook repo's `index.html` with a meta-refresh to `https://mistdallas.org/portal`, keep `CNAME`, push. GitHub Pages then redirects `organizers.mistdallas.org`.
- [ ] Pause the mistdallas Supabase project once the gallery copy is verified; nothing reads it afterwards.
- [ ] After a few weeks, drop the `handbook_*` tables in the handbook project (`drop table handbook_profiles, handbook_deadline_events, handbook_announcements, handbook_workbook_progress, handbook_reminder_preferences cascade;` plus any others `01` renamed). Until then they are readable only by the service role.

## Not carried over (by decision)

- The handbook's in-portal chat (`messages`): zero rows.
- The handbook's 24-question application form: the validated form in this app stays.
- Tournament-weekend and MyMIST tables: the schema exists (migration 05) but the room/block/student/NFC pages are a separate, later project.
