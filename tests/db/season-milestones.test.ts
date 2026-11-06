import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, migrationFiles, signUp, asUser } from "./harness";

type Row = Record<string, unknown>;
const one = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Row>(sql, params)).rows[0];

describe("season settings, milestones and announcements migration", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
  });

  it("seeds the current season", async () => {
    const r = await one(db, "select year, tournament_start::text as ts, applications_due::text as due from season_settings where is_current");
    expect(r).toEqual({ year: 2027, ts: "2027-03-25", due: "2026-09-30" });
  });

  it("seeds 46 milestones with phases, priorities and types", async () => {
    const n = await one(db, "select count(*)::int as n from milestones where legacy_id is not null");
    expect(n.n).toBe(46);
    const nationals = await one(db, "select phase::text as phase, priority, deadline_type from milestones where legacy_id = 'nov-30-nationals'");
    expect(nationals).toEqual({ phase: "BUILD", priority: "critical", deadline_type: "Hard Deadline" });
    const runShow = await one(db, "select owner_label, date_label, target_date::text as d, send_reminders from milestones where legacy_id = 'execution-run-show'");
    expect(runShow).toEqual({ owner_label: "All Teams", date_label: "Event Week", d: "2027-01-20", send_reminders: true });
    const regOpen = await one(db, "select phase::text as phase, priority, deadline_type from milestones where legacy_id = 'jan-01-reg-open'");
    expect(regOpen).toEqual({ phase: "STABILIZATION", priority: "high", deadline_type: "Registration" });
    const reports = await one(db, "select phase::text as phase, priority, deadline_type, is_recurring from milestones where legacy_id = 'apr-11-reports'");
    expect(reports).toEqual({ phase: "EXECUTION", priority: "low", deadline_type: "Post-Event", is_recurring: false });
    const checkin = await one(db, "select phase::text as phase, deadline_type from milestones where legacy_id = 'oct-11-biweekly'");
    expect(checkin).toEqual({ phase: "FOUNDATIONS", deadline_type: "Check-in" });
  });

  it("milestone seed is idempotent", async () => {
    const file = migrationFiles().find((f) => f.includes("02_season"))!;
    await db.exec(fs.readFileSync(file, "utf8"));
    const n = await one(db, "select count(*)::int as n from milestones where legacy_id is not null");
    expect(n.n).toBe(46);
  });

  it("seeds the welcome announcement", async () => {
    const r = await db.query<Row>("select legacy_id, audience, priority, is_active from announcements");
    expect(r.rows).toEqual([{ legacy_id: "welcome", audience: "all", priority: "medium", is_active: true }]);
  });

  it("rejects an unknown announcement audience", async () => {
    await expect(
      db.query("insert into announcements (title, audience) values ('x', 'friends')")
    ).rejects.toThrow(/audience/);
  });

  it("only one season can be current", async () => {
    await expect(
      db.query(`insert into season_settings (year, tournament_start, tournament_end, foundations_start, build_start, stabilization_start, execution_start, season_end, is_current)
        values (2028, '2028-03-23', '2028-03-26', '2027-09-01', '2027-10-15', '2027-12-01', '2028-02-01', '2028-04-11', true)`)
    ).rejects.toThrow(/one_current/);
  });
  describe("announcement audiences are enforced by RLS", () => {
    const APPLICANT = "a1a1a1a1-0000-4000-8000-000000000001";
    const CHAIR = "c1c1c1c1-0000-4000-8000-000000000001";
    const RD = "d1d1d1d1-0000-4000-8000-000000000001";

    const titles = async () => (await db.query<{ title: string }>("select title from announcements order by title")).rows.map((r) => r.title);

    it("shows each reader only the announcements meant for them", async () => {
      await signUp(db, { id: APPLICANT, email: "app@example.com" });
      await signUp(db, { id: CHAIR, email: "chair@example.com" });
      await signUp(db, { id: RD, email: "rd@example.com" });
      await db.query("select public.assign_seat($1, 'marketing-coord')", [CHAIR]);
      await db.query("select public.assign_seat($1, 'rd')", [RD]);
      await db.exec(`insert into announcements (title, audience, audience_team, is_active) values
        ('Board only', 'board', null, true),
        ('Leaders only', 'leadership', null, true),
        ('Marketing only', 'team', 'pr', true),
        ('Sports only', 'team', 'sports', true),
        ('Old news', 'all', null, false)`);

      await asUser(db, APPLICANT);
      expect(await titles()).toEqual(["Welcome to the MIST Dallas 2027 portal"]);
      await asUser(db, CHAIR);
      expect(await titles()).toEqual(["Board only", "Marketing only", "Welcome to the MIST Dallas 2027 portal"]);
      await asUser(db, RD);
      expect(await titles()).toEqual(["Board only", "Leaders only", "Marketing only", "Old news", "Sports only", "Welcome to the MIST Dallas 2027 portal"]);
      await asUser(db, null);
    });
  });
});
