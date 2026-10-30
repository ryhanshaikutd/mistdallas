import { describe, it, expect } from "vitest";
import { PORTAL_NAV, visibleNav, navGroups, titleFor } from "@/components/portal/nav";

const labels = (role: string) => visibleNav(role, { includeSettings: true }).map((i) => i.label);

describe("portal navigation visibility", () => {
  it("applicants see only Dashboard, Apply and Settings", () => {
    expect(labels("applicant")).toEqual(["Dashboard", "Apply", "Settings"]);
  });

  it("members see the season tools but nothing from the leadership group", () => {
    const l = labels("member");
    for (const x of ["Workbook", "Calendar", "Teams", "Timeline", "Progress", "Directory", "Meetings", "Handbook"]) expect(l).toContain(x);
    for (const x of ["Planning", "Applications", "Interviews", "Command Center", "Positions", "Announcements", "Feedback", "Insights"]) expect(l).not.toContain(x);
  });

  it("directors get Planning, Command Center and Insights but not leadership-only pages", () => {
    const l = labels("director");
    for (const x of ["Planning", "Command Center", "Insights"]) expect(l).toContain(x);
    for (const x of ["Positions", "Applications", "Interviews", "Announcements", "Feedback"]) expect(l).not.toContain(x);
  });

  it("the regional director sees everything", () => {
    expect(labels("regional_director")).toEqual(PORTAL_NAV.map((i) => i.label));
  });

  it("navGroups drops empty groups and keeps the group order", () => {
    expect(navGroups("member").map((g) => g.group)).toEqual(["main", "recruiting", "season"]);
    expect(navGroups("regional_director").map((g) => g.group)).toEqual(["main", "recruiting", "season", "leadership"]);
    expect(navGroups("applicant", { includeSettings: false }).flatMap((g) => g.items.map((i) => i.label))).toEqual(["Dashboard", "Apply"]);
  });

  it("titleFor picks the longest matching href", () => {
    expect(titleFor("/portal")).toBe("Dashboard");
    expect(titleFor("/portal/teams/sports")).toBe("Teams");
    expect(titleFor("/portal/settings")).toBe("Settings");
    expect(titleFor("/portal/unknown")).toBe("Portal");
  });
});
