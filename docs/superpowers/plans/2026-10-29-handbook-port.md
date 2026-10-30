# Handbook Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the 2027 Handbook portal's features (seats, workbooks, calendar/reminders, announcements, teams, command center, meetings, handbook content) into mistdallas as portal routes on mistdallas's auth and data model, and sync the handbook's live Supabase data (29 profiles, 1 workbook row, 8 deadlines, 1 announcement) into mistdallas's database keyed by email.

**Architecture:** Five idempotent SQL migrations extend the existing schema (positions become seats keyed by `slug`, `profiles.position_id` links a person to a seat, `milestones` absorbs deadlines, new tables for announcements, workbook progress, reminders, meetings, feedback, tournament). Workbook content is a generated TypeScript file keyed by slug; progress lives in `workbook_progress` keyed by stable deliverable ids. Every new page is a server component that fetches with the user's client and mutates through a server action in a sibling `actions.ts` that re-checks auth and writes with `createAdminClient()`. Legacy seats sync through a `legacy_seat_assignments` table applied by a SECURITY DEFINER function from the profile-creation trigger, so handbook organizers get their seat on first Google sign-in regardless of which Supabase `auth.users.id` they end up with.

**Tech Stack:** Next.js 16.2.4 (App Router, server actions, route handlers, Turbopack), React 19, Tailwind 4 with the existing `--p-*` tokens, Supabase (Postgres, RLS, Google OAuth), Resend via `fetch`, Vercel Cron, Vitest 5 + PGlite 0.5 for tests.

**Spec:** `docs/superpowers/specs/2026-10-14-handbook-port-audit-and-plan.md`

## Decisions adopted from the spec's open questions

1. Canonical position list: the handbook's 34 roles plus a `dream-team` seat (35 total), handbook slugs, with three placement fixes: `outreach` moves to team `pr` under `marketing-lead`; `ceremonies` moves to team `programs` under `programs-lead`; `esports` stays in `competitions`; `registration` stays under `tech-lead`.
2. Application form: keep mistdallas's. Handbook questions are not ported.
3. Applying requires Google sign-in.
4. Live data: yes, sync it. Handbook project `pgdrhoifisonmzuaeetu` holds 29 profiles (22 with a seat), 1 all-empty workbook row, the 8 seeded deadlines, the 1 seeded announcement, and nothing in reminder, chat, tournament or MyMIST tables (the last two groups of tables were never created there).
5. Chat: not ported (the `messages` table has 0 rows).
6. Team labels: keep mistdallas enum values; display labels change to "Marketing" for `pr` and "Operations" for `logistics`; add `exec` = "Executive".
7. Branch: `feat/handbook-port` from `fix/run-without-supabase-env` (the port depends on the pending audit migration).
8. Phase 5 (tournament weekend UI) and the Phase 6 chat are out of this plan. Phase 5's schema is included (Task 6) so the tables exist; its UI is a separate plan.

## Global Constraints

- Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `15-route-handlers.md` before writing any page, action or route (AGENTS.md). Dynamic route `params` is a Promise: `const { team } = await params`.
- All writes go through server actions (`"use server"` file beside the page) that call `requireLeadership()` / `requireBoard()` / `requireUser()` from `src/lib/auth.ts` and write with `createAdminClient()`. No browser-side Supabase writes in new code.
- Every migration statement is idempotent (`if not exists`, `drop policy if exists`, `on conflict`). Files are numbered `supabase/migrations/20261029_NN_*.sql` and run in order. `20261029_00_exec_team.sql` contains only the enum change and must run in its own transaction.
- RLS policies use `public.current_user_role()`, `public.is_leadership()`, `public.is_board()`; never a subselect on `profiles`.
- Phase ids are lowercase in TypeScript and JSON (`foundations | build | stabilization | execution`); the database `position_phase` enum stays uppercase. Convert at the boundary with `PHASE_ENUM` / `phaseIdFromEnum` from `src/lib/constants.ts`.
- No personal data in git: the handbook roster is synced by `scripts/sync-handbook-data.mjs` into the gitignored `supabase/seed/local/`. The only emails in the repo are the three `@getmistified.com` addresses already in `auth/callback/route.ts`.
- New runtime dependencies: none. Resend is called with `fetch`. ICS is a string builder. Dev dependencies: `vitest`, `vite-tsconfig-paths`, `@electric-sql/pglite`.
- Styling uses the existing inline `style={{ background: "var(--p-card)" ... }}` + Tailwind utility pattern, fonts `var(--font-syne)` for headings and `var(--font-dm-sans)` for body, `rounded-2xl border` cards.
- Scripts under `scripts/` are plain `.mjs` runnable on Node 20+; testable logic lives in `scripts/lib/*.mjs`.
- Verification commands for every task: `npm test`, `npx tsc --noEmit`, `npm run lint`. `npm run build` at Tasks 10, 18, 26, 27.

## Review Focus

1. Legacy email matching is case-insensitive but exact: `Sdin@GetMistified.com` must get the `rd` seat; `s.mohamed2@getmistfied.com` (typo domain in the handbook data) will not match a `@getmistified.com` Google account and must be reported by the sync script as "unmatchable until corrected". Test in Task 2 (case) and Task 12 (report).
2. Editing one deliverable's text in `content.ts` must reset only that item's checkmark; reordering must reset nothing. Test in Task 8.
3. Milestones with a null `target_date` (the SETUP.md recurring seeds) must be ignored by timing, ICS, reminders and the dashboard without throwing. Tests in Tasks 9 and 21.
4. Accepting an application whose chosen seat is already at `max_holders` must fail atomically with the application status unchanged. Test in Task 2 (`assign_seat` raises) and Task 14 (action returns the error).
5. Running the reminder cron twice in one day must not send twice: the selector excludes delivered pairs and the `reminder_deliveries` unique constraint rejects a duplicate insert. Tests in Tasks 4 and 21.

---

## File structure

```
supabase/migrations/20261029_00_exec_team.sql            enum value only
supabase/migrations/20261029_01_positions_seats.sql      positions columns + reseed, profiles.position_id, helper fns, legacy tables, trigger
supabase/migrations/20261029_02_season_milestones.sql    season_settings, milestones columns + seed, announcements
supabase/migrations/20261029_03_workbooks_reminders.sql  workbook_progress, reminder_preferences, reminder_deliveries
supabase/migrations/20261029_04_meetings_feedback.sql    meeting_notes, decisions, feedback_themes
supabase/migrations/20261029_05_tournament_mymist.sql    11 tournament/MyMIST tables (schema only)
scripts/convert-workbook-data.mjs                        one-time: handbook workbook-data.js → src/lib/workbook/content.ts
scripts/gen-milestone-seed.mjs                           one-time: handbook deadlines + timeline → SQL values (pasted into migration 02)
scripts/sync-handbook-data.mjs, scripts/lib/handbook-map.mjs   live data sync (emits SQL or applies via service role)
tests/db/harness.ts, tests/db/*.test.ts                  PGlite migration tests
src/lib/auth.ts            requireUser / requireBoard / requireLeadership
src/lib/constants.ts       + exec, phase ids, tier labels, audience labels
src/lib/types/index.ts     + new row types
src/lib/season.ts          season row helpers, countdown, current phase
src/lib/deadlines.ts       timing, upcoming, ICS, Google Calendar URL, Chicago date
src/lib/workbook/{types,content,progress}.ts
src/lib/roster.ts          positions × holders × progress → rows, team readiness
src/lib/announcements.ts   audience visibility
src/lib/reminders.ts       pure reminder selection
src/lib/email/{resend,templates}.ts
src/lib/csv.ts             CSV serializer
src/lib/content/{rulebook,runbook,meeting-templates,feedback-themes}.ts
src/components/portal/nav.ts (+groups), PortalSidebar.tsx, PortalTopNav.tsx, PortalHeader.tsx
src/app/portal/{positions,teams,teams/[team],directory,workbook,progress,calendar,timeline,announcements,command,meetings,handbook,feedback}/page.tsx (+ actions.ts where listed)
src/components/portal/<feature>/<Feature>Client.tsx
src/app/api/cron/reminders/route.ts, vercel.json
```

---

### Task 1: Test harness (Vitest + PGlite)

**Files:**
- Modify: `package.json` (devDependencies `vitest@^5.0.5`, `vite-tsconfig-paths@^6.1.1`, `@electric-sql/pglite@^0.5.13`; scripts `"test": "vitest run"`, `"test:watch": "vitest"`)
- Create: `vitest.config.mts`, `tests/db/harness.ts`, `tests/db/baseline.test.ts`
- Modify: `.gitignore` (add `/supabase/seed/local/`)

**Interfaces:**
- Produces: `createTestDb(opts?: { migrations?: boolean }): Promise<PGlite>` in `tests/db/harness.ts`. Loads an auth stub (schema `auth`, table `auth.users(id uuid pk, email text, raw_user_meta_data jsonb)`, function `auth.uid()` reading `request.jwt.claim.sub`, roles `anon` and `authenticated` with usage/select/insert/update/delete grants on `public`), then `supabase/schema.sql`, then `supabase/migrations/*.sql` sorted by filename, each file in its own `db.exec`. Extension `uuid_ossp` registered.
- Produces: `signUp(db, { id, email, full_name? }): Promise<void>` inserts into `auth.users` (fires `handle_new_user`).
- Produces: `asUser(db, userId: string | null): Promise<void>` runs `set role authenticated; select set_config('request.jwt.claim.sub', $1, false)` (or `reset role` for null).

- [ ] **Step 1: Install dev dependencies and write `vitest.config.mts`** with `tsconfigPaths()`, `test.environment: 'node'`, `test.include: ['src/**/*.test.ts', 'tests/**/*.test.ts']`, `test.testTimeout: 60000`.
- [ ] **Step 2: Write the failing baseline test** `tests/db/baseline.test.ts`:
  - `schema and audit migration apply`: `createTestDb()` resolves; `information_schema.tables` contains `profiles, positions, milestones, qualifiers`.
  - `signup trigger creates an applicant profile`: after `signUp(db, { id: U1, email: 'a@example.com', full_name: 'A' })`, `select role, full_name from profiles` returns `applicant`, `A`.
  - `current_user_role reflects the jwt subject`: after `asUser(db, U1)`, `select public.current_user_role()` returns `applicant`.
- [ ] **Step 3: Run `npm test`**, expected FAIL (harness missing).
- [ ] **Step 4: Implement `tests/db/harness.ts`** per the Interfaces block.
- [ ] **Step 5: Run `npm test`**, expected PASS. Run `npx tsc --noEmit` (tests are included by tsconfig `**/*.ts`), expected clean.
- [ ] **Step 6: Commit** `test: add vitest and PGlite migration harness`.

---

### Task 2: Migration 00 + 01: exec team, seats, legacy sync functions

**Files:**
- Create: `supabase/migrations/20261029_00_exec_team.sql`, `supabase/migrations/20261029_01_positions_seats.sql`
- Test: `tests/db/positions-seats.test.ts`

**Interfaces:**
- Produces (SQL): `positions` gains `slug text` (unique index `positions_slug_key`), `reports_to_position_id uuid references positions(id) on delete set null`, `role_tier user_role not null default 'member'`, `is_exec boolean not null default false`, `open_for_applications boolean not null default false`, `max_holders int`, `sort_order int not null default 0`.
- Produces (SQL): `profiles.position_id uuid references positions(id) on delete set null`.
- Produces (SQL): functions `public.is_leadership() returns boolean` (role in rd/iad/ead), `public.is_board() returns boolean` (role not null and <> 'applicant'), both `stable security definer`, granted to `authenticated, anon`.
- Produces (SQL): table `legacy_seat_assignments(email text primary key, full_name text, position_slug text, is_admin boolean not null default false, source text not null default 'handbook-2027', applied_at timestamptz)`; emails stored lowercase (check `email = lower(email)`). RLS: leadership select only.
- Produces (SQL): table `legacy_workbook_progress(email text, position_slug text, phase text, data jsonb not null default '{}', percent_complete int not null default 0, updated_at timestamptz, primary key (email, position_slug, phase))`. RLS: leadership select only. (Its rows are consumed by `apply_legacy_seat`; `workbook_progress` itself is created in Task 4, so the copy step is added there.)
- Produces (SQL): `public.assign_seat(p_profile_id uuid, p_position_slug text) returns void` — sets `profiles.position_id`, `role = positions.role_tier`, `team = positions.team`; raises `exception 'position_full'` when `max_holders is not null` and current holders (excluding this profile) `>= max_holders`; raises `'position_not_found'` for an unknown or inactive slug. `security definer`, granted to `authenticated` (the action calls it with the admin client anyway).
- Produces (SQL): `public.unassign_seat(p_profile_id uuid) returns void` — `position_id = null`, `role = 'member'` unless the current role is a leadership role, team unchanged.
- Produces (SQL): `public.apply_legacy_seat(p_profile_id uuid) returns boolean` — looks up `legacy_seat_assignments` by `lower(profiles.email)`; if found and `position_slug` resolves, calls `assign_seat`; fills `profiles.full_name` from the legacy row only when the profile's name is empty; sets `applied_at = now()`; returns true when a row matched. Idempotent.
- Produces (SQL): `public.apply_legacy_seats_all() returns int` — applies to every profile, returns the count matched.
- Produces (SQL): `handle_new_user()` redefined to insert the profile exactly as before and then `perform public.apply_legacy_seat(new.id)`.
- Produces (SQL): positions RLS: `"Leadership can manage positions"` for all using `public.is_leadership()` (replaces the RD-only policy). `"Everyone can read positions"` unchanged.
- Produces (SQL): three `legacy_seat_assignments` rows with source `'mistdallas-role-map'`: `sdin@getmistified.com → rd`, `fhafeez@getmistified.com → internal-ad`, `rshaik@getmistified.com → external-ad`, `is_admin = true`.

**Position catalog (the reseed).** Step 1 of the migration gives existing rows their slug by old title; step 2 upserts every row below `on conflict (slug) do update set title, team, phase, role_tier, is_exec, sort_order, is_active = true` (not `open_for_applications`/`max_holders`, which leadership edits); step 3 sets `reports_to_position_id` by slug; step 4 deactivates rows whose slug is still null (`Recruitment Lead`, `Training & Development Lead` from the old seed). `is_exec` is true for tiers `regional_director, internal_ad, external_ad, director`. `sort_order` is the row number below.

| slug | title | team | phase | role_tier | reports_to | old mistdallas title |
|---|---|---|---|---|---|---|
| rd | Regional Director | exec | FOUNDATIONS | regional_director | — | Regional Director |
| internal-ad | Internal Associate Director | exec | FOUNDATIONS | internal_ad | rd | Internal Associate Director |
| external-ad | External Associate Director | exec | FOUNDATIONS | external_ad | rd | External Associate Director |
| comps-lead | Competitions Lead | competitions | FOUNDATIONS | director | internal-ad | Competitions Director |
| writing-oratory | Writing & Oratory Coordinator | competitions | BUILD | chair | comps-lead | Writing & Oratory Zone Lead |
| sisters-kq | Sisters Knowledge & Quran Coordinator | competitions | BUILD | chair | comps-lead | Knowledge & Quran Zone Lead |
| knowledge-brothers | Brothers Knowledge & Quran Coordinator | competitions | BUILD | chair | comps-lead | — |
| group-projects | Group Projects Coordinator | competitions | BUILD | chair | comps-lead | Group Comps Zone Lead |
| arts | Arts Coordinator | competitions | BUILD | chair | comps-lead | Arts Zone Lead |
| esports | Esports Coordinator | competitions | BUILD | chair | comps-lead | eSports Chair |
| brackets | Brackets Coordinator | competitions | STABILIZATION | chair | comps-lead | Brackets Lead |
| judges | Judges Coordinator | competitions | BUILD | chair | comps-lead | Judges Chair |
| marketing-lead | Marketing Lead | pr | FOUNDATIONS | director | internal-ad | PR Director |
| content-creator | Content Creator | pr | BUILD | chair | marketing-lead | — |
| graphic-design | Graphic Design Coordinator | pr | BUILD | chair | marketing-lead | Graphics Chair |
| marketing-coord | Marketing Coordinator | pr | BUILD | chair | marketing-lead | Marketing Chair |
| outreach | Outreach Coordinator | pr | FOUNDATIONS | chair | marketing-lead | — |
| dt-lead | Dream Team Lead | dream_team | FOUNDATIONS | director | internal-ad | Dream Team Director |
| dream-team | Dream Team Member | dream_team | EXECUTION | dream_team | dt-lead | Dream Team Member |
| logistics-lead | Logistics Lead | logistics | FOUNDATIONS | director | internal-ad | Ops Director 1 — Command Center Lead |
| comms | Communications Coordinator | logistics | BUILD | chair | logistics-lead | Ops Director 2 — Communications Lead |
| food | Food Coordinator | logistics | BUILD | chair | logistics-lead | Food & Safety Chair |
| hospitality | Hospitality Coordinator | logistics | BUILD | chair | logistics-lead | — |
| ceremonies | Ceremonies Coordinator | programs | BUILD | chair | programs-lead | Awards & Ceremonies Chair |
| finance-lead | Finance Lead | finance | FOUNDATIONS | director | external-ad | Finance Director |
| finance-coord | Finance Coordinator | finance | BUILD | chair | finance-lead | — |
| sponsorships | Sponsorships Coordinator | finance | FOUNDATIONS | chair | finance-lead | Sponsorships Chair |
| programs-lead | Programs Lead | programs | FOUNDATIONS | director | external-ad | Programs Director |
| programs-coord | Programs Coordinator | programs | BUILD | chair | programs-lead | Workshops Chair |
| tech-lead | Tech Lead | registration | FOUNDATIONS | director | external-ad | — |
| tech-coord | Tech Coordinator | registration | BUILD | chair | tech-lead | — |
| registration | Registration Coordinator | registration | FOUNDATIONS | chair | tech-lead | Registration Director |
| sports-lead | Sports Co-Lead | sports | FOUNDATIONS | director | external-ad | Sports Director |
| sports-sisters | Sisters Sports Coordinator | sports | BUILD | chair | sports-lead | Sisters Sports Lead |
| sports-brothers | Brothers Sports Coordinator | sports | BUILD | chair | sports-lead | Brothers Sports Lead |

- [ ] **Step 1: Write the failing test** `tests/db/positions-seats.test.ts`. Before migrations it inserts the 30 old SETUP.md position titles (copy the `INSERT INTO positions` block from SETUP.md) so the reseed is tested against the live shape; use `createTestDb({ migrations: false })`, insert, then apply migrations with a harness helper `applyMigrations(db)` (add it to the harness in this task).
  - `reseeds 35 active positions with unique slugs`: `select count(*) from positions where is_active` = 35; `count(distinct slug)` = 35.
  - `maps old titles onto slugs instead of duplicating`: `select count(*) from positions where title = 'Regional Director'` = 1 and its slug is `rd`; `Recruitment Lead` has `is_active = false` and null slug.
  - `resolves reporting lines`: `comms` → `logistics-lead`; `rd` → null.
  - `signup applies a legacy seat case-insensitively`: insert `legacy_seat_assignments ('zz@example.com','Zed','comms',false)`; `signUp(db, { email: 'ZZ@Example.com' })`; profile has `position_id` of `comms`, `role = 'chair'`, `team = 'logistics'`, `full_name = 'Zed'`; `applied_at` not null.
  - `role-map seats are seeded`: `signUp(db, { email: 'sdin@getmistified.com' })` → role `regional_director`, team `exec`.
  - `apply_legacy_seats_all is idempotent`: returns 2 twice; no row changes between calls.
  - `assign_seat enforces max_holders`: set `max_holders = 1` on `rd`; assign U1; assigning U2 rejects with message containing `position_full`; U2 unchanged.
  - `unassign_seat keeps leadership roles`: unassign U1 (rd) → `position_id` null, role still `regional_director`; unassign a `chair` → role `member`.
  - `enum has exec`: `select enum_range(null::team_type)` includes `exec`.
- [ ] **Step 2: Run `npm test`**, expected FAIL (no migration files).
- [ ] **Step 3: Write both migrations** per the Interfaces block and catalog. Generate the 35-row `insert ... values` block from the table (write it by hand or with a throwaway script; it is committed as SQL).
- [ ] **Step 4: Run `npm test`**, expected PASS.
- [ ] **Step 5: Commit** `db: seats, position catalog, legacy seat sync functions`.

---

### Task 3: Migration 02: season settings, milestones, announcements

**Files:**
- Create: `supabase/migrations/20261029_02_season_milestones.sql`, `scripts/gen-milestone-seed.mjs`
- Test: `tests/db/season-milestones.test.ts`

**Interfaces:**
- Produces (SQL): `season_settings(year int primary key, tournament_start date not null, tournament_end date not null, applications_due date, foundations_start date not null, build_start date not null, stabilization_start date not null, execution_start date not null, season_end date not null, is_current boolean not null default false)`; partial unique index on `is_current where is_current`. Seed 2027: tournament `2027-03-25`..`2027-03-28`, applications_due `2026-09-30`, foundations `2026-09-01`, build `2026-10-15`, stabilization `2026-12-01`, execution `2027-02-01`, season_end `2027-04-11`, `is_current = true`. RLS: anyone can read; leadership manage.
- Produces (SQL): `milestones` gains `legacy_id text` (unique index), `phase position_phase`, `priority text not null default 'medium' check in (low, medium, high, critical)`, `deadline_type text not null default 'Deadline'`, `owner_label text not null default 'All Teams'`, `send_reminders boolean not null default true`, `date_label text`, `created_by uuid references profiles(id) on delete set null`, `updated_at timestamptz not null default now()` (+ `milestones_updated_at` trigger using the existing `update_updated_at()`).
- Produces (SQL): 45 seeded milestones upserted `on conflict (legacy_id)`: the 8 handbook `deadline_events` (same ids, titles, details, phases, dates, labels, priorities, types, owners) and the 37 `MASTER_MILESTONES` with: `phase` from `due_date` against the 2027 season boundaries; `deadline_type` from `type` (`default → 'Deadline'`, `hard → 'Hard Deadline'`, `review → 'Check-in'`, `registration → 'Registration'`, `tournament → 'Event Week'`, `postevent → 'Post-Event'`); `priority` (`hard, tournament → 'critical'`, `registration → 'high'`, `review, default → 'medium'`, `postevent → 'low'`); `owner_label 'All Teams'`; `date_label` = handbook `date`; `description` = handbook `detail`; `is_recurring = false`; `team = null`.
- Produces (SQL): `announcements(id uuid pk default uuid_generate_v4(), title text not null, body text not null default '', audience text not null default 'all' check in ('all','board','leadership','team'), audience_team team_type, priority text not null default 'medium' check in (low, medium, high, critical), is_active boolean not null default true, created_by uuid references profiles(id) on delete set null, created_at, updated_at)` + updated_at trigger. Seed one row with `legacy_id 'welcome'`? No: announcements get `legacy_id text unique` too, seeded `'welcome'` with the handbook's title/body/`audience 'all'`/`medium`/active. RLS: authenticated read where `is_active` (plus leadership read all); leadership manage.
- Produces: `scripts/gen-milestone-seed.mjs <path-to-handbook-index.html>` prints the 45-row `values` list (reads `deadline_events` rows from the handbook SQL file and `MASTER_MILESTONES` by regex from `index.html`). Run once; output pasted into the migration.

- [ ] **Step 1: Write the failing test** `tests/db/season-milestones.test.ts`:
  - `seeds the current season`: `select * from season_settings where is_current` has `year 2027`, `tournament_start '2027-03-25'`.
  - `seeds 45 milestones with phases`: `count(*) where legacy_id is not null` = 45; `nov-30-nationals` has phase `BUILD`, priority `critical`, deadline_type `Hard Deadline`; `execution-run-show` has owner_label `All Teams`, date_label `Event Week`; `jan-01-reg-open` has phase `STABILIZATION`; `apr-11-reports` has phase `EXECUTION`.
  - `milestone seed is idempotent`: re-exec the migration file; count still 45.
  - `seeds the welcome announcement`: one row, `legacy_id = 'welcome'`, audience `all`.
  - `announcement audience check rejects garbage`: insert with audience `'friends'` throws.
- [ ] **Step 2: Run `npm test`**, expected FAIL.
- [ ] **Step 3: Write `scripts/gen-milestone-seed.mjs`**, run it against `/Users/Aamir/Documents/mistdallas2027handbook`, paste its output into the migration, and write the rest of the migration.
- [ ] **Step 4: Run `npm test`**, expected PASS.
- [ ] **Step 5: Commit** `db: season settings, milestone extensions and seed, announcements`.

---

### Task 4: Migration 03: workbook progress and reminders

**Files:**
- Create: `supabase/migrations/20261029_03_workbooks_reminders.sql`
- Test: `tests/db/workbooks-reminders.test.ts`

**Interfaces:**
- Produces (SQL): `workbook_progress(user_id uuid references profiles(id) on delete cascade, position_slug text not null, phase text not null check in ('foundations','build','stabilization','execution'), data jsonb not null default '{}', percent_complete int not null default 0 check between 0 and 100, updated_at timestamptz not null default now(), primary key (user_id, position_slug, phase))`. RLS: board read all; owner insert/update own rows (`user_id = auth.uid()`); leadership manage.
- Produces (SQL): `reminder_preferences(user_id uuid primary key references profiles(id) on delete cascade, email_enabled boolean not null default true, days_before int not null default 7 check in (1,3,7,14), created_at, updated_at)`. RLS: owner read/write own.
- Produces (SQL): `reminder_deliveries(id bigserial pk, user_id uuid references profiles(id) on delete cascade, milestone_id uuid references milestones(id) on delete cascade, reminder_date date not null default current_date, sent_at timestamptz not null default now(), unique (user_id, milestone_id, reminder_date))`. RLS: leadership read.
- Produces (SQL): `apply_legacy_seat` is redefined (`create or replace`) to also copy matching `legacy_workbook_progress` rows into `workbook_progress` with `on conflict do nothing`.

- [ ] **Step 1: Write the failing test**:
  - `owner can upsert own progress, not another's`: `asUser(db, U1)`; insert row for U1 ok; insert for U2 throws (RLS); `reset role`.
  - `phase check rejects unknown phase`.
  - `duplicate reminder delivery is rejected`: two inserts same (user, milestone, date) → second throws.
  - `legacy workbook progress is copied on seat apply`: insert `legacy_seat_assignments` + `legacy_workbook_progress` for `zz@example.com`/`comms`/`foundations` with `data '{"notes":"hi"}'`; `signUp`; `workbook_progress` has that row.
- [ ] **Step 2: Run `npm test`**, expected FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run `npm test`**, expected PASS.
- [ ] **Step 5: Commit** `db: workbook progress, reminder preferences and deliveries`.

---

### Task 5: Migration 04: meetings, decisions, feedback themes

**Files:**
- Create: `supabase/migrations/20261029_04_meetings_feedback.sql`
- Test: `tests/db/meetings-feedback.test.ts`

**Interfaces:**
- Produces (SQL): `meeting_notes(id uuid pk, title text not null, meeting_date date not null, team team_type, agenda text not null default '', blockers text not null default '', action_items text not null default '', created_by uuid references profiles(id) on delete set null, created_at, updated_at)`.
- Produces (SQL): `decisions(id uuid pk, title text not null, category text not null default 'General' check in ('General','Budget','Venue','Roles','Competitions','Marketing','Programs','Registration','Sports','Event Weekend'), decision text not null default '', rationale text not null default '', owner_label text not null default '', team team_type, decided_on date not null default current_date, created_by uuid references profiles(id) on delete set null, created_at, updated_at)`.
- RLS for both: board read all; insert/update/delete allowed when `is_leadership()` or (`current_user_role() in ('director','chair','lead')` and `team = (select team from profiles where id = auth.uid())`) — implement the team lookup with a new `public.current_user_team() returns team_type stable security definer`.
- Produces (SQL): `feedback_themes(id uuid pk, slug text unique, theme text not null, source text not null default '', sentiment text not null default '', owner_label text not null default '', phase position_phase, status text not null default 'Open', color text, action text not null default '', sort_order int not null default 0, created_by, created_at, updated_at)`; seed the handbook's 5 themes (`communication, room-flow, training, registration, accountability`) with their text, phase mapped to the enum, `on conflict (slug) do update`. RLS: board read; leadership manage.

- [ ] **Step 1: Write the failing test**: `chair can insert a note for own team only` (U1 chair team `logistics` via `assign_seat(U1,'comms')`; insert `team 'logistics'` ok; `team 'finance'` throws); `member cannot insert decisions`; `feedback themes seeded` = 5 with `training` phase `FOUNDATIONS`.
- [ ] **Step 2: Run**, FAIL. **Step 3: Write migration.** **Step 4: Run**, PASS.
- [ ] **Step 5: Commit** `db: meeting notes, decisions, feedback themes`.

---

### Task 6: Migration 05: tournament and MyMIST schema

**Files:**
- Create: `supabase/migrations/20261029_05_tournament_mymist.sql`
- Test: `tests/db/tournament.test.ts`

**Interfaces:**
- Produces (SQL): the 11 tables from the handbook's `supabase-tournament-only.sql` and `supabase-mymist-only.sql` with identical columns, indexes and checks, except: `created_by`/`scanned_by` reference `profiles(id)`; every "admins can …" policy becomes `using (public.is_leadership()) with check (public.is_leadership())`; "anyone can view" policies become board-read (`public.is_board()`); `nfc_scan_logs` insert allowed for board. No sample room rows.

- [ ] **Step 1: Write the failing test**: all 11 table names exist; `competition_blocks` status check rejects `'bogus'`; a `member` can insert into `nfc_scan_logs` but not `tournament_rooms`.
- [ ] **Step 2: Run**, FAIL. **Step 3: Write migration.** **Step 4: Run**, PASS.
- [ ] **Step 5: Commit** `db: tournament and MyMIST tables (schema only)`.

---

### Task 7: Workbook content conversion

**Files:**
- Create: `scripts/convert-workbook-data.mjs`, `src/lib/workbook/types.ts`, `src/lib/workbook/content.ts` (generated, committed)
- Test: `src/lib/workbook/content.test.ts`, `tests/db/positions-content-sync.test.ts`

**Interfaces:**
- Produces: in `types.ts`: `PhaseId = 'foundations' | 'build' | 'stabilization' | 'execution'`; `Framework = { type: 'table'; title: string; columns: string[]; rows: number }`; `WeeklyPlanItem = { week: string; tasks: string }`; `WorkbookPhase = { focus: string; responsibilities: string[]; deliverables: string[]; frameworks: Framework[]; weeklyPlan: WeeklyPlanItem[]; reflections: string[]; risks: string[] }`; `RoleWorkbook = { slug: string; title: string; team: Team; startPhase: PhaseId; badge: string; reportsTo: string | null; manages: string[]; phases: Record<PhaseId, WorkbookPhase> }`; `PhaseMeta = { id: PhaseId; label: string; shortLabel: string; dates: string; tagline: string; color: string }`.
- Produces: in `content.ts`: `PHASE_META: Record<PhaseId, PhaseMeta>`, `BOARD_STANDARD: string[]`, `WORKBOOK_ROLES: Record<string, RoleWorkbook>` (34 entries), `workbookFor(slug: string | null | undefined): RoleWorkbook | null`.
- Produces: `scripts/convert-workbook-data.mjs <path-to-workbook-data.js>` evaluates the file in a `node:vm` context with a fake `window`, applies fixes (team map `exec→exec, marketing→pr, dreamteam→dream_team, operations→logistics`, others identity; `outreach.team = 'pr'`, `reportsTo` → `marketing-lead`; `ceremonies.team = 'programs'`, `reportsTo` → `programs-lead`; every `reportsTo` / `manages` free-text name resolved to a slug by title match, with `'Internal AD' → internal-ad`, `'External AD' → external-ad`, `'Sports Lead' → sports-lead`, `'Graphic Design Coord' → graphic-design`, `'Outreach Coord' → outreach`, `'Communications Coord' → comms`, `'Food Coord' → food`, `'Ceremonies Coord' → ceremonies`, `'Hospitality Coord' → hospitality`, `'Finance Coord' → finance-coord`, `'Sponsorships Coord' → sponsorships`, `'Programs Coord' → programs-coord`, `'Sisters Sports Coord' → sports-sisters`, `'Brothers Sports Coord' → sports-brothers`, `'MIST Nationals' → null`, `'All Leads' → dropped`, `'Training & Development Coord' → dropped`), and writes `content.ts` with a `// Generated by scripts/convert-workbook-data.mjs — edit this file directly from now on` header.

- [ ] **Step 1: Write the failing tests**:
  - `content.test.ts`: 34 roles; each has all four phases; every `reportsTo` is null or a key of `WORKBOOK_ROLES`; every `manages` entry is a key; `outreach.team === 'pr'`; `ceremonies.reportsTo === 'programs-lead'`; every team is in the `Team` union plus `exec`; no role has an empty `deliverables` array in its `startPhase`.
  - `positions-content-sync.test.ts`: the set of slugs in `supabase/migrations/20261029_01_positions_seats.sql` (regex over the values block) equals `Object.keys(WORKBOOK_ROLES)` ∪ `{'dream-team'}`; for each shared slug, the SQL `team` and the content `team` agree.
- [ ] **Step 2: Run**, FAIL. **Step 3: Write the script, run it, commit the generated file.** **Step 4: Run**, PASS.
- [ ] **Step 5: Commit** `feat(workbook): typed workbook content generated from the handbook`.

---

### Task 8: Workbook progress logic

**Files:**
- Create: `src/lib/workbook/progress.ts`
- Test: `src/lib/workbook/progress.test.ts`

**Interfaces:**
- Produces: `WorkbookPhaseData = { checks: Record<string, true>; notes: string; fields: Record<string, string> }`; `emptyPhaseData(): WorkbookPhaseData`.
- Produces: `deliverableId(text: string, ordinal = 0): string` — `d-` + 8 hex chars of FNV-1a over the trimmed, whitespace-collapsed, lowercased text, plus `-<ordinal>` only when `ordinal > 0`.
- Produces: `deliverableIds(deliverables: string[]): string[]` — assigns ordinals to repeated texts so ids are unique within a phase.
- Produces: `phasePercent(phase: WorkbookPhase, data: WorkbookPhaseData | null): number` (0 when no deliverables; rounded).
- Produces: `overallPercent(role: RoleWorkbook, byPhase: Partial<Record<PhaseId, WorkbookPhaseData>>): number` — mean of the four phase percents, rounded.
- Produces: `fieldKey(kind: 'framework' | 'weekly' | 'reflection', ...indices: number[]): string` → `framework-0-2-1`, `weekly-0`, `reflection-1` (same shape the handbook used, so legacy `fields` carry over).
- Produces: `convertLegacyProgress(role: RoleWorkbook, phase: PhaseId, legacy: { checks?: boolean[]; notes?: string; fields?: Record<string, string> }): WorkbookPhaseData` — index-aligned `checks[i] === true` → `checks[deliverableIds(deliverables)[i]] = true`.
- Produces: `deliverableDueDate(text: string, season: { foundations_start: string; season_end: string }): string | null` — parses a leading `Mon D` (`Oct 1:`, `Mar 26–28:` → first day, `Oct 15+` → Oct 15) into an ISO date in the season's year span (Sep–Dec → start year, Jan–Aug → end year); null when unparseable (`Mid-Ramadan`, `Ongoing`).
- Produces: `nextActions(role, byPhase, season, today: string, limit = 5): { phase: PhaseId; text: string; due: string; overdue: boolean }[]` — unchecked deliverables with a due date within 14 days or overdue, sorted by date.

- [ ] **Step 1: Write the failing tests**: ids stable across calls and insensitive to surrounding whitespace/case; duplicates get `-1`, `-2`; reordering deliverables keeps every id; editing one text changes only its id; `phasePercent` with 4 deliverables and 1 check = 25; `overallPercent` with one phase at 100 and others empty = 25; `convertLegacyProgress` with `checks: [false, true]` marks only the second id; `deliverableDueDate('Oct 1: Board structure…', season2027) === '2026-10-01'`, `'Mar 26–28: Run all rounds'` → `'2027-03-26'`, `'Oct 15+: Confirm'` → `'2026-10-15'`, `'Mid-Ramadan: cutoff'` → null; `nextActions` returns an overdue item first and excludes checked ones.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement.** **Step 4: Run**, PASS.
- [ ] **Step 5: Commit** `feat(workbook): stable deliverable ids and progress math`.

---

### Task 9: Deadlines, timing and calendar export

**Files:**
- Create: `src/lib/deadlines.ts`
- Test: `src/lib/deadlines.test.ts`

**Interfaces:**
- Consumes: `Milestone` type (Task 10 adds fields; this module only needs `{ id: string; title: string; description: string | null; target_date: string | null; legacy_id?: string | null }`, declare a local `DeadlineLike` type).
- Produces: `localDateIso(now: Date, timeZone = 'America/Chicago'): string` (YYYY-MM-DD via `Intl.DateTimeFormat('en-CA')`).
- Produces: `addDaysIso(iso: string, days: number): string`; `compactDate(iso: string): string` (`20270325`).
- Produces: `deadlineTiming(targetDate: string | null, todayIso: string): { label: string; isOverdue: boolean; daysAway: number | null }` with labels `No date`, `N days overdue` / `1 day overdue`, `Due today`, `Due tomorrow`, `N days away`.
- Produces: `upcomingDeadlines<T extends DeadlineLike>(items: T[], todayIso: string, limit = 5): T[]` (dated, not overdue, ascending); `overdueDeadlines<T>(items, todayIso): T[]`; `dueWithinDays<T>(items, todayIso, days): T[]`.
- Produces: `buildIcsCalendar(items: DeadlineLike[], opts: { portalUrl: string; now: Date }): string` — exactly the handbook's output: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//MIST Dallas//Organizer Portal//EN`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`, per event `UID:<legacy_id or id>@mist-dallas-portal`, `DTSTAMP`, all-day `DTSTART;VALUE=DATE` / `DTEND` (+1 day), `SUMMARY:MIST Dallas: <title>`, `DESCRIPTION:<description>\n\nPortal: <portalUrl>`, CRLF line endings, `escapeIcs` escaping `\`, `;`, `,`, newlines; items with null dates skipped.
- Produces: `googleCalendarUrl(item: DeadlineLike, portalUrl: string): string | null`.

- [ ] **Step 1: Write the failing tests**: timing labels for -3, 0, 1, 5 days and null; `upcomingDeadlines` skips null dates and overdue, respects limit and order; `buildIcsCalendar` for one item with a comma and newline in the description equals an exact expected string; `googleCalendarUrl` contains `dates=20270325/20270326` and `action=TEMPLATE`; `localDateIso(new Date('2027-03-26T03:30:00Z'))` is `2027-03-25` (Chicago is UTC-5 then).
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement.** **Step 4: Run**, PASS.
- [ ] **Step 5: Commit** `feat: deadline timing and ICS/Google Calendar export helpers`.

---

### Task 10: Shared auth helpers, types, constants, navigation

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/season.ts`, `src/lib/announcements.ts`
- Modify: `src/lib/types/index.ts`, `src/lib/constants.ts`, `src/components/portal/nav.ts`, `src/components/portal/PortalSidebar.tsx`, `src/components/portal/PortalTopNav.tsx`, `src/components/portal/PortalHeader.tsx`, and every existing `src/app/portal/**/page.tsx` + `src/app/onboarding/page.tsx` (replace the copy-pasted `getUser` + redirect block with the helpers)
- Test: `src/components/portal/nav.test.ts`, `src/lib/announcements.test.ts`, `src/lib/season.test.ts`

**Interfaces:**
- Produces (`auth.ts`): `requireUser(): Promise<{ user: User; profile: Profile; supabase: SupabaseClient; admin: SupabaseClient }>` (redirects `/login` when no user; reads the profile with the admin client; redirects `/onboarding` when `!profile.onboarded` is NOT done here, the layout already does that); `requireBoard()` same but redirects `/portal` when `profile.role === 'applicant'`; `requireLeadership()` redirects `/portal` unless `isLeadership(profile.role)`; `requireRole(roles: readonly string[])` generic used by the other two. Server actions use `getActor(): Promise<{ user, profile, admin } | null>` (no redirect) and return `{ success: false, error }` on failure.
- Produces (`constants.ts`): `TEAM_LABELS` adds `exec: 'Executive'`, changes `pr → 'Marketing'`, `logistics → 'Operations'`; `TEAM_ORDER: Team[]` (exec first); `PHASE_IDS`, `PHASE_ENUM: Record<PhaseId, PositionPhase>`, `phaseIdFromEnum(p: PositionPhase): PhaseId`; `ROLE_TIER_LABELS: Record<UserRole, string>`; `AUDIENCE_LABELS`; `BOARD_ROLES: readonly string[]` (all roles except `applicant`); `DIRECTOR_PLUS = [...LEADERSHIP_ROLES, 'director']`; `TEAM_MANAGERS = [...DIRECTOR_PLUS, 'chair', 'lead']`.
- Produces (`types/index.ts`): `Team` adds `'exec'`; `Position` adds `slug: string | null; reports_to_position_id: string | null; role_tier: UserRole; is_exec: boolean; open_for_applications: boolean; max_holders: number | null; sort_order: number`; `Profile` adds `position_id: string | null`; `Milestone` adds `legacy_id, phase: PositionPhase | null, priority, deadline_type, owner_label, send_reminders, date_label, created_by, updated_at`; new `SeasonSettings`, `Announcement`, `WorkbookProgressRow`, `ReminderPreference`, `MeetingNote`, `Decision`, `FeedbackTheme`, `LegacySeatAssignment`.
- Produces (`season.ts`): `getCurrentSeason(supabase): Promise<SeasonSettings | null>`; `daysUntil(iso: string, todayIso: string): number`; `currentPhase(season: SeasonSettings, todayIso: string): PhaseId`; `seasonLabel(season): string` (`"2026–27"`).
- Produces (`announcements.ts`): `announcementVisible(a: Pick<Announcement,'audience'|'audience_team'|'is_active'>, viewer: { role: UserRole; team: Team | null }): boolean` — inactive → false unless leadership; `all` → everyone; `board` → `isBoard`; `leadership` → leadership; `team` → leadership or `viewer.team === audience_team` (null team → leadership only).
- Produces (`nav.ts`): `PortalNavItem` gains `group: 'main' | 'recruiting' | 'season' | 'leadership'`; `PORTAL_NAV` becomes (href, label, group, roles): `/portal` Dashboard main ALL; `/portal/workbook` Workbook main BOARD; `/portal/calendar` Calendar main BOARD; `/portal/teams` Teams main BOARD; `/portal/apply` Apply recruiting ALL; `/portal/review` Applications recruiting LEADERSHIP; `/portal/interviews` Interviews recruiting LEADERSHIP; `/portal/timeline` Timeline season BOARD; `/portal/progress` Progress season BOARD; `/portal/directory` Directory season BOARD; `/portal/planning` Planning season TEAM_MANAGERS; `/portal/meetings` Meetings season BOARD; `/portal/handbook` Handbook season BOARD; `/portal/command` Command Center leadership DIRECTOR_PLUS; `/portal/positions` Positions leadership LEADERSHIP; `/portal/announcements` Announcements leadership LEADERSHIP; `/portal/feedback` Feedback leadership LEADERSHIP; `/portal/insights` Insights leadership DIRECTOR_PLUS; `/portal/settings` Settings main ALL. `visibleNav` unchanged in signature; add `navGroups(role, opts): { group, label, items }[]` (groups in order main, recruiting, season, leadership; empty groups dropped); `titleFor(pathname): string` replaces `PortalHeader`'s `TITLES` map (longest matching href wins, `/portal/teams/competitions` → "Teams").
- Sidebar renders group headers (uppercase 10px muted) between groups; top nav renders the `main` items inline and the other groups as click-to-open dropdowns labelled by group (reuse the existing profile-menu dropdown styling).

- [ ] **Step 1: Write the failing tests**:
  - `nav.test.ts`: applicant sees exactly Dashboard, Apply, Settings; member sees no leadership group; director sees Command Center and Insights but not Positions; regional_director sees everything; `titleFor('/portal/teams/sports') === 'Teams'`, `titleFor('/portal') === 'Dashboard'`.
  - `announcements.test.ts`: the matrix in the Interfaces block (6 cases incl. null team).
  - `season.test.ts`: `currentPhase` on `2026-10-20` is `build`, on `2027-02-01` is `execution`; `daysUntil('2027-03-25','2027-03-20') === 5`.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement all files**, refactor existing pages to the helpers (behaviour unchanged), update `AD_TEAMS` so neither AD list includes `exec`.
- [ ] **Step 4: Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`**, all clean.
- [ ] **Step 5: Commit** `feat(portal): shared auth helpers, extended types, grouped navigation`.

---

### Task 11: Auth callback without the role map

**Files:**
- Modify: `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: migration 01's trigger and `legacy_seat_assignments` (the three role-map emails are seeded there).
- Produces: the callback no longer carries `ROLE_MAP` and never writes `role`; for every signed-in user (not only internal-domain) it updates `full_name` (only when the profile's name is empty) and `avatar_url` with the admin client, then redirects as before.

- [ ] **Step 1: Edit the route** per the Interfaces block; keep `safeNextPath` and the redirect logic byte-for-byte.
- [ ] **Step 2: Run `npx tsc --noEmit` and `npm run lint`**, clean.
- [ ] **Step 3: Commit** `fix(auth): seats come from the database, not a hardcoded role map`.

---

### Task 12: Handbook data sync script

**Files:**
- Create: `scripts/sync-handbook-data.mjs`, `scripts/lib/handbook-map.mjs`
- Test: `scripts/lib/handbook-map.test.mjs` (vitest picks up `scripts/**/*.test.mjs`; add the glob to `vitest.config.mts`)
- Modify: `.env.local.example` (document `HANDBOOK_SUPABASE_URL`, `HANDBOOK_SUPABASE_ANON_KEY` as optional, defaulting to the public handbook project values)

**Interfaces:**
- Produces (`handbook-map.mjs`): `LEGACY_SLUG_ALIASES = { groups: 'group-projects', communications: 'comms' }`; `mapProfile(row: { email, full_name, role_id, is_admin }, knownSlugs: Set<string>): { email: string; full_name: string | null; position_slug: string | null; is_admin: boolean; warning?: string }` (lowercases email, applies aliases, warns `unknown role_id` or `email domain looks misspelled` when the domain is within edit distance 1 of `getmistified.com` but not equal); `mapWorkbookRow(row: { user_id, phase, data, percent_complete, updated_at }, profilesById: Map<string, { email, position_slug }>, roles: Record<string, RoleWorkbook-like>): LegacyProgressRow | null` (uses `convertLegacyProgress` semantics reimplemented in JS: index-aligned checks → `deliverableIds`; returns null when the profile has no slug); `toSql(seats, progress): string` (idempotent upserts into `legacy_seat_assignments` and `legacy_workbook_progress`, values escaped); `deliverableId` / `deliverableIds` duplicated in JS with a test asserting equality with the TS version for three sample strings.
- Produces (`sync-handbook-data.mjs`): modes `--out <file>` (default `supabase/seed/local/legacy_handbook.sql`), `--from <dir>` (read `profiles.json`, `workbook_progress.json` instead of fetching), `--apply` (upsert rows via PostgREST on `NEXT_PUBLIC_SUPABASE_URL` with `SUPABASE_SERVICE_ROLE_KEY`, `Prefer: resolution=merge-duplicates`, then `POST /rest/v1/rpc/apply_legacy_seats_all` and print the matched count). Always prints a summary: rows fetched, seats mapped, warnings (incl. the typo-domain report), unmatched role ids. Reads `WORKBOOK_ROLES` deliverables by regex-free means: imports `content.ts`? Not possible from `.mjs`; instead the script shells `node --experimental-strip-types`? No. Decision: the script reads `src/lib/workbook/content.ts` as text and extracts, per slug, the `deliverables: [...]` arrays per phase with a small tolerant parser (`JSON5`-like via `new Function` after stripping the `export` keywords and the type annotation); test this extraction in `handbook-map.test.mjs` against the real file (34 slugs found, `rd.foundations` has 4 deliverables).

- [ ] **Step 1: Write the failing tests** for `mapProfile` (alias `groups`, lowercase, typo-domain warning for `getmistfied.com`, unknown role warning, null role → null slug), `mapWorkbookRow` (handbook's real row shape `{"notes":"","checks":[false],"fields":{"framework-0-0-2":""}}` → `checks {}` and `fields` carried), `toSql` (two rows, quote escaping, `on conflict (email) do update`), content extraction.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement.** **Step 4: Run**, PASS.
- [ ] **Step 5: Run the script for real** with `--from` pointing at the scratchpad export (`/private/tmp/claude-506/-Users-Aamir-Documents-mistdallas/da073498-1214-44c3-b89f-61bd6ab2bfa9/scratchpad/handbook-export`) and confirm the summary reports 29 profiles, 22 seats, 1 progress row, and names the typo-domain email; confirm `supabase/seed/local/legacy_handbook.sql` is untracked by `git status`.
- [ ] **Step 6: Load that SQL into PGlite** with a one-off test-style script (not committed) and run `apply_legacy_seats_all()` after inserting `auth.users` rows for three of the emails; confirm 3 seats applied.
- [ ] **Step 7: Commit** `feat: handbook data sync script (roster stays out of git)`.

---

### Task 13: Positions admin page

**Files:**
- Create: `src/app/portal/positions/page.tsx`, `src/app/portal/positions/actions.ts`, `src/components/portal/positions/PositionsClient.tsx`

**Interfaces:**
- Consumes: `requireLeadership`, `assign_seat` / `unassign_seat` RPCs, `TEAM_LABELS`, `ROLE_TIER_LABELS`, `phaseIdFromEnum`.
- Produces (actions): `setPositionOpen(positionId: string, open: boolean): Promise<Result>`; `setMaxHolders(positionId: string, max: number | null): Promise<Result>`; `assignSeat(profileId: string, positionSlug: string): Promise<Result>` (maps `position_full` → "That seat is full."); `unassignSeat(profileId: string): Promise<Result>`. All call `revalidatePath('/portal/positions')` and `revalidatePath('/portal/teams')`. `Result = { success: true } | { success: false; error: string }`.
- Page: loads active positions ordered by `sort_order` with their holders (`profiles` where `position_id`), all board + applicant profiles (`id, full_name, email, role, position_id`) for the assign picker, grouped by team in `TEAM_ORDER`. Client: per-position row with title, tier label, start phase, holder chips (name + unassign button), "Assign…" select of profiles without a seat, open-for-applications toggle, max holders number input (blank = unlimited).

- [ ] **Step 1: Build page, actions, client** following `ReviewDashboard`'s card/list styling; actions use `admin.rpc('assign_seat', { p_profile_id, p_position_slug })`.
- [ ] **Step 2: Verify** `npx tsc --noEmit`, `npm run lint`; start `npm run dev` with placeholder env and confirm `/portal/positions` returns the 503 "Supabase is not configured" (proves the route compiles and is proxied); stop the server.
- [ ] **Step 3: Commit** `feat(portal): positions admin with seat assignment and open flags`.

---

### Task 14: Decision emails and seat assignment on accept

**Files:**
- Create: `src/lib/email/resend.ts`, `src/lib/email/templates.ts`, `src/app/portal/review/actions.ts`
- Modify: `src/components/portal/review/ReviewDashboard.tsx`, `src/app/portal/review/page.tsx`, `.env.local.example`
- Test: `src/lib/email/templates.test.ts`

**Interfaces:**
- Produces (`resend.ts`): `isEmailConfigured(): boolean` (`RESEND_API_KEY` and `RESEND_FROM_EMAIL` set); `sendEmail({ to, subject, html }): Promise<{ ok: true; id: string } | { ok: false; error: string }>` via `fetch('https://api.resend.com/emails')`.
- Produces (`templates.ts`): `escapeHtml(s: string): string`; `decisionEmail(input: { decision: 'accepted' | 'rejected' | 'redirected_dream_team'; applicantName: string; roleTitle: string | null; siteUrl: string }): { subject: string; html: string }` — accepted: subject `Welcome to Our Orbit — MIST Dallas 2027`, CTA link `${siteUrl}/login` "Open the Board Portal", no invite link; rejected: subject `MIST Dallas 2027 Application Update`, the handbook's heartfelt body incl. the January Dream Team paragraph; redirected: subject `Join the MIST Dallas 2027 Dream Team`, body says they are invited to the Dream Team and links `${siteUrl}/login`. `reminderEmail(input: { fullName: string; title: string; dateLabel: string; detail: string; daysBefore: number; siteUrl: string }): { subject; html }` — subject `MIST Dallas deadline in N day(s): <title>`, CTA `${siteUrl}/portal/calendar`, footer link `${siteUrl}/portal/settings`.
- Produces (`review/actions.ts`): `decideApplication(input: { applicationId: string; status: ApplicationStatus; positionId?: string | null }): Promise<{ success: true; emailed: boolean; emailError?: string } | { success: false; error: string }>` — leadership only; validates status; for `accepted`: resolves the seat (`positionId` or the rank-1 ranking), calls `assign_seat` for `applicant_id` (error → returns it, status untouched), then updates status and `alternate_position_id` when the seat differs from rank 1; for other statuses just updates; for `accepted | rejected | redirected_dream_team` sends the decision email when configured (`SITE_URL` from `NEXT_PUBLIC_SITE_URL` falling back to `https://mistdallas.org`); `revalidatePath('/portal/review')`.
- `ReviewDashboard`: `updateStatus` calls `decideApplication`; the Accept button opens a one-line position chooser defaulting to rank 1 (options: the applicant's ranked positions plus any active position); toast shows "Accepted · email sent" / "Accepted · email not configured".

- [ ] **Step 1: Write the failing tests**: `escapeHtml('<b>&"')`; accepted html contains `Welcome to Our Orbit, Zed.` and no `generateLink`; a name `<script>` is escaped in all three; reminder subject for 1 day is singular; reminder html contains the calendar URL.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement lib, action, UI.** **Step 4: Run**, PASS; `tsc`, `lint` clean.
- [ ] **Step 5: Commit** `feat(review): accept assigns the seat and sends decision emails`.

---

### Task 15: Apply page gated by open seats and season due date

**Files:**
- Modify: `src/app/portal/apply/page.tsx`, `src/app/portal/apply/actions.ts`, `src/components/portal/apply/ApplicationForm.tsx`

**Interfaces:**
- Page passes only positions with `is_active and open_for_applications` (ordered by `sort_order`) plus `season: SeasonSettings | null`. For internal applicants, `current_position_id` options come from all active positions (unchanged).
- `submitApplication` additionally rejects a ranked position whose `open_for_applications` is false with "That position isn't accepting applications."
- `ApplicationForm`: shows "Applications due <Mon D, YYYY>" under the heading when `season?.applications_due`; when the open list is empty and the cycle is open, shows "No positions are open right now." instead of the rankings step (submit disabled).

- [ ] **Step 1: Implement.** **Step 2: `tsc`, `lint`.** **Step 3: Commit** `feat(apply): only open seats are rankable; show the season due date`.

---

### Task 16: Roster logic, Teams, Team detail, Directory

**Files:**
- Create: `src/lib/roster.ts`, `src/app/portal/teams/page.tsx`, `src/app/portal/teams/[team]/page.tsx`, `src/app/portal/directory/page.tsx`, `src/components/portal/teams/TeamsOverview.tsx`, `src/components/portal/teams/TeamDetail.tsx`, `src/components/portal/directory/DirectoryClient.tsx`
- Test: `src/lib/roster.test.ts`

**Interfaces:**
- Produces (`roster.ts`): `RosterRow = { positionId: string; slug: string; title: string; team: Team; startPhase: PhaseId; tier: UserRole; isExec: boolean; openForApplications: boolean; holder: { id: string; fullName: string; email: string; avatarUrl: string | null } | null; progress: number; reportsToSlug: string | null }`; `buildRoster(positions: Position[], profiles: Pick<Profile,'id'|'full_name'|'email'|'avatar_url'|'position_id'>[], progress: Pick<WorkbookProgressRow,'user_id'|'position_slug'|'phase'|'data'>[]): RosterRow[]` — one row per holder, one unfilled row per position with no holder, ordered by team order then `sort_order`; progress from `overallPercent(workbookFor(slug), …)` (0 when no workbook); `TeamReadiness = { team: Team; total: number; filled: number; open: number; progress: number; starts: PhaseId[] }`; `teamReadiness(rows: RosterRow[]): TeamReadiness[]` sorted by open desc then progress asc; `attentionTeams(r: TeamReadiness[]): TeamReadiness[]` (open > 0 or progress < 35, max 4); `teamDeadlines(milestones: Milestone[], team: Team): Milestone[]` (owner_label `All Teams` or containing the team label, case-insensitive).
- Pages: `/portal/teams` — cards per team (label, filled/total, progress bar, open seats, link); `/portal/teams/[team]` — validates the segment against `TEAM_LABELS` (`notFound()` otherwise); lists every roster row with holder, progress, start phase, three-item task preview (`responsibilities` of the start phase from `workbookFor`), plus that team's deadlines (next 5) and its open seats; `/portal/directory` — searchable table (name, seat, team, email, progress) client-side filter.

- [ ] **Step 1: Write the failing tests**: two holders on one slug → two rows; unfilled position → one row with `holder null` and progress 0; `teamReadiness` ordering and `starts` dedupe; `attentionTeams` cut-off; `teamDeadlines('sports')` matches `Sports Director` owner label and `All Teams`.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement lib and pages.** **Step 4: Run**, PASS; `tsc`, `lint`.
- [ ] **Step 5: Commit** `feat(portal): teams, team detail and directory from the seat roster`.

---

### Task 17: Workbook page with autosave

**Files:**
- Create: `src/app/portal/workbook/page.tsx`, `src/app/portal/workbook/actions.ts`, `src/components/portal/workbook/WorkbookClient.tsx`

**Interfaces:**
- Produces (action): `saveWorkbookPhase(input: { positionSlug: string; phase: PhaseId; data: WorkbookPhaseData }): Promise<{ success: true; percent: number; updatedAt: string } | { success: false; error: string }>` — board only; the slug must equal the caller's seat slug (looked up from `profiles.position_id`); validates `data` shape (checks values are `true`, notes string ≤ 20k chars, fields string values); computes `percent` server-side with `phasePercent`; upserts `on conflict (user_id, position_slug, phase)`.
- Page: `requireBoard`; loads the seat's slug; when no seat → renders a "No seat assigned yet" card linking `/portal/teams`; else loads the user's progress rows for that slug and renders `WorkbookClient({ role, byPhase, initialPhase })` where `initialPhase` is the role's `startPhase` unless progress exists for a later phase.
- Client: header (role title, team, overall % bar), phase tabs with per-phase %, phase focus + dates, responsibilities list, deliverables checklist keyed by `deliverableIds`, framework tables (textareas per cell keyed with `fieldKey('framework', f, r, c)`), weekly plan textareas (`fieldKey('weekly', i)`), reflections (`fieldKey('reflection', i)`), risks, notes textarea; every change updates local state and schedules `saveWorkbookPhase` after 650 ms (one timer per phase); status line "Saving…" / "Saved" / error; `beforeunload` warning while a save is pending.

- [ ] **Step 1: Implement.** **Step 2: `tsc`, `lint`.** **Step 3: Commit** `feat(workbook): per-seat workbook with autosaved progress`.

---

### Task 18: Progress board and dashboard upgrades

**Files:**
- Create: `src/app/portal/progress/page.tsx`, `src/components/portal/progress/ProgressBoard.tsx`
- Modify: `src/app/portal/page.tsx`, `src/components/portal/DashboardClient.tsx`

**Interfaces:**
- `/portal/progress`: `requireBoard`; table of `buildRoster` rows (name or "Open seat", seat, team, start phase, progress bar, last updated) with team filter chips; summary tiles: organizers, seats filled, open seats, average progress (filled seats only).
- Dashboard page additionally loads: `season` (`getCurrentSeason`), visible announcements (active, filtered with `announcementVisible`, top 2 by priority order critical > high > medium > low then `created_at desc`), the viewer's seat (`positions` by `position_id`) and progress rows, all dated milestones (already loaded), and passes `DashboardClient` new props `season`, `announcements`, `seat: { slug, title, team } | null`, `workbookPercent: number | null`, `nextActions` (from `nextActions(role, byPhase, season, todayIso)` computed on the server with `localDateIso(new Date())`).
- `DashboardClient` adds, above the week view: an announcements strip (title, body, priority colour, dismiss is client-local only), a "Season" tile row (days until tournament, current phase label, next deadline with `deadlineTiming`), and for seat holders a "My workbook" card (percent bar + "Open workbook") and a "Next actions" list (deliverable text, due label, overdue in red). Applicants see announcements and the season tiles only.

- [ ] **Step 1: Implement.** **Step 2: `tsc`, `lint`, `npm run build`.** **Step 3: Commit** `feat(portal): progress board; dashboard shows season, announcements, workbook and next actions`.

---

### Task 19: Calendar and timeline

**Files:**
- Create: `src/app/portal/calendar/page.tsx`, `src/app/portal/calendar/actions.ts`, `src/components/portal/calendar/CalendarClient.tsx`, `src/app/portal/timeline/page.tsx`, `src/components/portal/timeline/TimelineClient.tsx`

**Interfaces:**
- Produces (actions): `upsertMilestone(input: { id?: string; title: string; description: string; target_date: string; phase: PhaseId | null; priority: Milestone['priority']; deadline_type: string; owner_label: string; send_reminders: boolean; date_label: string | null; team: Team | null }): Promise<Result>`; `deleteMilestone(id: string): Promise<Result>`. Leadership only; `revalidatePath` for `/portal/calendar`, `/portal/timeline`, `/portal`.
- Calendar page: `requireBoard`; loads all milestones ordered by `target_date` (nulls last) and the viewer's `reminder_preferences` row; client groups dated items by phase (`PHASE_META` order, undated under "Unscheduled"), each card shows date label, title, description, priority pill, type, owner, `deadlineTiming` label, "Download .ics" (client-side Blob from `buildIcsCalendar([item], { portalUrl, now })`) and "Google Calendar" link; header buttons "Download all (.ics)" and a link to reminder preferences on Settings showing the current setting ("Reminders: 7 days before" / "off"); leadership gets an inline create/edit form (prefilled on edit) and delete with confirm.
- Timeline page: `requireBoard`; countdown header (days until `tournament_start`, "Tournament: Mar 25–28, 2027" from the season row), items grouped by month in date order, next item highlighted, past items dimmed, type colour from `deadline_type`.

- [ ] **Step 1: Implement.** **Step 2: `tsc`, `lint`.** **Step 3: Commit** `feat(portal): calendar with ICS export and leadership CRUD; season timeline`.

---

### Task 20: Announcements CRUD

**Files:**
- Create: `src/app/portal/announcements/page.tsx`, `src/app/portal/announcements/actions.ts`, `src/components/portal/announcements/AnnouncementsClient.tsx`

**Interfaces:**
- Produces (actions): `upsertAnnouncement(input: { id?: string; title: string; body: string; audience: Announcement['audience']; audience_team: Team | null; priority: Announcement['priority']; is_active: boolean }): Promise<Result>`; `deleteAnnouncement(id: string): Promise<Result>`. Leadership only; `audience === 'team'` requires `audience_team`; `revalidatePath('/portal')` and `/portal/announcements`.
- Page: leadership; list with active toggle, audience/priority badges, edit form, delete.

- [ ] **Step 1: Implement.** **Step 2: `tsc`, `lint`.** **Step 3: Commit** `feat(portal): leadership announcements`.

---

### Task 21: Reminder preferences and daily reminder cron

**Files:**
- Create: `src/lib/reminders.ts`, `src/app/api/cron/reminders/route.ts`, `vercel.json`
- Modify: `src/app/portal/settings/page.tsx`, `src/app/portal/settings/actions.ts`, `src/components/portal/settings/SettingsClient.tsx`, `src/lib/supabase/middleware.ts` (no change needed if `/api` already passes through without a user; verify), `.env.local.example` (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`)
- Test: `src/lib/reminders.test.ts`

**Interfaces:**
- Produces (`reminders.ts`): `selectReminders(input: { todayIso: string; prefs: { user_id: string; email_enabled: boolean; days_before: number }[]; milestones: { id: string; target_date: string | null; send_reminders: boolean }[]; delivered: { user_id: string; milestone_id: string }[] }): { user_id: string; milestone_id: string; days_before: number }[]` — enabled prefs only; milestone `target_date === addDaysIso(todayIso, days_before)` and `send_reminders`; excludes delivered pairs; null dates ignored.
- Produces (action): `saveReminderPreferences(input: { email_enabled: boolean; days_before: 1 | 3 | 7 | 14 }): Promise<Result>` upserting the viewer's row. Settings page loads the row and `SettingsClient` gets a "Deadline reminders" card (toggle + days select) saved by the existing Save button alongside the other settings.
- Route `GET /api/cron/reminders`: 503 when `CRON_SECRET` unset; 401 unless `authorization === 'Bearer ' + CRON_SECRET`; 200 `{ ok: true, sent: 0, skipped: 'email not configured' }` when Resend is not configured; otherwise loads prefs, milestones, today's deliveries (admin client), runs `selectReminders`, for each sends `reminderEmail` to the profile's email and inserts the delivery (ignoring unique-violation errors), returns `{ ok: true, sent, failed: [{ user_id, milestone_id, error }] }`. `todayIso = localDateIso(new Date())`.
- `vercel.json`: `{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 14 * * *" }] }`.

- [ ] **Step 1: Write the failing tests**: exact-day match only (6 days away not selected for 7); disabled pref skipped; `send_reminders false` skipped; delivered pair skipped; null date skipped; two users with different `days_before` each get their own milestone.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement.** **Step 4: Run**, PASS; `tsc`, `lint`; start `npm run dev` with placeholder env and `curl -i localhost:3000/api/cron/reminders` → 503 text from the proxy (route exists); stop.
- [ ] **Step 5: Commit** `feat: deadline reminder preferences and daily Vercel cron via Resend`.

---

### Task 22: Command center

**Files:**
- Create: `src/app/portal/command/page.tsx`, `src/components/portal/command/CommandCenter.tsx`

**Interfaces:**
- Page: `requireRole(DIRECTOR_PLUS)`; loads positions, profiles (board), progress rows, dated milestones, and the viewer's team; computes `rows = buildRoster(...)`, `readiness = teamReadiness(rows)`, `attention = attentionTeams(readiness)`, `overdue = overdueDeadlines(milestones, today)`, `dueThisWeek = dueWithinDays(milestones, today, 7)`, `next = upcomingDeadlines(milestones, today, 5)`.
- Client: four stat tiles (open seats, due this week, overdue, teams needing attention), team readiness list (filled/total, open, progress bar, start phases, "Open" link to `/portal/teams/<team>`), deadline watch (next 5 with timing label), overdue list, and a "Open seats" list linking to `/portal/positions` for leadership.

- [ ] **Step 1: Implement.** **Step 2: `tsc`, `lint`.** **Step 3: Commit** `feat(portal): leadership command center`.

---

### Task 23: Meetings and decisions

**Files:**
- Create: `src/lib/csv.ts`, `src/lib/content/meeting-templates.ts`, `src/app/portal/meetings/page.tsx`, `src/app/portal/meetings/actions.ts`, `src/components/portal/meetings/MeetingsClient.tsx`
- Test: `src/lib/csv.test.ts`

**Interfaces:**
- Produces (`csv.ts`): `toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string` — header row, RFC 4180 quoting (quote when the value contains `,`, `"`, `\n`; double embedded quotes), CRLF, `null`/`undefined` → empty, dates as given.
- Produces (`meeting-templates.ts`): `MEETING_TEMPLATES: { title; cadence; owner; prompts: string[] }[]` (the handbook's 3).
- Produces (actions): `createMeetingNote(input: { title; meeting_date; team: Team | null; agenda; blockers; action_items }): Promise<Result>`; `deleteMeetingNote(id)`; `createDecision(input: { title; category: Decision['category']; decision; rationale; owner_label; team: Team | null; decided_on })`; `deleteDecision(id)`. Writers: leadership, or `director`, or chair/lead for their own team (mirror the RLS rule in the action so the error message is friendly); `revalidatePath('/portal/meetings')`.
- Page: `requireBoard`; loads notes (newest first, 200 max) and decisions; client shows the templates, two forms (hidden for `member`/`dream_team`), two lists with delete (own team or leadership), and "Export CSV" buttons that download `toCsv` output client-side (`meeting-notes.csv`, `decisions.csv`).

- [ ] **Step 1: Write the failing tests** for `toCsv` (quoting, CRLF, null); **Step 2: Run**, FAIL; **Step 3: Implement**; **Step 4: Run**, PASS; `tsc`, `lint`.
- [ ] **Step 5: Commit** `feat(portal): meeting notes and decision log with CSV export`.

---

### Task 24: Handbook page (rulebook, runbook, board standard, templates)

**Files:**
- Create: `src/lib/content/rulebook.ts`, `src/lib/content/runbook.ts`, `src/app/portal/handbook/page.tsx`, `src/components/portal/handbook/HandbookClient.tsx`
- Test: `src/lib/content/rulebook.test.ts`

**Interfaces:**
- Produces: `RULEBOOK_ENTRIES: { category; color; question; answer; keywords: string[] }[]` (the handbook's 8, with the "Roles" answer reworded to "assigned by leadership" and the "Deadlines" answer's Edge Function sentence replaced by "reminder emails go out daily from the portal"); `searchRulebook(entries, query: string): RulebookEntry[]` — case-insensitive match on category, question, answer, keywords; empty query returns all.
- Produces: `RUNBOOK_SECTIONS: { title; color; owner; items: string[] }[]` (the handbook's 5).
- Page: `requireBoard`; tabs Rulebook (search box + entry cards), Runbook (5 cards), Board Standard (`BOARD_STANDARD` numbered list), Meeting Templates (`MEETING_TEMPLATES`).

- [ ] **Step 1: Write the failing test** (`searchRulebook(entries, 'parents')` returns the Confidentiality entry only; `''` returns 8). **Step 2: Run**, FAIL. **Step 3: Implement.** **Step 4: Run**, PASS; `tsc`, `lint`.
- [ ] **Step 5: Commit** `feat(portal): handbook page with searchable rulebook, runbook and board standard`.

---

### Task 25: Feedback themes

**Files:**
- Create: `src/app/portal/feedback/page.tsx`, `src/app/portal/feedback/actions.ts`, `src/components/portal/feedback/FeedbackClient.tsx`

**Interfaces:**
- Produces (actions): `upsertFeedbackTheme(input: { id?: string; theme; source; sentiment; owner_label; phase: PhaseId | null; status; color: string | null; action; sort_order: number }): Promise<Result>`; `deleteFeedbackTheme(id)`. Leadership only.
- Page: leadership; cards per theme (theme, owner, phase, status badge, sentiment, action) with edit/delete and an add form. No analytics (the handbook's hardcoded 1,028-response aggregates are not ported).

- [ ] **Step 1: Implement.** **Step 2: `tsc`, `lint`.** **Step 3: Commit** `feat(portal): feedback themes`.

---

### Task 26: Documentation and cutover

**Files:**
- Modify: `README.md`, `SETUP.md`, `.env.local.example`
- Create: `docs/cutover.md`

**Interfaces:**
- `SETUP.md`: migrations section lists the six new files in order and notes that `20261029_00_exec_team.sql` must be run on its own; Step 4 (Resend) rewritten: it is wired up, set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`; Step 5 seeding: positions and milestones are seeded by migrations, remove the manual position insert; Step 6: roles now come from seats (`/portal/positions`), keep the SQL fallback; new "Syncing the 2027 Handbook data" section: run `node scripts/sync-handbook-data.mjs --apply` once with the target env, or `--out` and paste the SQL; explains that seats apply on first Google sign-in and that mismatched emails must be corrected in `legacy_seat_assignments` by leadership.
- `docs/cutover.md`: ordered checklist to retire `organizers.mistdallas.org`: apply migrations, run the sync, verify three leaders' seats, set Resend/cron env on Vercel, point the old domain at the portal (replace the handbook repo's `index.html` with a meta-refresh to `https://mistdallas.org/portal` and keep the CNAME), pause the old Supabase project after two weeks.
- `README.md`: portal feature list and project layout updated (workbooks, calendar, teams, command center, meetings, handbook; `scripts/`, `tests/`).

- [ ] **Step 1: Write the docs.** **Step 2: `npm run build`** clean. **Step 3: Commit** `docs: migrations, data sync, reminders and cutover`.

---

### Task 27: Final verification and review

- [ ] **Step 1:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean on the branch; `git status` clean; `supabase/seed/local/` untracked.
- [ ] **Step 2:** Walk the permission matrix once against `nav.ts` and each page's `require*` call; fix any page whose guard is looser than its nav entry.
- [ ] **Step 3:** Fresh-context code review of the whole branch (superpowers:requesting-code-review), fix findings, re-run Step 1.
- [ ] **Step 4:** Push `feat/handbook-port`; open a PR against `main` whose body lists: migrations to run in order, the sync command, env vars to set on Vercel, and what is deferred (tournament UI, chat).

---

## Addendum (2026-10-29): the handbook's Supabase project becomes the single backend

Decided with the user after the main plan shipped: the mistdallas Supabase project holds nothing of value except the `gallery` Storage bucket (19 pictures), while the handbook project holds the 29 real accounts. So the merged site runs on the handbook project. Three more tasks; the existing migrations stay unchanged.

### Task 28: Adoption scripts

**Files:**
- Create: `supabase/adopt-handbook/01-before-schema.sql`, `supabase/adopt-handbook/02-after-migrations.sql`
- Create: `tests/db/fixtures/handbook-schema.sql` (the handbook's own SQL, concatenated, minus its realtime publication line), `tests/db/adopt-handbook.test.ts`
- Modify: `tests/db/harness.ts` (add `createHandbookDb()`)

**Interfaces:**
- `01-before-schema.sql`: for each handbook table (`profiles, announcements, role_applications, workbook_progress, deadline_events, reminder_preferences, reminder_deliveries, messages, tournament_rooms, room_availability, competition_blocks, student_registrations, student_competition_entries, room_assignments, nfc_scan_logs, mymist_import_batches, mymist_participants, mymist_schools, mymist_judges`): if it exists and is empty, drop it; if it has rows, rename it to `handbook_<name>` and rename its constraints, indexes and sequences with the same prefix so `schema.sql` and the migrations can create fresh tables without name clashes. Idempotent. Then the operator runs `schema.sql` and the seven migrations unchanged.
- `02-after-migrations.sql`: copies `handbook_profiles` into `profiles` by id (email lower-cased, name coalesced), seeds `legacy_seat_assignments` from `handbook_profiles.role_id`/`is_admin` (aliases `groups → group-projects`, `communications → comms`; unknown ids get a null slug so leadership can see them), copies `handbook_reminder_preferences`, converts `handbook_workbook_progress` rows into `legacy_workbook_progress` (notes and fields carried; index-aligned checks cannot be mapped in SQL, so a NOTICE reports how many checked items were dropped), then `select public.apply_legacy_seats_all()`. Every statement guarded with `to_regclass` so a dropped-when-empty table is skipped. Idempotent.
- `createHandbookDb()`: auth stub + the fixture schema; returns a PGlite ready for synthetic handbook rows.

- [ ] Test (RED): build the handbook db, insert 6 synthetic profiles (rd admin with mixed-case email, a `groups` alias, a null-name/no-role user, a typo-domain `arts` user, a second rd, an unknown `wizard` role), one workbook row with the handbook's data shape, one reminder preference; run 01 twice; run `schema.sql` + migrations; run 02 twice. Assert: 6 profiles with the same ids; roles rd/rd → regional_director+exec, groups → chair on `group-projects`, wizard → applicant with a null-slug legacy row, null name → ''; 46 milestones, 35 positions; `handbook_deadline_events` has 8 rows and `handbook_announcements` 1 while new `announcements` has the welcome seed; reminder preference copied; workbook notes copied; anon cannot read `profiles`.
- [ ] Implement, GREEN, commit `feat(db): adopt the handbook Supabase project as the single backend`.

### Task 29: Gallery copy

**Files:** `scripts/copy-gallery.mjs`, `scripts/lib/gallery.mjs`, `scripts/lib/gallery.test.mjs`
- `extractGalleryUrls(html: string, origin?: string): string[]` — unique `…/storage/v1/object/public/gallery/<name>` URLs from a page, in document order; `objectNameFromUrl(url): string` (decoded).
- Script: `--from-site https://mistdallas.org` (default) scrapes `/` and `/gallery`; `--dry-run` lists; otherwise creates the public `gallery` bucket on `NEXT_PUBLIC_SUPABASE_URL` with `SUPABASE_SERVICE_ROLE_KEY` if missing and uploads each object with `x-upsert: true`, preserving content type.
- [ ] Test (RED) the two helpers; implement; GREEN; dry-run against the live site shows 19 objects; commit.

### Task 30: Docs for this path
- `docs/cutover.md` rewritten for the handbook project; SETUP.md step 2 gains the adoption order; README one line. Commit, push, update PR #2's description.
