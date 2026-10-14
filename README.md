# MIST Dallas

Public website and board portal for MIST Dallas, the Southern regional chapter of the Muslim Interscholastic Tournament.

- **Public site** — landing page, Nationals qualifiers, photo gallery.
- **Board portal** (`/portal`) — Google sign-in, board applications and review, interview scheduling, team planning board, insights.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Google Calendar API · Vercel.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in the Supabase keys
npm run dev                        # http://localhost:3000
```

Without Supabase keys the public pages still render (with empty data) and the portal returns a 503 explaining what to set. See [SETUP.md](SETUP.md) for the full Supabase, Google and Vercel setup, and `supabase/` for the schema, migrations and seed data.

## Scripts

| Command         | What it does                     |
| --------------- | -------------------------------- |
| `npm run dev`   | Start the dev server             |
| `npm run build` | Production build                 |
| `npm run start` | Serve the production build       |
| `npm run lint`  | ESLint (`npx tsc --noEmit` for types) |

## Project layout

```
src/app/            routes (public pages, /portal, /api, /auth/callback)
src/components/     landing, nationals, and portal UI
src/lib/supabase/   server, browser, public (cookie-free) and admin clients; proxy session refresh
src/lib/constants   roles, teams, labels
supabase/           schema.sql, migrations/, seed data
```
