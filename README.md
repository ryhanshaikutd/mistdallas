# MIST Dallas

Public website and board portal for MIST Dallas, the Southern regional chapter of the Muslim Interscholastic Tournament.

- **Public site** — landing page, Nationals qualifiers, photo gallery.
- **Board portal** (`/portal`) — Google sign-in; recruiting (applications, review with decision emails, interview scheduling); the season (seat roster and team pages, per-role workbooks with autosaved progress, calendar and master timeline with `.ics` export and daily reminder emails, announcements, meeting notes and a decision log, the organizer handbook); leadership tools (positions and seat assignment, command center, feedback themes, insights, team planning board).

The portal absorbed the 2027 Handbook organizer portal in October 2026; see `docs/superpowers/specs/2026-10-14-handbook-port-audit-and-plan.md` for the design and `docs/cutover.md` for retiring the old site.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Resend · Google Calendar API · Vercel (hosting + cron).

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in the Supabase keys
npm run dev                        # http://localhost:3000
npm test                           # vitest; migrations run against an in-process Postgres (PGlite)
```

Without Supabase keys the public pages still render (with empty data) and the portal returns a 503 explaining what to set. See [SETUP.md](SETUP.md) for the full Supabase, Google, Resend and Vercel setup, and `supabase/` for the schema and migrations.

## Scripts

| Command         | What it does                     |
| --------------- | -------------------------------- |
| `npm run dev`   | Start the dev server             |
| `npm run build` | Production build                 |
| `npm run start` | Serve the production build       |
| `npm run lint`  | ESLint (`npx tsc --noEmit` for types) |
| `npm test`      | Unit and migration tests (Vitest + PGlite) |
| `node scripts/sync-handbook-data.mjs` | Carry the old handbook portal's organizers over by email into a fresh project (SETUP.md step 7) |
| `node scripts/copy-gallery.mjs` | Copy the public gallery pictures into the project's `gallery` bucket (SETUP.md step 8) |

## Project layout

```
src/app/            routes (public pages, /portal/*, /api, /auth/callback)
src/components/     landing, nationals, and portal UI (one folder per portal feature)
src/lib/            auth helpers, constants, roster/deadline/workbook logic, email, csv
src/lib/workbook/   generated workbook content (34 roles) and progress math
src/lib/supabase/   server, browser, public (cookie-free) and admin clients; proxy session refresh
supabase/           schema.sql, migrations/ (run in order), adopt-handbook/ (reuse the handbook project)
scripts/            one-time converters and the handbook data sync
tests/db/           PGlite harness and migration tests
```
