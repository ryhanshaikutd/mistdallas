import { describe, it, expect } from "vitest";
import { announcementVisible } from "@/lib/announcements";

const a = (audience: "all" | "board" | "leadership" | "team", audience_team: "pr" | null = null, is_active = true) =>
  ({ audience, audience_team, is_active }) as const;

describe("announcementVisible", () => {
  it("'all' reaches applicants, 'board' does not", () => {
    expect(announcementVisible(a("all"), { role: "applicant", team: null })).toBe(true);
    expect(announcementVisible(a("board"), { role: "applicant", team: null })).toBe(false);
    expect(announcementVisible(a("board"), { role: "member", team: "sports" })).toBe(true);
  });

  it("'leadership' is for RD and ADs only", () => {
    expect(announcementVisible(a("leadership"), { role: "director", team: "pr" })).toBe(false);
    expect(announcementVisible(a("leadership"), { role: "internal_ad", team: "exec" })).toBe(true);
  });

  it("'team' matches the viewer's team or leadership; a missing team reaches leadership only", () => {
    expect(announcementVisible(a("team", "pr"), { role: "chair", team: "pr" })).toBe(true);
    expect(announcementVisible(a("team", "pr"), { role: "chair", team: "sports" })).toBe(false);
    expect(announcementVisible(a("team", "pr"), { role: "regional_director", team: "exec" })).toBe(true);
    expect(announcementVisible(a("team", null), { role: "chair", team: "pr" })).toBe(false);
    expect(announcementVisible(a("team", null), { role: "external_ad", team: "exec" })).toBe(true);
  });

  it("inactive announcements are hidden from everyone but leadership", () => {
    expect(announcementVisible(a("all", null, false), { role: "member", team: "pr" })).toBe(false);
    expect(announcementVisible(a("all", null, false), { role: "regional_director", team: null })).toBe(true);
  });
});
