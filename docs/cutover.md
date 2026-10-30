# Retiring the 2027 Handbook portal

The organizer portal at `organizers.mistdallas.org` (GitHub Pages repo `salwadin/mistdallas2027handbook`, Supabase project `pgdrhoifisonmzuaeetu`) is replaced by `mistdallas.org/portal`. Work through this list in order.

## 1. Database

- [ ] In the mistdallas Supabase project, run the migrations in the order listed in `SETUP.md` step 2. Run `20261029_00_exec_team.sql` on its own first.
- [ ] Confirm: `select count(*) from positions where is_active` = 35, `select count(*) from milestones where legacy_id is not null` = 46, one row in `season_settings` with `is_current`.

## 2. People

- [ ] Run `node --env-file=.env.local scripts/sync-handbook-data.mjs --apply` once from a checkout with the production keys in `.env.local`. It upserts 29 legacy seat rows and reports how many already-registered profiles matched.
- [ ] Read the warnings. Fix any misspelled email in `legacy_seat_assignments` (there is one, in the `getmistfied.com` domain), then `select public.apply_legacy_seats_all();`.
- [ ] Ask the Regional Director and both Associate Directors to sign in with Google and confirm on **Portal → Positions** that their seats are filled. Anyone else gets their seat the first time they sign in with the same email they used on the old portal.
- [ ] For organizers who used a different email on the old portal, assign the seat from **Positions** instead.

## 3. Email and cron (Vercel)

- [ ] Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` to the Vercel project and redeploy.
- [ ] Check Vercel → Settings → Cron Jobs shows `/api/cron/reminders` daily; trigger it once from the dashboard and confirm it returns `ok: true`.

## 4. Old domain

- [ ] In the handbook repo, replace `index.html` with a meta-refresh and a link to `https://mistdallas.org/portal`, keep `CNAME`, and push. GitHub Pages will serve the redirect at `organizers.mistdallas.org`.
- [ ] Update anywhere the old URL was shared (group chats, the Google Drive onboarding doc, the reminder emails' Resend sender if it differed).

## 5. Old Supabase project

- [ ] Leave it running, read-only in practice, for two weeks after the redirect.
- [ ] Then pause the project. Nothing in mistdallas reads from it after step 2.

## Not carried over (by decision)

- The handbook's in-portal chat (`messages`): zero rows, nobody used it.
- The handbook's 24-question application form: mistdallas's validated form stays.
- Tournament-weekend and MyMIST tables: the schema exists in mistdallas (migration 05) but the room/block/student/NFC pages are a separate, later project.
