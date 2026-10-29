# Porting the 2027 Handbook portal into mistdallas: audit and plan

Date: 2026-10-14
Source: `mistdallas2027handbook` (github.com/salwadin/mistdallas2027handbook, static HTML/JS on GitHub Pages, Supabase project `pgdrhoifisonmzuaeetu`)
Target: `mistdallas` (github.com/ryhanshaikutd/mistdallas, Next.js 16 + Supabase + Vercel, branch `fix/run-without-supabase-env`)

Status: **proposal for review**. Nothing here has been implemented.

---

## 1. Executive summary

The handbook is a 9,600-line single-file vanilla JS app with 19 views, 17 Supabase tables, 3 edge functions, and a 3,500-line role/workbook content file. Roughly a third of its code is dead or unreachable, several features store state in localStorage only, and its data model (text `role_id`, `is_admin` boolean, email/password auth, anonymous-readable applications) conflicts with mistdallas's (role-tier enum, Google OAuth, server-action writes, RLS keyed on role).

mistdallas already has the better foundation for recruitment: cycles, rankings, reviewer notes, interviews with Google Meet, and a team task board. What it lacks, and what the handbook has, is everything that runs the season *after* recruiting: a seat/position roster, per-role workbooks with progress, a deadline calendar with reminders, announcements, team and progress pages, a leadership command view, and (eventually) tournament-weekend operations.

**Recommendation:** treat mistdallas as the base, port the handbook's *features* (not its code) as new portal routes on top of mistdallas's existing auth and permission model, and move the handbook's role catalog and workbook content into mistdallas as versioned data. Do it in six phases, each with its own spec and plan. Phases 1 through 3 deliver what organizers need for the 2026–27 season; phases 4 through 6 are leadership and event-weekend tooling.

---

## 2. What the handbook has (feature inventory)

Line numbers refer to `index.html` unless stated.

### 2.1 Fully working, Supabase-backed

| Feature | Tables | Notes |
|---|---|---|
| Email/password login, invite + recovery links | `auth` | Reset link goes through `send-reset-email` edge function (service role `generateLink`). |
| Role applications (24-question form, jsonb responses) | `role_applications` | Form hidden right now: `OPEN_FOR_APPLICATIONS = new Set([])` at line 2955. Status lookup by email. Anyone can read every row, including answers (`using (true)` RLS). |
| Admin application review + approve/decline | `role_applications`, `profiles` | Approve writes `profiles.role_id/team`. Decision email via `send-application-decision` (no caller auth check, unescaped HTML). |
| Dream Team interest form | `role_applications` with `role_id='dream-team'` | Read-only in admin. |
| Per-role workbooks, 4 phases, autosaved progress | `workbook_progress (user_id, phase) → data jsonb, percent_complete` | `data = { checks: boolean[], notes, fields: {...} }`. Checks are index-aligned to the deliverables array (fragile). Percent = checked/total per phase, mean across phases. |
| Progress board, team pages, directory, dashboard stats | `profiles`, `workbook_progress` + workbook-data | All public-readable. |
| Command Center | derived | Open roles, due this week, overdue, team readiness. |
| Calendar / deadline manager | `deadline_events` | Admin create/upsert/delete (no edit prefill). ICS export (single + all), Google Calendar links. Falls back to static milestones, and the fallback renders empty panels (month vs phase key mismatch). |
| Reminder preferences + daily reminder emails | `reminder_preferences`, `reminder_deliveries`, `send-deadline-reminders` edge fn | Resend. Cron with `x-cron-secret`. Dedupe on (user, deadline, date). |
| Announcements display | `announcements` | Top 2 active on dashboard. **Admin CRUD UI exists but is unreachable** (`renderAnnouncements` never called). Audience field ignored. |
| Chat (7 hardcoded channels, realtime) | `messages` | **Table DDL is not in any SQL file**; only shown inline in an error message. |
| MyMIST staging: participant CSV import | `mymist_import_batches`, `mymist_participants` (+ `mymist_schools`, `mymist_judges` read-only) | Flexible header aliases. Schools/judges have no import or UI. |
| Tournament manager: rooms, availability, blocks, students (single + CSV), manual assignments | 7 `tournament_*`/`student_*`/`room_*` tables | **Create/upsert only; no edit or delete UI anywhere.** No auto-assignment. Conflict checks (no room, over capacity, outside availability, double-booked). Draft blocks invisible to non-admins via RLS. |
| NFC check-in panel | `nfc_scan_logs`, `room_assignments` | Web NFC + keyboard-wedge readers. Non-admins never load students/assignments, so every non-admin scan logs `unknown_tag`. |

### 2.2 Working but localStorage-only (lost per browser)

- Task status for workbook-derived tasks (`mist_task_status`; ids depend on array order)
- Meeting notes (`mist_meeting_notes`, cap 50) and decision log (`mist_decision_log`, cap 100), with CSV export
- Custom feedback themes (`mist_feedback_addressal`)

### 2.3 Static content (no DB)

- Landing/onboarding page ("Applications Due Sept 30" hardcoded)
- Master timeline (`MASTER_MILESTONES`, lines 3086–3133) and tournament date `2027-03-25` (hardcoded twice)
- Meeting templates (3), runbook sections (5, **unreachable**: `openRunbook` never called), rulebook FAQ (8 entries, searchable), feedback analytics (hardcoded aggregates), integration roadmap, tournament manager steps
- `workbook-data.js`: `PHASE_META`, `TEAMS` (9), `ROLES` (34, each with 4 phase blocks: focus, responsibilities, deliverables, frameworks, weeklyPlan, reflections, risks), `BOARD_STANDARD`, `ORG_DEADLINES`, `KPI_DATES` (last three unused)

### 2.4 Dead code (do not port)

`renderRoleSetup`/`saveProfile` (self role claim), `renderAnnouncements`/`renderAnnouncementAdminForm`, `renderSystemsRoadmap`, `renderPlanningConsole`, `renderMyNextActions`, `renderPortalGuide`, `renderTeamRoleBoard`, `buildTimeline`, feedback dataset import/parse (8314–8515), `EXEC_ROLES`, `openRunbook`, `openDirectory`.

### 2.5 Defects and risks worth knowing before porting

1. **Data leak:** `role_applications` is fully readable by anonymous users, including all 24 answers and internal review notes.
2. **Unauthenticated email function:** anyone can call `send-application-decision` to send invite links or emails to any address.
3. **Schema drift:** code inserts `role_applications.user_id`, which no SQL file defines. `messages` table undefined. `profiles_role_id_unique` partial index still exists in SQL despite commit `5b1ca11` "Allow multiple people to hold the same role".
4. **Workbook progress keyed by array index:** reordering or editing a deliverable in workbook-data silently shifts everyone's checkmarks.
5. **Hardcoded season facts:** tournament date, applications-due date, phase date ranges (which disagree between `formatPhase` and `PHASE_META.dates`), and open roles are all constants in code.
6. **Role catalog inconsistencies** in workbook-data: `reportsTo`/`manages` are free text, not ids; `outreach` sits under Dream Team but is listed in Marketing's `manages`; `knowledge-brothers` sits in the Sports block; `manages` references a non-existent "Training & Development Coord"; 79 deliverable dates fall outside their phase's date range.

---

## 3. What mistdallas has today

| Area | State |
|---|---|
| Auth | Google OAuth only. `@getmistified.com` = internal. Three emails pre-mapped to RD/IAD/EAD in `auth/callback/route.ts`. |
| Profiles | `role` enum (regional_director, internal_ad, external_ad, director, chair, lead, member, dream_team, applicant), `team` enum, prefs (theme, nav style, onboarded). |
| Positions | `positions` table (title, phase, team, is_active), 30 seeded titles (Director/Chair/Lead naming). No slug, no reporting line, no holder link. |
| Recruitment | `recruitment_cycles` (internal/external/closed per year), `applications` (fixed columns, 7 commitments, 2 essays), `application_rankings` (top 3), `reviewer_notes`, `interview_slots` + `interview_bookings` with Google Meet. Submission via server action with full validation. |
| Planning | `tasks` (team, assignee, status, priority, parent) and `milestones` (title, target_date, team, is_recurring). |
| Insights | Charts over applications/tasks + `attendance_records` CSV upload from MyMIST. |
| Public | Landing, Nationals qualifiers (`qualifiers` table), gallery. |
| Permissions | `LEADERSHIP_ROLES` = RD + both ADs. Nav gated by role in `components/portal/nav.ts`. RLS keyed on `profiles.role`. |
| Email | None. `SETUP.md` says Resend is "not yet wired up". |
| Pending | `supabase/migrations/20261014_audit_fixes.sql` is committed but **not yet applied** (adds profile pref columns, `current_user_role()` SECURITY DEFINER helper, `qualifiers`, unique cycle per year). |

---

## 4. Reconciliation decisions

These are the structural choices the port hinges on. Recommendations are marked; the ones that need your call are collected in section 7.

### 4.1 Identity and permissions: keep mistdallas's model, add a seat

Handbook: `profiles.role_id` (text, the seat) + `is_admin`. mistdallas: `profiles.role` (tier) + `team`.

Decision: keep `role` as the **permission tier** and add `profiles.position_id uuid references positions` as the **seat**. Accepting an application sets all three (`position_id`, `role` tier derived from the position, `team`). Admin = `LEADERSHIP_ROLES`; drop `is_admin`. Multiple holders per position are allowed by default (no unique index), with an optional `positions.max_holders` for seats that must be singular.

### 4.2 Role catalog: one `positions` table, extended

Extend `positions` with:

- `slug text unique` (the handbook's role id, used by workbook content and URLs)
- `reports_to_position_id uuid references positions`
- `role_tier user_role` (what `profiles.role` becomes when this seat is filled)
- `is_exec boolean`, `open_for_applications boolean`, `max_holders int null`, `sort_order int`

The two catalogs disagree on naming (Lead/Coordinator vs Director/Chair) and on three team placements (eSports: competitions vs sports; Ceremonies: operations vs programs; Registration: coordinator under Tech Lead vs Director). Six handbook roles have no mistdallas equivalent (Content Creator, Outreach, Logistics Lead, Hospitality, Finance Coord, Tech Lead, Tech Coord), and three seeded positions have no handbook role (Recruitment Lead, Training & Development Lead, Dream Team Member). **You need to pick the canonical list** (section 7). The migration will reseed `positions` from that list and workbook content will key on `slug`.

### 4.3 Teams: add `exec`

Handbook has an `exec` team for RD/ADs; mistdallas seeds them under `logistics`. Add `'exec'` to `team_type`. Map handbook `marketing → pr` and `operations → logistics` (label-only differences; the display labels in `TEAM_LABELS` can be changed to "Marketing" and "Operations" if preferred).

### 4.4 Auth: Google only

Drop the handbook's email/password flow, `send-reset-email`, and invite-link generation. Board members already have `@getmistified.com` Google accounts; applicants sign in with any Google account. This also removes the handbook's biggest security hole (anonymous application reads) because applying requires sign-in.

### 4.5 Applications: keep mistdallas's, borrow three things

mistdallas's recruitment system is more complete and is server-validated. Port from the handbook only:

1. **Per-position open flag** (`positions.open_for_applications`) replacing the `OPEN_FOR_APPLICATIONS` constant, editable from the portal.
2. **Decision emails** (accepted/rejected/redirected) sent from a server action on status change, via Resend, with HTML escaping. Not an edge function.
3. **Dream Team interest** as a lightweight path: either a `dream_team` position with `open_for_applications` or a short form that creates an application with status `redirected_dream_team`.

The handbook's 24-question form is **not** ported unless you want its questions; see section 7.

### 4.6 Workbooks: content in the repo, progress in the DB

Content (34 roles × 4 phases) stays as a typed data file, `src/lib/workbook/content.ts`, generated once from `workbook-data.js` and then edited in git. Reasons: it is editorial, it changes rarely, reviewing diffs in git is the right workflow, and it avoids a content-editing UI.

Progress goes in `workbook_progress (user_id, position_slug, phase) → data jsonb, percent_complete`. Change the `checks` shape from an index-aligned array to a map keyed by a stable deliverable id (`{ "<phase>-<n>-<hash of text>": true }`) so content edits do not shift checkmarks. Keep notes and framework fields as they are.

### 4.7 Deadlines: extend `milestones`, do not add `deadline_events`

mistdallas's `milestones` and the handbook's `deadline_events` are the same concept. Add to `milestones`: `detail`, `phase position_phase`, `priority`, `deadline_type`, `owner_label`, `send_reminders`, `date_label`. Seed the handbook's 8 deadlines and the master timeline (≈30 items) into it. Timeline, calendar, dashboard "next deadline", and command center all read this one table.

### 4.8 Season facts: a `season_settings` row

One row per season year: `tournament_date`, `applications_due`, phase start/end dates, `is_current`. Replaces every hardcoded date in both apps.

### 4.9 Reminders: Vercel Cron + route handler

Port `send-deadline-reminders` to `src/app/api/cron/reminders/route.ts`, scheduled daily by `vercel.json` cron, protected by `CRON_SECRET`, using Resend. Same dedupe table. Preferences live on the existing Settings page.

### 4.10 Tasks: do not port the handbook's

Handbook "tasks" are workbook deliverables with per-browser status. The workbook checkmarks already are the task list. mistdallas's `tasks` table stays for ad-hoc team work. A "My next actions" widget on the dashboard can derive from unchecked workbook deliverables due within 14 days.

### 4.11 Meetings and decisions: real tables

`meeting_notes` and `decisions` tables with the same fields the localStorage objects have, team-scoped RLS. Phase 4.

### 4.12 Static content: typed data + pages

Rulebook FAQ, runbook sections, meeting templates, board standard: `src/lib/content/*.ts` rendered by simple pages. Feedback: port the themes as a `feedback_themes` table with CRUD; drop the hardcoded 1,028-response analytics unless the underlying survey data exists somewhere.

### 4.13 Chat: defer, decide separately

Realtime chat is self-contained but has no schema in the repo. Only port it if the board actually uses it instead of WhatsApp/Slack.

### 4.14 Tournament and MyMIST: port schema now, build UI last

The seven tournament tables and four MyMIST tables are reasonable and can be adopted largely as-is (switch RLS to `LEADERSHIP_ROLES` via `current_user_role()`). The UI needs to be rebuilt with edit/delete, and `mymist_participants` should either merge with `student_registrations` or become its source. mistdallas's `attendance_records` upload overlaps here too. This is the largest and least urgent block; it is Phase 5.

### 4.15 Data migration from the live handbook Supabase

Different Supabase projects and different auth providers mean `auth.users.id` values will not match. If there are real organizers with workbook progress in the handbook project, migrate by email: export `profiles`, `workbook_progress`, `deadline_events`, `role_applications`, remap `user_id` through email → new Google user id after each person's first sign-in. Needs confirmation whether this data exists (section 7).

---

## 5. Target architecture in mistdallas

### 5.1 Schema additions (one migration per phase, all idempotent like the existing one)

```
alter type team_type add value 'exec';

positions        + slug, reports_to_position_id, role_tier, is_exec,
                   open_for_applications, max_holders, sort_order
profiles         + position_id
season_settings    (year pk, tournament_date, applications_due,
                    foundations_start … execution_end, is_current)
milestones       + detail, phase, priority, deadline_type, owner_label,
                   send_reminders, date_label
announcements      (id, title, body, audience, priority, is_active, created_by, …)
workbook_progress  (user_id, position_slug, phase) pk, data jsonb, percent_complete, updated_at
reminder_preferences, reminder_deliveries   (as handbook)
meeting_notes, decisions                    (phase 4)
feedback_themes                             (phase 4, optional)
tournament_rooms, room_availability, competition_blocks,
student_registrations, student_competition_entries,
room_assignments, nfc_scan_logs             (phase 5)
mymist_import_batches, mymist_participants,
mymist_schools, mymist_judges               (phase 5)
messages                                    (phase 6, optional)
```

All new RLS policies use `public.current_user_role()` from the pending migration, never a subselect on `profiles`.

### 5.2 Routes

```
/portal                      dashboard (+ announcements, my progress, next deadline, next actions)
/portal/apply                existing, gated by positions.open_for_applications
/portal/review               existing + "assign seat" on accept + decision email
/portal/interviews           existing
/portal/workbook             my workbook (phase tabs, autosave)
/portal/teams                team pages: every position, holders, progress
/portal/teams/[team]         single team
/portal/directory            roster
/portal/progress             progress board (board-wide)
/portal/calendar             deadlines, ICS/GCal export, reminder prefs link
/portal/timeline             season timeline (same data, chronological)
/portal/planning             existing task board
/portal/command              leadership: readiness, overdue, open seats (leadership only)
/portal/announcements        leadership CRUD
/portal/positions            leadership: catalog, open flags, holders
/portal/meetings             notes + decisions (phase 4)
/portal/handbook             rulebook, runbook, board standard (phase 4)
/portal/tournament/*         rooms, blocks, students, assignments, checks, scan (phase 5)
/portal/mymist               staging imports (phase 5)
/portal/settings             existing + reminder preferences
/api/cron/reminders          Vercel Cron, daily
```

### 5.3 Code conventions to follow (from the existing repo)

- Server components fetch; client components mutate through **server actions** (`actions.ts` beside the page) that re-check auth and use `createAdminClient()` for writes. The handbook did all writes from the browser; do not carry that over.
- One shared `requireUser()` / `requireLeadership()` helper in `src/lib/auth.ts` to replace the copy-pasted `getUser` + `redirect` block in every page.
- Types in `src/lib/types`, labels in `src/lib/constants.ts`, nav in `components/portal/nav.ts`.
- Styling through the existing `--p-*` tokens; no new CSS system.
- New deps: `resend` only. ICS generation is a 30-line string builder, no library.

### 5.4 Permission matrix

| Capability | applicant | member / dream_team | chair / lead | director | leadership |
|---|---|---|---|---|---|
| Apply, see own application | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own workbook, reminder prefs | | ✓ | ✓ | ✓ | ✓ |
| Teams, directory, progress, calendar, timeline, announcements (read) | | ✓ | ✓ | ✓ | ✓ |
| Team tasks | | read | manage own team | manage | manage |
| Meeting notes / decisions | | read own team | write own team | write | write |
| Command center, positions, announcements CRUD, milestones CRUD | | | | read command | ✓ |
| Review, interviews, cycles, decision emails | | | | | ✓ |
| Tournament + MyMIST admin | | | | | ✓ |
| NFC scan (log only) | | ✓ | ✓ | ✓ | ✓ |

---

## 6. Phased plan

Each phase is its own spec → implementation plan → build cycle. Sizes are rough relative effort.

### Phase 0: Foundation (small)
- Apply the pending `20261014_audit_fixes.sql`.
- Migration: `exec` team, `positions` extensions, `profiles.position_id`, `season_settings`, `milestones` extensions.
- Decide and reseed the canonical position list with slugs, tiers, reporting lines.
- `requireUser`/`requireLeadership` helpers; `season` helper; expanded nav.
- Seed `season_settings` for 2027 and `milestones` from the handbook's master timeline + 8 deadlines.

### Phase 1: Seats and teams (medium)
- Leadership `/portal/positions`: edit open flags, max holders, assign/unassign holders.
- Accepting an application assigns the seat (position, tier, team) and sends a decision email (Resend).
- `/portal/apply` lists only `open_for_applications` positions and reads the due date from `season_settings`.
- `/portal/teams`, `/portal/teams/[team]`, `/portal/directory`.
- Dream Team interest path.

### Phase 2: Workbooks (medium-large)
- One-time script converts `workbook-data.js` to `src/lib/workbook/content.ts` keyed by slug, fixing the six catalog inconsistencies.
- `workbook_progress` table with stable deliverable ids; autosave server action (debounced client side).
- `/portal/workbook` with phase tabs, checklist, notes, framework tables, weekly plan, reflections, risks.
- `/portal/progress` board; dashboard stats (my %, board average, seats filled/open); "next actions" widget.

### Phase 3: Calendar and communication (medium)
- `/portal/calendar` with leadership CRUD (proper edit), ICS single/all, Google Calendar links.
- `/portal/timeline`.
- `announcements` table, leadership CRUD, dashboard display with audience filtering.
- Reminder preferences on Settings; `reminder_deliveries`; `/api/cron/reminders` + `vercel.json`; Resend env vars documented in `SETUP.md`.

### Phase 4: Leadership operations (medium)
- `/portal/command` (readiness by team, overdue deliverables, open seats, deadline watch).
- `meeting_notes` and `decisions` tables and UI, CSV export.
- `/portal/handbook`: rulebook with search, runbook, board standard, meeting templates.
- Optional `feedback_themes`.

### Phase 5: Tournament weekend (large)
- Migrate the 11 tournament/MyMIST tables with leadership-keyed RLS.
- Rooms, availability, blocks, students, assignments with full CRUD and CSV import (rooms and blocks too, not just students).
- Conflict checks; schedule export.
- NFC scan page that works for non-admins (server action resolves the tag).
- Decide how `mymist_participants`, `student_registrations`, and `attendance_records` relate.

### Phase 6: Optional (small each)
- Realtime chat.
- Data migration from the handbook Supabase project, if needed.
- Retire the GitHub Pages handbook and redirect `organizers.mistdallas.org` to the portal.

---

## 7. Decisions needed from you

1. **Canonical position list.** Handbook's 34 (Lead/Coordinator naming, `exec` team, Tech Lead/Coord, Hospitality, Content Creator, Outreach) or mistdallas's 30 (Director/Chair naming, Recruitment Lead, Training & Dev Lead, Dream Team Member), or a merged list? This blocks Phase 0 seeding and Phase 2 content keys. *Recommendation: handbook's list, since the workbook content was written for it, with the three team placements fixed as noted in 4.2.*
2. **Application form.** Keep mistdallas's form, or port the handbook's 24 questions into it? *Recommendation: keep mistdallas's; it is validated server-side and feeds rankings and interviews.*
3. **Anonymous applying.** The handbook allowed applying without an account. mistdallas requires Google sign-in. *Recommendation: require sign-in.*
4. **Live data.** Are there real organizers with profiles and workbook progress in the handbook's Supabase project that must carry over?
5. **Chat.** Does the board use the in-portal chat? If not, skip it.
6. **Team labels.** Show "Marketing" and "Operations" (handbook) or "PR" and "Logistics" (mistdallas)?
7. **Branch.** mistdallas is on `fix/run-without-supabase-env` with a clean tree. Should the port branch from there or from `main`?

Answers to 1 and 4 change Phase 0; the rest can be settled per phase.
