import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, signUp, asUser } from "./harness";

const CHAIR = "11111111-1111-4111-8111-111111111111"; // comms → logistics
const MEMBER = "22222222-2222-4222-8222-222222222222";
const RD = "33333333-3333-4333-8333-333333333333";
type Row = Record<string, unknown>;
const one = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Row>(sql, params)).rows[0];

describe("meetings, decisions and feedback themes migration", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
    await signUp(db, { id: CHAIR, email: "chair@example.com", full_name: "Chair" });
    await signUp(db, { id: MEMBER, email: "member@example.com", full_name: "Member" });
    await signUp(db, { id: RD, email: "rd@example.com", full_name: "RD" });
    await db.query("select public.assign_seat($1, 'comms')", [CHAIR]);
    await db.query("select public.assign_seat($1, 'rd')", [RD]);
    await db.query("update profiles set role = 'member', team = 'finance' where id = $1", [MEMBER]);
  });

  it("a chair can add a meeting note for their own team only", async () => {
    await asUser(db, CHAIR);
    await db.query(
      "insert into meeting_notes (title, meeting_date, team, agenda, created_by) values ('Ops sync', '2026-10-20', 'logistics', 'a', $1)",
      [CHAIR]
    );
    await expect(
      db.query("insert into meeting_notes (title, meeting_date, team, created_by) values ('Finance sync', '2026-10-20', 'finance', $1)", [CHAIR])
    ).rejects.toThrow(/row-level security/);
    await asUser(db, null);
  });

  it("a member can read notes but cannot log decisions", async () => {
    await asUser(db, MEMBER);
    const r = await one(db, "select count(*)::int as n from meeting_notes");
    expect(r.n).toBe(1);
    await expect(
      db.query("insert into decisions (title, category, team, created_by) values ('Cut budget', 'Budget', 'finance', $1)", [MEMBER])
    ).rejects.toThrow(/row-level security/);
    await asUser(db, null);
  });

  it("leadership can log a decision for any team and categories are checked", async () => {
    await asUser(db, RD);
    await db.query("insert into decisions (title, category, team, decision, created_by) values ('Venue picked', 'Venue', 'logistics', 'UTD', $1)", [RD]);
    await expect(
      db.query("insert into decisions (title, category, created_by) values ('x', 'Vibes', $1)", [RD])
    ).rejects.toThrow(/category/);
    await asUser(db, null);
  });

  it("seeds the five feedback themes", async () => {
    const n = await one(db, "select count(*)::int as n from feedback_themes");
    expect(n.n).toBe(5);
    const t = await one(db, "select phase::text as phase, owner_label, status from feedback_themes where slug = 'training'");
    expect(t).toEqual({ phase: "FOUNDATIONS", owner_label: "RD / ADs + Directors", status: "Needs owner check" });
  });

  it("exposes the caller's team through current_user_team()", async () => {
    await asUser(db, CHAIR);
    const r = await one(db, "select public.current_user_team()::text as t");
    await asUser(db, null);
    expect(r.t).toBe("logistics");
  });
});
