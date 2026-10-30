import { describe, it, expect } from "vitest";
import { WORKBOOK_ROLES, PHASE_META, BOARD_STANDARD, workbookFor } from "@/lib/workbook/content";

const PHASES = ["foundations", "build", "stabilization", "execution"] as const;
const TEAMS = new Set(["exec", "competitions", "logistics", "dream_team", "finance", "pr", "sports", "registration", "programs"]);

describe("workbook content", () => {
  const roles = Object.values(WORKBOOK_ROLES);

  it("has the handbook's 34 roles keyed by slug", () => {
    expect(roles).toHaveLength(34);
    for (const [slug, role] of Object.entries(WORKBOOK_ROLES)) expect(role.slug).toBe(slug);
  });

  it("gives every role all four phases with content", () => {
    for (const role of roles) {
      for (const phase of PHASES) {
        const p = role.phases[phase];
        expect(p, `${role.slug}.${phase}`).toBeDefined();
        expect(typeof p.focus).toBe("string");
        expect(Array.isArray(p.deliverables)).toBe(true);
        expect(Array.isArray(p.responsibilities)).toBe(true);
      }
      expect(role.phases[role.startPhase].deliverables.length, `${role.slug} start phase`).toBeGreaterThan(0);
    }
  });

  it("resolves reporting lines and managed roles to slugs", () => {
    for (const role of roles) {
      if (role.reportsTo !== null) expect(WORKBOOK_ROLES[role.reportsTo], `${role.slug} reports to ${role.reportsTo}`).toBeDefined();
      for (const m of role.manages) expect(WORKBOOK_ROLES[m], `${role.slug} manages ${m}`).toBeDefined();
    }
    expect(WORKBOOK_ROLES.rd.reportsTo).toBeNull();
    expect(WORKBOOK_ROLES.comms.reportsTo).toBe("logistics-lead");
    expect(WORKBOOK_ROLES["internal-ad"].manages).toEqual(["comps-lead", "marketing-lead", "dt-lead", "logistics-lead"]);
  });

  it("applies the three placement fixes and uses mistdallas team values", () => {
    expect(WORKBOOK_ROLES.outreach.team).toBe("pr");
    expect(WORKBOOK_ROLES.outreach.reportsTo).toBe("marketing-lead");
    expect(WORKBOOK_ROLES["marketing-lead"].manages).toContain("outreach");
    expect(WORKBOOK_ROLES.ceremonies.team).toBe("programs");
    expect(WORKBOOK_ROLES.ceremonies.reportsTo).toBe("programs-lead");
    expect(WORKBOOK_ROLES.esports.team).toBe("competitions");
    expect(WORKBOOK_ROLES.registration.reportsTo).toBe("tech-lead");
    for (const role of roles) expect(TEAMS.has(role.team), `${role.slug} team ${role.team}`).toBe(true);
  });

  it("exposes phase metadata and the board standard", () => {
    expect(PHASES.map((p) => PHASE_META[p].id)).toEqual([...PHASES]);
    expect(PHASE_META.build.shortLabel).toBe("Build");
    expect(BOARD_STANDARD).toHaveLength(12);
  });

  it("workbookFor returns the role or null", () => {
    expect(workbookFor("rd")?.title).toBe("Regional Director");
    expect(workbookFor("dream-team")).toBeNull();
    expect(workbookFor(null)).toBeNull();
  });
});
