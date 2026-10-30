import { describe, it, expect } from "vitest";
import type { Milestone, Position } from "@/lib/types";
import { WORKBOOK_ROLES } from "@/lib/workbook/content";
import { deliverableIds } from "@/lib/workbook/progress";
import { buildRoster, teamReadiness, attentionTeams, teamDeadlines } from "@/lib/roster";

const pos = (id: string, slug: string, team: Position["team"], sort: number, extra: Partial<Position> = {}): Position => ({
  id, slug, title: WORKBOOK_ROLES[slug]?.title ?? slug, team, phase: "BUILD", description: null, is_active: true,
  reports_to_position_id: null, role_tier: "chair", is_exec: false, open_for_applications: false, max_holders: null, sort_order: sort, ...extra,
});
const positions = [
  pos("p-comms", "comms", "logistics", 21),
  pos("p-food", "food", "logistics", 22),
  pos("p-rd", "rd", "exec", 1, { role_tier: "regional_director", is_exec: true, phase: "FOUNDATIONS" }),
  pos("p-sports", "sports-lead", "sports", 33, { role_tier: "director", is_exec: true, phase: "FOUNDATIONS", open_for_applications: true }),
];
const profiles = [
  { id: "u1", full_name: "Ann", email: "ann@x.com", avatar_url: null, position_id: "p-comms" },
  { id: "u2", full_name: "Bob", email: "bob@x.com", avatar_url: null, position_id: "p-comms" },
  { id: "u3", full_name: "Cat", email: "cat@x.com", avatar_url: null, position_id: "p-rd" },
  { id: "u4", full_name: "Dan", email: "dan@x.com", avatar_url: null, position_id: null },
];
const allChecked = (slug: string, phase: "foundations" | "build") =>
  Object.fromEntries(deliverableIds(WORKBOOK_ROLES[slug].phases[phase].deliverables).map((id) => [id, true as const]));
const progress = [
  { user_id: "u1", position_slug: "comms", phase: "foundations" as const, data: { checks: allChecked("comms", "foundations"), notes: "", fields: {} } },
];

describe("buildRoster", () => {
  const rows = buildRoster(positions, profiles, progress);

  it("yields one row per holder and one unfilled row per empty seat, in team then sort order", () => {
    expect(rows.map((r) => [r.slug, r.holder?.fullName ?? null])).toEqual([
      ["rd", "Cat"], ["comms", "Ann"], ["comms", "Bob"], ["food", null], ["sports-lead", null],
    ]);
  });

  it("computes each holder's overall workbook progress", () => {
    expect(rows.find((r) => r.holder?.fullName === "Ann")!.progress).toBe(25);
    expect(rows.find((r) => r.holder?.fullName === "Bob")!.progress).toBe(0);
    expect(rows.find((r) => r.slug === "food")!.progress).toBe(0);
  });

  it("carries seat metadata", () => {
    const sports = rows.find((r) => r.slug === "sports-lead")!;
    expect(sports).toMatchObject({ team: "sports", startPhase: "foundations", tier: "director", isExec: true, openForApplications: true, holder: null });
  });
});

describe("teamReadiness and attentionTeams", () => {
  const readiness = teamReadiness(buildRoster(positions, profiles, progress));

  it("aggregates per team and sorts by open seats desc, then progress asc", () => {
    expect(readiness.map((t) => [t.team, t.total, t.filled, t.open, t.progress])).toEqual([
      ["sports", 1, 0, 1, 0],
      ["logistics", 3, 2, 1, 8],
      ["exec", 1, 1, 0, 0],
    ]);
    expect(readiness.find((t) => t.team === "logistics")!.starts).toEqual(["build"]);
  });

  it("flags teams with open seats or progress under 35, at most four", () => {
    expect(attentionTeams(readiness).map((t) => t.team)).toEqual(["sports", "logistics", "exec"]);
    const many = Array.from({ length: 6 }, (_, i) => ({ team: "pr" as const, total: 1, filled: 0, open: 1, progress: i, starts: [] }));
    expect(attentionTeams(many)).toHaveLength(4);
    expect(attentionTeams([{ team: "pr", total: 2, filled: 2, open: 0, progress: 80, starts: [] }])).toEqual([]);
  });
});

describe("teamDeadlines", () => {
  const m = (title: string, owner_label: string) => ({ id: title, title, owner_label, target_date: "2027-01-01" }) as Milestone;
  const milestones = [m("All", "All Teams"), m("Sports brief", "Sports Director"), m("DT training", "Dream Team"), m("Ops", "Operations + Comms")];

  it("matches 'All Teams' and the team's label, case-insensitively", () => {
    expect(teamDeadlines(milestones, "sports").map((x) => x.title)).toEqual(["All", "Sports brief"]);
    expect(teamDeadlines(milestones, "logistics").map((x) => x.title)).toEqual(["All", "Ops"]);
    expect(teamDeadlines(milestones, "finance").map((x) => x.title)).toEqual(["All"]);
  });
});
