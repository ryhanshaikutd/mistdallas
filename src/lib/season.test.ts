import { describe, it, expect } from "vitest";
import { currentPhase, daysUntil, seasonLabel } from "@/lib/season";
import type { SeasonSettings } from "@/lib/types";

const season: SeasonSettings = {
  year: 2027, tournament_start: "2027-03-25", tournament_end: "2027-03-28", applications_due: "2026-09-30",
  foundations_start: "2026-09-01", build_start: "2026-10-15", stabilization_start: "2026-12-01",
  execution_start: "2027-02-01", season_end: "2027-04-11", is_current: true,
};

describe("season helpers", () => {
  it("currentPhase follows the phase start dates", () => {
    expect(currentPhase(season, "2026-08-15")).toBe("foundations");
    expect(currentPhase(season, "2026-10-14")).toBe("foundations");
    expect(currentPhase(season, "2026-10-15")).toBe("build");
    expect(currentPhase(season, "2026-12-25")).toBe("stabilization");
    expect(currentPhase(season, "2027-02-01")).toBe("execution");
    expect(currentPhase(season, "2027-05-01")).toBe("execution");
  });

  it("daysUntil and seasonLabel", () => {
    expect(daysUntil("2027-03-25", "2027-03-20")).toBe(5);
    expect(daysUntil("2027-03-25", "2027-03-26")).toBe(-1);
    expect(seasonLabel(season)).toBe("2026–27");
  });
});
