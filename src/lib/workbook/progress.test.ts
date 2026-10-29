import { describe, it, expect } from "vitest";
import type { RoleWorkbook, WorkbookPhase } from "@/lib/workbook/types";
import {
  deliverableId, deliverableIds, phasePercent, overallPercent, fieldKey, emptyPhaseData,
  convertLegacyProgress, deliverableDueDate, nextActions,
} from "@/lib/workbook/progress";

const phase = (deliverables: string[]): WorkbookPhase => ({
  focus: "", responsibilities: [], deliverables, frameworks: [], weeklyPlan: [], reflections: [], risks: [],
});
const role: RoleWorkbook = {
  slug: "x", title: "X", team: "pr", startPhase: "foundations", badge: "", reportsTo: null, manages: [],
  phases: {
    foundations: phase(["Oct 1: A", "Oct 5: B", "Oct 10: C", "Oct 15: D"]),
    build: phase(["Nov 7: E"]),
    stabilization: phase([]),
    execution: phase(["Mar 26–28: F"]),
  },
};
const SEASON = { foundations_start: "2026-09-01", season_end: "2027-04-11" };

describe("deliverable ids", () => {
  it("are stable and ignore case and surrounding/inner whitespace", () => {
    expect(deliverableId("Oct 1: Board  structure")).toBe(deliverableId("  oct 1: board structure "));
    expect(deliverableId("Oct 1: Board structure")).toMatch(/^d-[0-9a-f]{8}$/);
  });

  it("disambiguate repeated texts within a phase", () => {
    const ids = deliverableIds(["a", "a", "b", "a"]);
    expect(ids).toEqual([deliverableId("a"), `${deliverableId("a")}-1`, deliverableId("b"), `${deliverableId("a")}-2`]);
  });

  it("survive reordering and change only the edited item", () => {
    const before = deliverableIds(["a", "b", "c"]);
    expect(new Set(deliverableIds(["c", "a", "b"]))).toEqual(new Set(before));
    const edited = deliverableIds(["a", "b (edited)", "c"]);
    expect(edited[0]).toBe(before[0]);
    expect(edited[2]).toBe(before[2]);
    expect(edited[1]).not.toBe(before[1]);
  });
});

describe("progress math", () => {
  const ids = deliverableIds(role.phases.foundations.deliverables);

  it("phasePercent is checked over total, rounded; empty or missing data is 0", () => {
    expect(phasePercent(role.phases.foundations, { ...emptyPhaseData(), checks: { [ids[0]]: true } })).toBe(25);
    expect(phasePercent(role.phases.foundations, null)).toBe(0);
    expect(phasePercent(role.phases.stabilization, { ...emptyPhaseData(), checks: { x: true } })).toBe(0);
  });

  it("overallPercent averages the four phases", () => {
    const all = Object.fromEntries(ids.map((id) => [id, true as const]));
    expect(overallPercent(role, { foundations: { ...emptyPhaseData(), checks: all } })).toBe(25);
    expect(overallPercent(role, {})).toBe(0);
  });

  it("fieldKey matches the handbook's key shape", () => {
    expect(fieldKey("framework", 0, 2, 1)).toBe("framework-0-2-1");
    expect(fieldKey("weekly", 0)).toBe("weekly-0");
    expect(fieldKey("reflection", 1)).toBe("reflection-1");
  });

  it("emptyPhaseData has the stored shape", () => {
    expect(emptyPhaseData()).toEqual({ checks: {}, notes: "", fields: {} });
  });

  it("convertLegacyProgress maps index-aligned checks to ids and keeps notes and fields", () => {
    const out = convertLegacyProgress(role, "foundations", { checks: [false, true], notes: "n", fields: { "framework-0-0-2": "v" } });
    expect(out).toEqual({ checks: { [ids[1]]: true }, notes: "n", fields: { "framework-0-0-2": "v" } });
    expect(convertLegacyProgress(role, "foundations", {})).toEqual(emptyPhaseData());
  });
});

describe("deliverable dates and next actions", () => {
  it("parses the leading month/day into the season's year", () => {
    expect(deliverableDueDate("Oct 1: Board structure released", SEASON)).toBe("2026-10-01");
    expect(deliverableDueDate("Mar 26–28: Run all rounds", SEASON)).toBe("2027-03-26");
    expect(deliverableDueDate("Oct 15+: Confirm all depts", SEASON)).toBe("2026-10-15");
    expect(deliverableDueDate("Jan 31: Participant registration reviewed", SEASON)).toBe("2027-01-31");
    expect(deliverableDueDate("Mid-Ramadan: cutoff", SEASON)).toBeNull();
    expect(deliverableDueDate("Ongoing judge outreach", SEASON)).toBeNull();
  });

  it("lists unchecked deliverables that are overdue or due within 14 days, oldest first", () => {
    const byPhase = { foundations: { ...emptyPhaseData(), checks: { [deliverableId("Oct 1: A")]: true } } };
    const out = nextActions(role, byPhase, SEASON, "2026-10-08");
    expect(out.map((a) => [a.text, a.due, a.overdue])).toEqual([
      ["Oct 5: B", "2026-10-05", true],
      ["Oct 10: C", "2026-10-10", false],
      ["Oct 15: D", "2026-10-15", false],
    ]);
    expect(nextActions(role, byPhase, SEASON, "2026-10-08", 1)).toHaveLength(1);
  });
});
