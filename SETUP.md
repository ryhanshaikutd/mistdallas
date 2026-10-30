# MIST Dallas Board Portal — Developer Setup

## Prerequisites
- Node.js 20+
- A Supabase account (free tier works)
- A Google Cloud project
- A Resend account (free tier works) — for decision and reminder emails
- Vercel account (for deployment and the daily reminder cron)

---

## Step 1 — Clone and install

```bash
git clone https://github.com/ryhanshaikutd/mistdallas.git
cd mistdallas
npm install
cp .env.local.example .env.local
```

`.env.local.example` lists every variable the app reads. Fill in the Supabase values now; the Google Calendar ones are only needed for interview Meet links, and the Resend ones only for email.

---

## Step 2 — Supabase setup

1. Go to [supabase.com](https://supabase.com) → New Project → name it `mistdallas`
2. Go to **SQL Editor** and run, in this order:
   1. `supabase/schema.sql` (fresh projects only)
   2. `supabase/migrations/20261014_audit_fixes.sql`
   3. `supabase/migrations/20261029_00_exec_team.sql` — **run this file on its own**: it adds an enum value, and Postgres will not let the same transaction use that value
   4. `supabase/migrations/20261029_01_positions_seats.sql`
   5. `supabase/migrations/20261029_02_season_milestones.sql`
   6. `supabase/migrations/20261029_03_workbooks_reminders.sql`
   7. `supabase/migrations/20261029_04_meetings_feedback.sql`
   8. `supabase/migrations/20261029_05_tournament_mymist.sql`

   Every migration is idempotent, so re-running one is safe. Together they seed the 35-seat position catalog, the 2027 season settings, 46 season milestones, the welcome announcement and five feedback themes.
3. Go to **Project Settings → API**:
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Enable Google OAuth in Supabase

1. Go to **Authentication → Providers → Google** → Enable
2. Add your Google OAuth Client ID and Secret (from Step 3 below)
3. Set **Redirect URL** to: `https://yourdomain.com/auth/callback`
   - For local dev: `http://localhost:3000/auth/callback`

---

## Step 3 — Google Cloud setup

### OAuth (for user login)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → Enable **Google Calendar API** and **Google Meet API**
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: add your Supabase OAuth callback URL (shown in Supabase dashboard)
4. Paste the Client ID and Client Secret into **Supabase → Authentication → Providers → Google** (step 2 above). They are not read by the app itself, so they do not go in `.env.local`.

### Service Account (for calendar/meet creation)

1. Go to **Credentials → Create Credentials → Service Account**
2. Name it `mistdallas-calendar`
3. After creating, go to the service account → **Keys → Add Key → JSON**
4. From the downloaded JSON:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
5. Share your board's Google Calendar with the service account email (give it "Make changes to events" permission)
6. Copy the calendar ID → `GOOGLE_CALENDAR_ID`
   - Find it in Google Calendar → Settings → your calendar → Calendar ID (looks like `xxx@group.calendar.google.com`)

---

## Step 4 — Resend and the reminder cron

The portal sends two kinds of email through [Resend](https://resend.com): application decisions (accepted, not selected, redirected to the Dream Team) and daily deadline reminders. Both are skipped, not failed, while the variables are missing.

1. Create a Resend account and verify `mistdallas.org` as a sending domain.
2. Set in `.env.local` and in Vercel:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` — e.g. `MIST Dallas <board@mistdallas.org>`
   - `CRON_SECRET` — a long random string; Vercel sends it as `Authorization: Bearer …` to the cron route
   - `NEXT_PUBLIC_SITE_URL` — the absolute site URL used in email links (defaults to `https://mistdallas.org`)
3. `vercel.json` schedules `GET /api/cron/reminders` daily at 14:00 UTC (9 AM Central). Each board member chooses on **Settings** whether to receive reminders and how many days before (1, 3, 7 or 14). A delivery is recorded per person, milestone and day, so a second run the same day sends nothing.

To test the route locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders`.

---

## Step 5 — Seed data

Positions (seats), the season, milestones, the welcome announcement and feedback themes are seeded by the migrations in Step 2; nothing needs pasting by hand.

Optional: recurring milestones without a date (shown under "Unscheduled" on the calendar until leadership sets one):

```sql
INSERT INTO milestones (title, is_recurring, team) VALUES
('Board Kickoff Dinner', true, null),
('MockMist', true, null),
('Board Photoshoot', true, null),
('Sponsorship Outreach Deadline', true, 'finance'),
('Registration Opens', true, 'registration'),
('Registration Closes', true, 'registration'),
('Tournament Day', true, null);
```

---

## Step 6 — Roles and seats

A person's role (regional director, AD, director, chair, member…) and team come from the **seat** they hold. Leadership assigns seats on **Portal → Positions**; accepting an application assigns the chosen seat automatically.

The three leaders the app used to hard-code are seeded into `legacy_seat_assignments` (`sdin@` → Regional Director, `fhafeez@` → Internal AD, `rshaik@` → External AD); they receive their seat the first time they sign in with Google. To bootstrap a different leader before anyone can use the Positions page:

```sql
-- Give someone the Regional Director seat (works before or after they sign in)
insert into legacy_seat_assignments (email, position_slug, is_admin, source)
values ('you@getmistified.com', 'rd', true, 'manual')
on conflict (email) do update set position_slug = excluded.position_slug;
select public.apply_legacy_seats_all();
```

Nobody can change their own role, seat or team through the API; `profiles_guard_privileged` rejects it.

---

## Step 7 — Syncing the 2027 Handbook data

The old organizer portal (`organizers.mistdallas.org`, GitHub Pages + its own Supabase project) held 29 organizer profiles with their roles. `scripts/sync-handbook-data.mjs` carries them over **by email**, so each organizer gets their seat and workbook the first time they sign in here with Google.

```bash
# Write SQL to a git-ignored file and print a summary (fetches the handbook project with its public key)
node scripts/sync-handbook-data.mjs

# …or apply straight into this project with the service role
node --env-file=.env.local scripts/sync-handbook-data.mjs --apply
```

The summary lists every warning. The one known case: an organizer whose handbook email has a misspelled domain (`getmistfied.com`). Leadership fixes such rows directly in `legacy_seat_assignments` (change the email, then run `select public.apply_legacy_seats_all();`). The generated file lives under `supabase/seed/local/`, which is git-ignored because it is a roster of real people.

See `docs/cutover.md` for the full retirement checklist for the old portal.

---

## Step 8 — Add MIST Dallas logo

Place the logo file at:
```
/public/logo.png
```

---

## Step 9 — Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`

Tests run against an in-process Postgres (PGlite) that applies `schema.sql` and every migration, so schema changes are covered without a Supabase project:

```bash
npm test
```

---

## Step 10 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → Import from GitHub → select `ryhanshaikutd/mistdallas`
2. Add all environment variables from `.env.local` in Vercel's project settings (including the Resend and `CRON_SECRET` ones from Step 4)
3. Deploy — done. The cron in `vercel.json` is registered automatically.

### Domain setup
1. Purchase `mistdallas.org` on Namecheap (~$12/yr)
2. In Vercel → Project → Settings → Domains → add `mistdallas.org`
3. Follow Vercel's DNS instructions in Namecheap

---

## Opening recruitment

Once everything is live, open a recruitment cycle from Supabase SQL Editor:

```sql
-- Open internal recruitment
INSERT INTO recruitment_cycles (year, type, opened_at)
VALUES (2027, 'internal', now());

-- Switch to external (run this after internal closes)
UPDATE recruitment_cycles SET type = 'external' WHERE year = 2027;

-- Close recruitment
UPDATE recruitment_cycles SET type = 'closed', closed_at = now() WHERE year = 2027;
```

Or hit the API: `POST /api/cycle` with `{ "type": "internal", "year": 2027 }` (requires RD/AD auth).

Then open the seats you are hiring for on **Portal → Positions** (the "Open" toggle); applicants can only rank open seats.
