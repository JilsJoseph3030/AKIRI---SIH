import { describe, expect, it } from "vitest";
import { MARKET_AS_OF, MARKET_SNAPSHOT } from "../src/domain/market";
import { MATERIAL_CATEGORIES } from "../src/domain/schemas";

describe("market snapshot", () => {
  it("covers all 7 material categories with dated 7-day histories", () => {
    expect(MARKET_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const category of MATERIAL_CATEGORIES) {
      const row = MARKET_SNAPSHOT.find((r) => r.category === category);
      expect(row, category).toBeDefined();
      expect(row!.history7d).toHaveLength(7);
      expect(row!.history7d[6]).toBe(row!.spotInrPerKg);
      expect(row!.history7d.every((v) => v > 0)).toBe(true);
    }
  });

  it("24h change matches the last two history bins", () => {
    for (const row of MARKET_SNAPSHOT) {
      const prev = row.history7d[5]!;
      const expected = Math.round(((row.spotInrPerKg - prev) / prev) * 1000) / 10;
      expect(row.changePct24h).toBe(expected);
    }
  });
});
