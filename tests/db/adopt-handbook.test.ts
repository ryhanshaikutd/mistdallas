import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { createHandbookDb, applyMigrations, asAnon, asUser, schemaSql } from "./harness";

const ADOPT = path.resolve("supabase/adopt-handbook");
const before = () => fs.readFileSync(path.join(ADOPT, "01-before-schema.sql"), "utf8");
const after = () => fs.readFileSync(path.join(ADOPT, "02-after-migrations.sql"), "utf8");

const U = {
  lead: "11111111-0000-4000-8000-000000000001",
  groups: "11111111-0000-4000-8000-000000000002",
  noname: "11111111-0000-4000-8000-000000000003",
  typo: "11111111-0000-4000-8000-000000000004",
  lead2: "11111111-0000-4000-8000-000000000005",
  wizard: "11111111-0000-4000-8000-000000000006",
};
type Row = Record<string, unknown>;
const one = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Row>(sql, params)).rows[0];

describe("adopting the handbook project", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createHandbookDb();
    const people: [string, string, string | null, string | null, string | null, boolean][] = [
      [U.lead, "Lead@Board.Test", "Lead Person", "rd", "Executive", true],
      [U.groups, "groups@board.test", "Group Person", "groups", null, false],
      [U.noname, "noname@board.test", null, null, null, false],
      [U.typo, "typo@getmistfied.com", "Typo Person", "arts", "Competitions", false],
      [U.lead2, "lead2@board.test", "Second Lead", "rd", "Executive", true],
      [U.wizard, "unknown@board.test", "Mystery", "wizard", null, false],
    ];
    for (const [id, email, name, role, team, admin] of people) {
      await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
      await db.query("insert into profiles (id, email, full_name, role_id, team, is_admin) values ($1, $2, $3, $4, $5, $6)", [id, email, name, role, team, admin]);
    }
    await db.query(
      "insert into workbook_progress (user_id, phase, data, percent_complete) values ($1, 'foundations', $2, 0)",
      [U.groups, JSON.stringify({ notes: "hello", checks: [false, true], fields: { "framework-0-0-2": "x" } })]
    );
    await db.query("insert into reminder_preferences (user_id, email_enabled, days_before) values ($1, true, 3)", [U.lead]);

    await db.exec(before());
    await db.exec(before()); // idempotent
    await db.exec(schemaSql());
    await applyMigrations(db);
    await db.exec(after());
    await db.exec(after()); // idempotent
  });

  it("keeps every account with the same id and fills the new profile shape", async () => {
    const r = await db.query<Row>("select id, email, full_name, role::text as role from profiles order by id");
    expect(r.rows).toEqual([
      { id: U.lead, email: "lead@board.test", full_name: "Lead Person", role: "regional_director" },
      { id: U.groups, email: "groups@board.test", full_name: "Group Person", role: "chair" },
      { id: U.noname, email: "noname@board.test", full_name: "", role: "applicant" },
      { id: U.typo, email: "typo@getmistfied.com", full_name: "Typo Person", role: "chair" },
      { id: U.lead2, email: "lead2@board.test", full_name: "Second Lead", role: "regional_director" },
      { id: U.wizard, email: "unknown@board.test", full_name: "Mystery", role: "applicant" },
    ]);
  });

  it("maps handbook roles to seats, including aliases, and records unknown ones", async () => {
    const seat = async (id: string) => (await one(db, "select pos.slug, p.team::text as team from profiles p left join positions pos on pos.id = p.position_id where p.id = $1", [id]));
    expect(await seat(U.lead)).toEqual({ slug: "rd", team: "exec" });
    expect(await seat(U.groups)).toEqual({ slug: "group-projects", team: "competitions" });
    expect(await seat(U.typo)).toEqual({ slug: "arts", team: "competitions" });
    expect(await seat(U.wizard)).toEqual({ slug: null, team: null });
    const legacy = await one(db, "select position_slug, is_admin, applied_at from legacy_seat_assignments where email = 'unknown@board.test'");
    expect(legacy.position_slug).toBeNull();
    expect((await one(db, "select count(*)::int as n from legacy_seat_assignments where source = 'handbook-adoption'")).n).toBe(5);
  });

  it("renames handbook tables that hold data, drops empty ones, and lets the migrations seed fresh tables", async () => {
    const tables = (await db.query<{ t: string }>("select table_name as t from information_schema.tables where table_schema = 'public'")).rows.map((r) => r.t);
    expect(tables).toEqual(expect.arrayContaining(["handbook_profiles", "handbook_deadline_events", "handbook_announcements", "handbook_workbook_progress", "handbook_reminder_preferences"]));
    expect(tables).not.toContain("handbook_role_applications");
    expect(tables).not.toContain("handbook_messages");
    expect((await one(db, "select count(*)::int as n from handbook_deadline_events")).n).toBe(8);
    expect((await one(db, "select count(*)::int as n from handbook_announcements")).n).toBe(1);
    expect((await one(db, "select count(*)::int as n from announcements")).n).toBe(1);
    expect((await one(db, "select count(*)::int as n from milestones where legacy_id is not null")).n).toBe(46);
    expect((await one(db, "select count(*)::int as n from positions where is_active")).n).toBe(35);
    expect((await one(db, "select count(*)::int as n from tournament_rooms")).n).toBe(0);
  });

  it("carries reminder preferences and workbook notes over (checked items are reported, not guessed)", async () => {
    expect(await one(db, "select email_enabled, days_before from reminder_preferences where user_id = $1", [U.lead])).toEqual({ email_enabled: true, days_before: 3 });
    const wb = await one(db, "select position_slug, phase, data from workbook_progress where user_id = $1", [U.groups]);
    expect(wb.position_slug).toBe("group-projects");
    expect(wb.phase).toBe("foundations");
    expect(wb.data).toEqual({ checks: {}, notes: "hello", fields: { "framework-0-0-2": "x" } });
  });

  it("closes the handbook's anonymous read of profiles", async () => {
    await asAnon(db);
    const r = await db.query<Row>("select count(*)::int as n from profiles");
    await asUser(db, null);
    expect(r.rows[0].n).toBe(0);
  });
});
