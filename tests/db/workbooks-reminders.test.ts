import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, signUp, asUser } from "./harness";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const U3 = "33333333-3333-4333-8333-333333333333";
type Row = Record<string, unknown>;
const one = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Row>(sql, params)).rows[0];

describe("workbook progress and reminders migration", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
    await signUp(db, { id: U1, email: "u1@example.com", full_name: "U1" });
    await signUp(db, { id: U2, email: "u2@example.com", full_name: "U2" });
    await db.query("select public.assign_seat($1, 'comms')", [U1]);
    await db.query("select public.assign_seat($1, 'food')", [U2]);
  });

  it("owner can upsert own progress but not another user's", async () => {
    await asUser(db, U1);
    await db.query(
      "insert into workbook_progress (user_id, position_slug, phase, data, percent_complete) values ($1, 'comms', 'build', '{\"notes\":\"a\"}', 10)",
      [U1]
    );
    await db.query(
      "update workbook_progress set data = '{\"notes\":\"b\"}', percent_complete = 20 where user_id = $1 and position_slug = 'comms' and phase = 'build'",
      [U1]
    );
    await expect(
      db.query("insert into workbook_progress (user_id, position_slug, phase) values ($1, 'food', 'build')", [U2])
    ).rejects.toThrow(/row-level security/);
    await asUser(db, null);
    const r = await one(db, "select data->>'notes' as notes, percent_complete from workbook_progress where user_id = $1", [U1]);
    expect(r).toEqual({ notes: "b", percent_complete: 20 });
  });

  it("board members can read everyone's progress", async () => {
    await asUser(db, U2);
    const r = await one(db, "select count(*)::int as n from workbook_progress");
    await asUser(db, null);
    expect(r.n).toBe(1);
  });

  it("rejects an unknown phase and an out-of-range percent", async () => {
    await expect(db.query("insert into workbook_progress (user_id, position_slug, phase) values ($1, 'comms', 'launch')", [U1])).rejects.toThrow(/phase/);
    await expect(db.query("insert into workbook_progress (user_id, position_slug, phase, percent_complete) values ($1, 'comms', 'execution', 101)", [U1])).rejects.toThrow(/percent/);
  });

  it("reminder preferences accept only the four lead times", async () => {
    await db.query("insert into reminder_preferences (user_id, email_enabled, days_before) values ($1, true, 3)", [U1]);
    await expect(db.query("insert into reminder_preferences (user_id, days_before) values ($1, 5)", [U2])).rejects.toThrow(/days_before/);
  });

  it("a duplicate reminder delivery is rejected", async () => {
    const m = await one(db, "select id from milestones where legacy_id = 'nov-30-nationals'");
    await db.query("insert into reminder_deliveries (user_id, milestone_id, reminder_date) values ($1, $2, '2026-11-23')", [U1, m.id]);
    await expect(
      db.query("insert into reminder_deliveries (user_id, milestone_id, reminder_date) values ($1, $2, '2026-11-23')", [U1, m.id])
    ).rejects.toThrow(/duplicate key/);
  });

  it("legacy workbook progress is copied when a legacy seat is applied", async () => {
    await db.query("insert into legacy_seat_assignments (email, full_name, position_slug) values ('zz@example.com', 'Zed', 'arts')");
    await db.query(
      "insert into legacy_workbook_progress (email, position_slug, phase, data, percent_complete, updated_at) values ('zz@example.com', 'arts', 'foundations', '{\"notes\":\"hi\",\"checks\":{},\"fields\":{}}', 0, '2026-09-24T18:54:16Z')"
    );
    await signUp(db, { id: U3, email: "ZZ@example.com" });
    const r = await one(db, "select position_slug, phase, data->>'notes' as notes, updated_at::text as updated_at from workbook_progress where user_id = $1", [U3]);
    expect(r).toMatchObject({ position_slug: "arts", phase: "foundations", notes: "hi" });
    expect(String(r.updated_at)).toContain("2026-09-24");
  });
});
