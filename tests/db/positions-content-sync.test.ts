import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { migrationFiles } from "./harness";
import { WORKBOOK_ROLES } from "@/lib/workbook/content";

/** Catalog rows look like ('slug', 'Title', 'team', 'PHASE', ...); the title→slug map rows do not have an uppercase phase. */
function catalogFromSql(): Map<string, string> {
  const file = migrationFiles().find((f) => f.includes("01_positions_seats"))!;
  const sql = fs.readFileSync(file, "utf8");
  const out = new Map<string, string>();
  for (const m of sql.matchAll(/^\s*\('([a-z0-9-]+)',\s+'[^']+',\s+'([a-z_]+)',\s+'[A-Z]+',/gm)) out.set(m[1], m[2]);
  return out;
}

describe("positions seed matches workbook content", () => {
  const sql = catalogFromSql();

  it("seeds exactly the workbook roles plus the dream-team seat", () => {
    const expected = new Set([...Object.keys(WORKBOOK_ROLES), "dream-team"]);
    expect(new Set(sql.keys())).toEqual(expected);
  });

  it("agrees on every role's team", () => {
    for (const [slug, role] of Object.entries(WORKBOOK_ROLES)) expect(sql.get(slug), slug).toBe(role.team);
  });
});
