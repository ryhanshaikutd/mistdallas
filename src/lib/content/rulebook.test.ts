import { describe, it, expect } from "vitest";
import { RULEBOOK_ENTRIES, searchRulebook } from "@/lib/content/rulebook";

describe("rulebook", () => {
  it("carries the handbook's eight entries, reworded for the portal", () => {
    expect(RULEBOOK_ENTRIES).toHaveLength(8);
    expect(RULEBOOK_ENTRIES.map((e) => e.category)).toEqual([
      "Confidentiality", "Professionalism", "Roles", "Applications", "Deadlines", "Meetings", "Event Weekend", "MyMIST",
    ]);
    expect(RULEBOOK_ENTRIES.find((e) => e.category === "Roles")!.answer).toMatch(/assigned by leadership/i);
    expect(RULEBOOK_ENTRIES.find((e) => e.category === "Deadlines")!.answer).not.toMatch(/edge function/i);
  });

  it("searches question, answer, category and keywords case-insensitively", () => {
    expect(searchRulebook(RULEBOOK_ENTRIES, "parents").map((e) => e.category)).toEqual(["Confidentiality"]);
    expect(searchRulebook(RULEBOOK_ENTRIES, "MYMIST").map((e) => e.category)).toContain("MyMIST");
    expect(searchRulebook(RULEBOOK_ENTRIES, "")).toHaveLength(8);
    expect(searchRulebook(RULEBOOK_ENTRIES, "zzzz")).toEqual([]);
  });
});
