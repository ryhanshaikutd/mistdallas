import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, applyMigrations, signUp, asUser } from "./harness";

/** The 30 positions SETUP.md told the owner to seed, i.e. what the live table looks like today. */
const OLD_SEED = `INSERT INTO positions (title, phase, team, is_active) VALUES
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
('Sponsorships Chair', 'BUILD', 'finance', true);`;

const U1 = "11111111-1111-4111-8111-111111111111"; // legacy comms seat
const U2 = "22222222-2222-4222-8222-222222222222"; // role-map rd
const U3 = "33333333-3333-4333-8333-333333333333"; // plain applicant

type Row = Record<string, unknown>;
const one = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Row>(sql, params)).rows[0];

describe("positions and seats migration", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb({ migrations: false });
    await db.exec(OLD_SEED);
    await applyMigrations(db);
  });

  it("adds exec to team_type", async () => {
    const r = await one(db, "select enum_range(null::team_type)::text as v");
    expect(r.v).toContain("exec");
  });

  it("reseeds 35 active positions with unique slugs", async () => {
    const r = await one(db, "select count(*)::int as n, count(distinct slug)::int as d from positions where is_active");
    expect(r).toEqual({ n: 35, d: 35 });
  });

  it("maps old titles onto slugs instead of duplicating", async () => {
    const rd = await db.query<Row>("select slug, team::text as team from positions where title = 'Regional Director'");
    expect(rd.rows).toEqual([{ slug: "rd", team: "exec" }]);
    const retired = await one(db, "select is_active, slug from positions where title = 'Recruitment Lead'");
    expect(retired).toEqual({ is_active: false, slug: null });
  });

  it("resolves reporting lines", async () => {
    const r = await one(db, `select (select slug from positions where id = p.reports_to_position_id) as boss
      from positions p where p.slug = 'comms'`);
    expect(r.boss).toBe("logistics-lead");
    const rd = await one(db, "select reports_to_position_id from positions where slug = 'rd'");
    expect(rd.reports_to_position_id).toBeNull();
  });

  it("signup applies a legacy seat case-insensitively", async () => {
    await db.query(
      "insert into legacy_seat_assignments (email, full_name, position_slug) values ($1, $2, $3)",
      ["zz@example.com", "Zed", "comms"]
    );
    await signUp(db, { id: U1, email: "ZZ@Example.com" });
    const p = await one(db, `select p.full_name, p.role::text as role, p.team::text as team, pos.slug
      from profiles p left join positions pos on pos.id = p.position_id where p.id = $1`, [U1]);
    expect(p).toEqual({ full_name: "Zed", role: "chair", team: "logistics", slug: "comms" });
    const applied = await one(db, "select applied_at from legacy_seat_assignments where email = 'zz@example.com'");
    expect(applied.applied_at).not.toBeNull();
  });

  it("seeds the three role-map seats", async () => {
    await signUp(db, { id: U2, email: "sdin@getmistified.com", full_name: "S" });
    const p = await one(db, "select role::text as role, team::text as team from profiles where id = $1", [U2]);
    expect(p).toEqual({ role: "regional_director", team: "exec" });
  });

  it("apply_legacy_seats_all is idempotent", async () => {
    await signUp(db, { id: U3, email: "plain@example.com" });
    const first = await one(db, "select public.apply_legacy_seats_all() as n");
    const second = await one(db, "select public.apply_legacy_seats_all() as n");
    expect(first.n).toBe(2);
    expect(second.n).toBe(2);
    const u3 = await one(db, "select role::text as role, position_id from profiles where id = $1", [U3]);
    expect(u3).toEqual({ role: "applicant", position_id: null });
  });

  it("assign_seat enforces max_holders", async () => {
    await db.exec("update positions set max_holders = 1 where slug = 'rd'");
    await expect(db.query("select public.assign_seat($1, 'rd')", [U3])).rejects.toThrow(/position_full/);
    const u3 = await one(db, "select role::text as role, position_id from profiles where id = $1", [U3]);
    expect(u3).toEqual({ role: "applicant", position_id: null });
  });

  it("assign_seat rejects unknown seats", async () => {
    await expect(db.query("select public.assign_seat($1, 'nope')", [U3])).rejects.toThrow(/position_not_found/);
  });

  it("unassign_seat keeps leadership roles but demotes chairs to member", async () => {
    await db.query("select public.unassign_seat($1)", [U2]);
    const u2 = await one(db, "select role::text as role, position_id from profiles where id = $1", [U2]);
    expect(u2).toEqual({ role: "regional_director", position_id: null });
    await db.query("select public.unassign_seat($1)", [U1]);
    const u1 = await one(db, "select role::text as role, position_id from profiles where id = $1", [U1]);
    expect(u1).toEqual({ role: "member", position_id: null });
  });

  it("a signed-in non-leader cannot promote themselves or call assign_seat", async () => {
    await asUser(db, U3);
    await expect(db.query("update profiles set role = 'regional_director' where id = $1", [U3])).rejects.toThrow(/privileged/);
    await expect(db.query("select public.assign_seat($1, 'rd')", [U3])).rejects.toThrow(/forbidden/);
    await asUser(db, null);
    const u3 = await one(db, "select role::text as role from profiles where id = $1", [U3]);
    expect(u3.role).toBe("applicant");
  });
});
