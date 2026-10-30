import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, applyMigrations, signUp, asUser, asAnon, asServiceRole } from "./harness";

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
    await expect(db.query("select public.assign_seat($1, 'rd')", [U3])).rejects.toThrow(/forbidden|permission denied/);
    await asUser(db, null);
    const u3 = await one(db, "select role::text as role from profiles where id = $1", [U3]);
    expect(u3.role).toBe("applicant");
  });
  it("the public anon key cannot execute any seat function", async () => {
    await asAnon(db);
    for (const call of [
      "select public.assign_seat($1, 'rd')",
      "select public.unassign_seat($1)",
      "select public.apply_legacy_seat($1)",
      "select public.apply_legacy_seats_all()",
      "select public.accept_application($1, (select id from positions where slug = 'rd'))",
    ]) {
      await expect(db.query(call, call.includes("$1") ? [U3] : []), call).rejects.toThrow(/permission denied|forbidden/);
    }
    await asUser(db, null);
    const u3 = await one(db, "select role::text as role, position_id from profiles where id = $1", [U3]);
    expect(u3).toEqual({ role: "applicant", position_id: null });
  });

  it("the service role (server actions) can assign seats", async () => {
    await asServiceRole(db);
    await db.query("select public.assign_seat($1, 'food')", [U3]);
    await asUser(db, null);
    const u3 = await one(db, "select role::text as role from profiles where id = $1", [U3]);
    expect(u3.role).toBe("chair");
    await db.query("select public.unassign_seat($1)", [U3]);
  });

  it("a user cannot change their own email (it feeds legacy seat matching)", async () => {
    await asUser(db, U3);
    await expect(db.query("update profiles set email = 'rshaik@getmistified.com' where id = $1", [U3])).rejects.toThrow(/privileged/);
    await db.query("update profiles set preferred_name = 'Three' where id = $1", [U3]);
    await asUser(db, null);
    const u3 = await one(db, "select email, preferred_name from profiles where id = $1", [U3]);
    expect(u3).toEqual({ email: "plain@example.com", preferred_name: "Three" });
  });

  describe("accept_application", () => {
    const APP = "aaaaaaaa-0000-4000-8000-000000000001";
    const CYCLE = "cccccccc-0000-4000-8000-000000000001";

    it("assigns the seat and marks the application accepted in one step, noting an alternate seat", async () => {
      await db.query("insert into recruitment_cycles (id, year, type) values ($1, 2027, 'external')", [CYCLE]);
      await db.query(
        `insert into applications (id, cycle_id, applicant_id, applicant_email, applicant_name, gender, still_in_school, expected_time_commitment, one_change_essay, fell_short_essay)
         values ($1, $2, $3, 'plain@example.com', 'Plain', 'brother', true, '1-5', 'a', 'b')`,
        [APP, CYCLE, U3]
      );
      await db.query("insert into application_rankings (application_id, position_id, rank) values ($1, (select id from positions where slug = 'food'), 1)", [APP]);
      await asServiceRole(db);
      await db.query("select public.accept_application($1, (select id from positions where slug = 'hospitality'))", [APP]);
      await asUser(db, null);
      const app = await one(db, "select status::text as status, (select slug from positions where id = alternate_position_id) as alt from applications where id = $1", [APP]);
      expect(app).toEqual({ status: "accepted", alt: "hospitality" });
      const u3 = await one(db, "select role::text as role, (select slug from positions where id = position_id) as slug from profiles where id = $1", [U3]);
      expect(u3).toEqual({ role: "chair", slug: "hospitality" });
    });

    it("leaves the application untouched when the seat is full", async () => {
      await db.query("update positions set max_holders = 1 where slug = 'rd'");
      await db.query("select public.assign_seat($1, 'rd')", [U2]); // rd is now full
      await db.query("update applications set status = 'under_review' where id = $1", [APP]);
      await expect(
        db.query("select public.accept_application($1, (select id from positions where slug = 'rd'))", [APP])
      ).rejects.toThrow(/position_full/);
      const app = await one(db, "select status::text as status from applications where id = $1", [APP]);
      expect(app.status).toBe("under_review");
      const u3 = await one(db, "select (select slug from positions where id = position_id) as slug from profiles where id = $1", [U3]);
      expect(u3.slug).toBe("hospitality");
    });
  });
});
