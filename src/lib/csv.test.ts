import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

const columns = [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }, { key: "d", label: "D" }, { key: "e", label: "E" }];

describe("toCsv", () => {
  it("quotes commas, quotes and newlines, doubles embedded quotes, uses CRLF, blanks nulls", () => {
    const csv = toCsv([{ a: "x", b: "has, comma", c: 'quote "q"', d: null, e: "line\nbreak" }], columns);
    expect(csv).toBe('A,B,C,D,E\r\nx,"has, comma","quote ""q""",,"line\nbreak"\r\n');
  });

  it("emits only the header for no rows and stringifies numbers and booleans", () => {
    expect(toCsv([], columns.slice(0, 2))).toBe("A,B\r\n");
    expect(toCsv([{ a: 5, b: true }], columns.slice(0, 2))).toBe("A,B\r\n5,true\r\n");
  });

  it("quotes a header label that needs it", () => {
    expect(toCsv([], [{ key: "x", label: "Owner, team" }])).toBe('"Owner, team"\r\n');
  });
});
