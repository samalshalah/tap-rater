import { describe, expect, it } from "vitest";
import { encodeCsv, parseCsv } from "@/lib/csv";

describe("CSV utilities", () => {
  it("round-trips commas, quotes, newlines, unicode, apostrophes, ampersands, and query strings", () => {
    const csv = encodeCsv(
      [
        {
          title: "River Cafe, Downtown",
          description: "Line one\nLine \"two\" & more",
          url: "https://example.com/path?a=1&b=two",
          unicode: "Café"
        }
      ],
      ["title", "description", "url", "unicode"]
    );

    expect(parseCsv(csv).rows[0]).toEqual({
      title: "River Cafe, Downtown",
      description: "Line one\nLine \"two\" & more",
      url: "https://example.com/path?a=1&b=two",
      unicode: "Café"
    });
  });

  it("escapes spreadsheet formula cells and restores them during import", () => {
    const csv = encodeCsv([{ value: "=cmd" }, { value: "+sum" }, { value: "-danger" }, { value: "@user" }], ["value"]);

    expect(csv).toContain("'=cmd");
    expect(parseCsv(csv).rows.map((row) => row.value)).toEqual(["=cmd", "+sum", "-danger", "@user"]);
  });
});
