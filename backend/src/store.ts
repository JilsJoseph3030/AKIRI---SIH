// In-memory store for the hackathon vertical slice. Same REST contract a
// FastAPI + PostgreSQL service implements later — swap this module only.
import type { LedgerEntry, Transaction } from "./domain/schemas.js";
import { PRICES, RECYCLERS } from "./domain/seed.js";

export const lots = new Map<string, Transaction>();
export const chains = new Map<string, LedgerEntry[]>(); // lotId -> chain

export function exportRows(format: "csv" | "json"): string {
  const rows = [...lots.values()].filter((t) => t.status === "confirmed");
  if (format === "json") return JSON.stringify(rows, null, 2);
  const header = "id,category,weight_kg,value_inr,recycler_id,timestamp,ledger_ref";
  const lines = rows.map((t) =>
    [t.id, t.category, t.weightKg, t.estimatedValueInr, t.recyclerId ?? "", t.timestamp, t.ledgerRef ?? ""].join(","),
  );
  return [header, ...lines].join("\n");
}

export { PRICES, RECYCLERS };
