import type { MaterialCategory } from "./schemas";

/**
 * Indicative market snapshot (NOT exchange data): wholesale/market buying
 * rates researched Sep 2026, vs the collector-facing PRICES which are
 * fixed first-buyer rates. Sparkline bins are illustrative 7-day drift
 * around spot — the board labels them as such. Live refresh goes through
 * Exa web research (POST /market/refresh with EXA_API_KEY configured).
 */
export interface MarketRow {
  category: MaterialCategory;
  label: string;
  spotInrPerKg: number;
  changePct24h: number;
  /** 7 daily closes, oldest → newest, last == spot. Illustrative drift. */
  history7d: number[];
  source: string;
  confidence: "sourced" | "indicative";
}

export const MARKET_AS_OF = "2026-09-11";

function row(
  category: MaterialCategory,
  label: string,
  spotInrPerKg: number,
  drift: number[],
  source: string,
  confidence: "sourced" | "indicative",
): MarketRow {
  const history7d = drift.map((d) => Math.round(spotInrPerKg * d));
  history7d[6] = spotInrPerKg;
  const changePct24h =
    Math.round(((spotInrPerKg - history7d[5]!) / history7d[5]!) * 1000) / 10;
  return { category, label, spotInrPerKg, changePct24h, history7d, source, confidence };
}

export const MARKET_SNAPSHOT: MarketRow[] = [
  row("pcb", "PCB / Circuit boards", 540, [0.94, 0.95, 0.97, 0.96, 0.98, 0.99, 1], "scrap.trade: low-grade ₹374 / high-grade ₹936 per kg", "sourced"),
  row("cable", "Copper cable / wire", 595, [0.97, 0.98, 0.97, 0.99, 1.0, 0.99, 1], "scraprates.in: bright wire ₹600–720 per kg", "sourced"),
  row("battery", "Lead-acid battery", 62, [1.0, 0.99, 1.0, 1.01, 1.0, 1.0, 1], "scraprates.in: ~₹61–62 per kg, Aug–Sep 2026", "sourced"),
  row("mixed_plastics", "Mixed plastics", 15, [0.95, 0.97, 0.94, 0.98, 1.0, 1.02, 1], "scraprates.in Hosur ₹14.23; range ₹8–25 per kg", "sourced"),
  row("motor_magnet", "Motor / magnet", 145, [0.99, 1.0, 0.99, 1.0, 1.01, 1.0, 1], "dealer-range estimate, copper-winding content", "indicative"),
  row("lcd_panel", "LCD panels", 48, [1.0, 1.0, 0.99, 1.0, 1.0, 1.0, 1], "near mixed e-waste avg ~₹42–45 per kg", "indicative"),
  row("crt", "CRT monitors", 22, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1], "low-value bulky glass stream", "indicative"),
];

export function marketByCategory(category: MaterialCategory): MarketRow | null {
  return MARKET_SNAPSHOT.find((r) => r.category === category) ?? null;
}
