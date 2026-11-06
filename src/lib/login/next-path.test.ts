import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/login/next-path";

describe("safeNextPath", () => {
  it("keeps a same-origin relative path", () => {
    expect(safeNextPath("/portal/positions", "/portal")).toBe("/portal/positions");
  });
  it("falls back for null, empty, absolute and protocol-relative values", () => {
    for (const bad of [null, "", "https://evil.com", "//evil.com", "/\\evil.com", "@evil.com"]) {
      expect(safeNextPath(bad, "/portal")).toBe("/portal");
    }
  });
});
