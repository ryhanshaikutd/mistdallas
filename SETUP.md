# MIST Dallas Board Portal — Developer Setup

## Prerequisites
- Node.js 18+
- A Supabase account (free tier works)
- A Google Cloud project
- A Resend account (free tier works)
- Vercel account (for deployment)

---

## Step 1 — Clone and install

```bash
git clone https://github.com/ryhanshaikutd/mistdallas.git
cd mistdallas
npm install
cp .env.local.example .env.local
```

---

## Step 2 — Supabase setup

1. Go to [supabase.com](https://supabase.com) → New Project → name it `mistdallas`
2. Once created, go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → Run
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
4. Copy Client ID → `GOOGLE_CLIENT_ID`
5. Copy Client Secret → `GOOGLE_CLIENT_SECRET`

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

## Step 4 — Resend setup

1. Go to [resend.com](https://resend.com) → Create account
2. Add and verify your domain (`mistdallas.org`) in Resend
3. Go to **API Keys → Create API Key**
4. Copy it → `RESEND_API_KEY`
5. Set `RESEND_FROM_EMAIL=board@mistdallas.org`

---

## Step 5 — Seed initial data

After running the schema, seed the positions:

1. Go to Supabase **SQL Editor** and run:

```sql
INSERT INTO positions (title, phase, team, is_active) VALUES
('Regional Director', 'FOUNDATIONS', 'logistics', true),
('Internal Associate Director', 'FOUNDATIONS', 'logistics', true),
('External Associate Director', 'FOUNDATIONS', 'logistics', true),
('Registration Director', 'FOUNDATIONS', 'registration', true),
('Sports Director', 'FOUNDATIONS', 'sports', true),
('Sisters Sports Lead', 'BUILD', 'sports', true),
('Brothers Sports Lead', 'BUILD', 'sports', true),
('eSports Chair', 'STABILIZATION', 'sports', true),
('Ops Director 1 — Command Center Lead', 'FOUNDATIONS', 'logistics', true),
('Ops Director 2 — Communications Lead', 'FOUNDATIONS', 'logistics', true),
('Food & Safety Chair', 'BUILD', 'logistics', true),
('Competitions Director', 'FOUNDATIONS', 'competitions', true),
('Judges Chair', 'BUILD', 'competitions', true),
('Brackets Lead', 'STABILIZATION', 'competitions', true),
('Writing & Oratory Zone Lead', 'BUILD', 'competitions', true),
('Arts Zone Lead', 'BUILD', 'competitions', true),
('Group Comps Zone Lead', 'BUILD', 'competitions', true),
('Knowledge & Quran Zone Lead', 'BUILD', 'competitions', true),
('Dream Team Director', 'FOUNDATIONS', 'dream_team', true),
('Recruitment Lead', 'BUILD', 'dream_team', true),
('Training & Development Lead', 'BUILD', 'dream_team', true),
('Dream Team Member', 'EXECUTION', 'dream_team', true),
('PR Director', 'FOUNDATIONS', 'pr', true),
('Graphics Chair', 'BUILD', 'pr', true),
('Marketing Chair', 'BUILD', 'pr', true),
('Programs Director', 'FOUNDATIONS', 'programs', true),
('Awards & Ceremonies Chair', 'STABILIZATION', 'programs', true),
('Workshops Chair', 'STABILIZATION', 'programs', true),
('Finance Director', 'FOUNDATIONS', 'finance', true),
('Sponsorships Chair', 'BUILD', 'finance', true);
```

2. Seed recurring milestones:

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

## Step 6 — Set roles for existing board members

After signing in with a Google account, you'll be an `applicant` by default. Promote yourself to RD in Supabase:

```sql
-- Make yourself Regional Director (replace with your actual email)
UPDATE profiles SET role = 'regional_director' WHERE email = 'your@email.com';

-- Or Internal AD
UPDATE profiles SET role = 'internal_ad', team = 'logistics' WHERE email = 'iad@getmistified.com';

-- Or External AD
UPDATE profiles SET role = 'external_ad', team = 'logistics' WHERE email = 'ead@getmistified.com';
```

---

## Step 7 — Add MIST Dallas logo

Place the logo file at:
```
/public/logo.png
```

---

## Step 8 — Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Step 9 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → Import from GitHub → select `ryhanshaikutd/mistdallas`
2. Add all environment variables from `.env.local` in Vercel's project settings
3. Deploy — done

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
VALUES (2025, 'internal', now());

-- Switch to external (run this after internal closes)
UPDATE recruitment_cycles SET type = 'external' WHERE year = 2025;

-- Close recruitment
UPDATE recruitment_cycles SET type = 'closed', closed_at = now() WHERE year = 2025;
```

Or hit the API: `POST /api/cycle` with `{ "type": "internal", "year": 2025 }` (requires RD/AD auth).
