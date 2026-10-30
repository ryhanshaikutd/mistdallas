/**
 * PGlite-backed test database that mirrors the Supabase project closely
 * enough to exercise schema.sql, every migration, triggers and RLS.
 *
 * Supabase-specific pieces (the `auth` schema, `auth.uid()`, the `anon` and
 * `authenticated` roles) are stubbed here; everything else is the real SQL
 * from `supabase/`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = path.join(ROOT, "supabase", "schema.sql");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export function migrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(MIGRATIONS_DIR, f));
}

/** Runs every file in supabase/migrations in filename order, each as its own statement batch. */
export async function applyMigrations(db: PGlite): Promise<void> {
  for (const file of migrationFiles()) {
    await db.exec(fs.readFileSync(file, "utf8"));
  }
}

export async function createTestDb(opts: { migrations?: boolean } = {}): Promise<PGlite> {
  const db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(AUTH_STUB);
  await db.exec(fs.readFileSync(SCHEMA, "utf8"));
  if (opts.migrations !== false) await applyMigrations(db);
  return db;
}

/** Inserts an auth user, which fires handle_new_user() and creates the profile. */
export async function signUp(
  db: PGlite,
  user: { id: string; email: string; full_name?: string }
): Promise<void> {
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    user.id,
    user.email,
    JSON.stringify(user.full_name ? { full_name: user.full_name } : {}),
  ]);
}

/** Switches the connection to the `authenticated` role as `userId`; null resets to superuser. */
export async function asUser(db: PGlite, userId: string | null): Promise<void> {
  if (userId === null) {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', '', false);");
    return;
  }
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', 'authenticated', false)", [userId]);
  await db.exec("set role authenticated");
}

/** The public anon key: no user, role claim 'anon'. */
export async function asAnon(db: PGlite): Promise<void> {
  await db.exec("select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false); set role anon;");
}

/** The service-role key used by server actions: no user, role claim 'service_role'. */
export async function asServiceRole(db: PGlite): Promise<void> {
  await db.exec("select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'service_role', false); set role service_role;");
}
