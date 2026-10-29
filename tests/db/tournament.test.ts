import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, signUp, asUser } from "./harness";

const MEMBER = "22222222-2222-4222-8222-222222222222";
const RD = "33333333-3333-4333-8333-333333333333";
const TABLES = [
  "tournament_rooms", "room_availability", "competition_blocks", "student_registrations",
  "student_competition_entries", "room_assignments", "nfc_scan_logs",
  "mymist_import_batches", "mymist_participants", "mymist_schools", "mymist_judges",
];

describe("tournament and MyMIST schema migration", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
    await signUp(db, { id: MEMBER, email: "member@example.com", full_name: "Member" });
    await signUp(db, { id: RD, email: "rd@example.com", full_name: "RD" });
    await db.query("update profiles set role = 'member', team = 'logistics' where id = $1", [MEMBER]);
    await db.query("select public.assign_seat($1, 'rd')", [RD]);
  });

  it("creates all eleven tables", async () => {
    const r = await db.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public'");
    const names = r.rows.map((x) => x.table_name);
    for (const t of TABLES) expect(names).toContain(t);
  });

  it("checks competition block status values", async () => {
    await expect(
      db.query("insert into competition_blocks (competition_name, block_date, starts_at, ends_at, status) values ('Poetry', '2027-03-26', '10:00', '11:00', 'bogus')")
    ).rejects.toThrow(/status/);
  });

  it("leadership manages rooms; a member can log a scan but not add a room", async () => {
    await asUser(db, RD);
    await db.query("insert into tournament_rooms (id, room_name, capacity) values ('room-101', 'Room 101', 40)");
    await asUser(db, MEMBER);
    await db.query("insert into nfc_scan_logs (nfc_uid, room_id, scan_result, scanned_by) values ('TAG-1', 'room-101', 'unknown_tag', $1)", [MEMBER]);
    await expect(
      db.query("insert into tournament_rooms (id, room_name, capacity) values ('room-102', 'Room 102', 40)")
    ).rejects.toThrow(/row-level security/);
    const rooms = await db.query<{ n: number }>("select count(*)::int as n from tournament_rooms");
    expect(rooms.rows[0].n).toBe(1);
    await asUser(db, null);
  });
});
