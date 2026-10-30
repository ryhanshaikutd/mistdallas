import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  LEGACY_SLUG_ALIASES, mapProfile, mapWorkbookRow, toSql, deliverableId, deliverableIds, extractDeliverables,
} from "./handbook-map.mjs";
import { deliverableId as tsDeliverableId, deliverableIds as tsDeliverableIds } from "../../src/lib/workbook/progress";

const SLUGS = new Set(["rd", "arts", "comms", "group-projects"]);
const ROLES = { arts: { foundations: ["Oct 1: A", "Oct 5: B"] } };

describe("mapProfile", () => {
  it("lower-cases the email and applies slug aliases", () => {
    expect(LEGACY_SLUG_ALIASES).toEqual({ groups: "group-projects", communications: "comms" });
    const r = mapProfile({ email: "ZZ@Example.com", full_name: "Zed", role_id: "groups", is_admin: false }, SLUGS);
    expect(r).toEqual({ email: "zz@example.com", full_name: "Zed", position_slug: "group-projects", is_admin: false });
  });

  it("flags a misspelled board domain and unknown role ids", () => {
    const typo = mapProfile({ email: "s.mohamed2@getmistfied.com", full_name: "S", role_id: "arts", is_admin: false }, SLUGS);
    expect(typo.warning).toMatch(/misspelled/);
    const unknown = mapProfile({ email: "a@b.com", full_name: "", role_id: "wizard", is_admin: false }, SLUGS);
    expect(unknown.position_slug).toBeNull();
    expect(unknown.warning).toMatch(/unknown role_id/);
    const none = mapProfile({ email: "a@b.com", full_name: null, role_id: null, is_admin: true }, SLUGS);
    expect(none).toEqual({ email: "a@b.com", full_name: null, position_slug: null, is_admin: true });
  });
});

describe("mapWorkbookRow", () => {
  const profiles = new Map([["u1", { email: "zz@example.com", position_slug: "arts" }], ["u2", { email: "x@y.com", position_slug: null }]]);
  const row = { user_id: "u1", phase: "foundations", percent_complete: 0, updated_at: "2026-09-24T18:54:16.791+00:00",
    data: { notes: "", checks: [false, true], fields: { "framework-0-0-2": "" } } };

  it("converts the handbook row shape into the keyed form", () => {
    expect(mapWorkbookRow(row, profiles, ROLES)).toEqual({
      email: "zz@example.com", position_slug: "arts", phase: "foundations", percent_complete: 0,
      updated_at: "2026-09-24T18:54:16.791+00:00",
      data: { checks: { [deliverableId("Oct 5: B")]: true }, notes: "", fields: { "framework-0-0-2": "" } },
    });
  });

  it("returns null for a profile without a seat", () => {
    expect(mapWorkbookRow({ ...row, user_id: "u2" }, profiles, ROLES)).toBeNull();
    expect(mapWorkbookRow({ ...row, user_id: "nobody" }, profiles, ROLES)).toBeNull();
  });
});

describe("toSql", () => {
  it("emits idempotent upserts with escaped quotes", () => {
    const sql = toSql(
      [{ email: "o'neil@example.com", full_name: "O'Neil", position_slug: "arts", is_admin: false }],
      [{ email: "o'neil@example.com", position_slug: "arts", phase: "build", data: { checks: {}, notes: "it's", fields: {} }, percent_complete: 0, updated_at: null }]
    );
    expect(sql).toContain("insert into legacy_seat_assignments");
    expect(sql).toContain("('o''neil@example.com', 'O''Neil', 'arts', false, 'handbook-2027')");
    expect(sql).toContain("on conflict (email) do update");
    expect(sql).toContain("insert into legacy_workbook_progress");
    expect(sql).toContain(`'{"checks":{},"notes":"it''s","fields":{}}'::jsonb`);
    expect(sql).toContain("on conflict (email, position_slug, phase) do update");
  });
});

describe("deliverable ids match the TypeScript implementation", () => {
  it("for sample strings and duplicates", () => {
    for (const s of ["Oct 1: Board structure", "  Mar 26–28:  Run   rounds ", "ÜNÏCØDE text"]) expect(deliverableId(s)).toBe(tsDeliverableId(s));
    expect(deliverableIds(["a", "a", "b"])).toEqual(tsDeliverableIds(["a", "a", "b"]));
  });
});

describe("extractDeliverables", () => {
  it("reads every role's deliverables out of content.ts", () => {
    const roles = extractDeliverables(fs.readFileSync("src/lib/workbook/content.ts", "utf8"));
    expect(Object.keys(roles)).toHaveLength(34);
    expect(roles.rd.foundations).toHaveLength(4);
    expect(roles.rd.foundations[0]).toMatch(/^Oct 1:/);
  });
});
