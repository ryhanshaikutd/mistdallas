import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, signUp, asUser } from "./harness";

const U1 = "11111111-1111-4111-8111-111111111111";

describe("baseline schema", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
  });

  it("applies schema.sql and the audit migration", async () => {
    const r = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'"
    );
    const names = r.rows.map((x) => x.table_name);
    for (const t of ["profiles", "positions", "milestones", "qualifiers"]) expect(names).toContain(t);
  });

  it("signup trigger creates an applicant profile", async () => {
    await signUp(db, { id: U1, email: "a@example.com", full_name: "A" });
    const r = await db.query<{ role: string; full_name: string }>(
      "select role::text as role, full_name from profiles where id = $1",
      [U1]
    );
    expect(r.rows[0]).toEqual({ role: "applicant", full_name: "A" });
  });

  it("current_user_role reflects the jwt subject", async () => {
    await asUser(db, U1);
    const r = await db.query<{ r: string }>("select public.current_user_role()::text as r");
    expect(r.rows[0].r).toBe("applicant");
    await asUser(db, null);
  });
});
