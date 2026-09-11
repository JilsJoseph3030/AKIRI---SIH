import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createHash } from "node:crypto";
import {
  MARKET_AS_OF,
  MARKET_SNAPSHOT,
  MATERIAL_CATEGORIES,
  confirmHandover,
  createEntry,
  estimateValue,
  rankRecyclers,
  verifyChain,
} from "./domain/index";
import type { MaterialCategory, Transaction } from "./domain/schemas";
import { chains, exportRows, lots, PRICES, RECYCLERS } from "./store";
import { voice } from "./voice/routes";

function isCategory(value: unknown): value is MaterialCategory {
  return (
    typeof value === "string" &&
    (MATERIAL_CATEGORIES as readonly string[]).includes(value)
  );
}

// Hono already parses the JSON body; assert the documented contract once
// per route, then validate each field before use.
interface LotIntake {
  id: unknown;
  collectorId: unknown;
  category: unknown;
  weightKg: unknown;
  photoHash?: unknown;
  gpsLat?: unknown;
  gpsLng?: unknown;
  location?: unknown;
}

interface ConfirmIntake {
  recyclerId: unknown;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const app = new Hono();

// The dashboard and phone app call the API cross-origin (different
// port/host, or a public tunnel like ngrok) — allow it. No cookies or
// credentials are used, so a wildcard origin is sufficient for this demo.
app.use("*", cors());
app.route("/", voice);


app.get("/health", (c) => c.json({ ok: true }));

app.get("/prices", (c) => {
  const location = c.req.query("location");
  return c.json(
    location ? PRICES.filter((p) => p.location === location) : PRICES,
  );
});

app.get("/recyclers", (c) => {
  const lat = Number(c.req.query("lat") ?? "21.15");
  const lng = Number(c.req.query("lng") ?? "79.09");
  const rawCategory = c.req.query("category") ?? "pcb";
  const category = isCategory(rawCategory) ? rawCategory : "pcb";
  return c.json(rankRecyclers(RECYCLERS, category, lat, lng));
});

/** Idempotent lot intake: same client UUID re-POSTed returns existing. */
app.post("/lots", async (c) => {
  const intake = (await c.req.json()) as LotIntake;
  if (typeof intake.id !== "string" || intake.id.length === 0) {
    return c.json({ error: "id required" }, 400);
  }
  if (!isCategory(intake.category)) {
    return c.json({ error: "unknown category" }, 400);
  }
  if (typeof intake.weightKg !== "number" || intake.weightKg <= 0) {
    return c.json({ error: "weightKg must be a positive number" }, 400);
  }
  if (typeof intake.collectorId !== "string" || intake.collectorId.length === 0) {
    return c.json({ error: "collectorId required" }, 400);
  }
  const existing = lots.get(intake.id);
  if (existing) return c.json(existing);
  const location =
    typeof intake.location === "string" && intake.location.length > 0
      ? intake.location
      : "Nagpur";
  const tx: Transaction = {
    id: intake.id,
    collectorId: intake.collectorId,
    recyclerId: null,
    category: intake.category,
    weightKg: intake.weightKg,
    estimatedValueInr: estimateValue(
      intake.category,
      intake.weightKg,
      PRICES,
      location,
    ),
    photoHash: typeof intake.photoHash === "string" ? intake.photoHash : null,
    gpsLat: typeof intake.gpsLat === "number" ? intake.gpsLat : null,
    gpsLng: typeof intake.gpsLng === "number" ? intake.gpsLng : null,
    timestamp: new Date().toISOString(),
    status: "offered",
    ledgerRef: null,
    synced: true,
  };
  lots.set(tx.id, tx);
  const entry = await createEntry(sha256, {
    photoHash: `photo:${tx.photoHash ?? "none"}`,
    weightKg: tx.weightKg,
    gpsLat: tx.gpsLat,
    gpsLng: tx.gpsLng,
    timestamp: tx.timestamp,
    collectorId: tx.collectorId,
    recyclerId: null,
    prevHash: "",
  });
  chains.set(tx.id, [entry]);
  tx.ledgerRef = entry.refCode;
  return c.json(tx, 201);
});

app.get("/lots", (c) => c.json([...lots.values()]));

/** One-tap confirm: seals the ledger chain + marks the lot confirmed. */
app.post("/lots/:id/confirm", async (c) => {
  const tx = lots.get(c.req.param("id"));
  if (!tx) return c.json({ error: "lot not found" }, 404);
  const intake = (await c.req.json()) as ConfirmIntake;
  if (typeof intake.recyclerId !== "string" || intake.recyclerId.length === 0) {
    return c.json({ error: "recyclerId required" }, 400);
  }
  const chain = chains.get(tx.id) ?? [];
  const sealed = await confirmHandover(
    sha256,
    chain,
    intake.recyclerId,
    new Date().toISOString(),
  );
  chain.push(sealed);
  tx.status = "confirmed";
  tx.recyclerId = intake.recyclerId;
  return c.json({ lot: tx, sealed, valid: await verifyChain(sha256, chain) });
});

app.get("/lots/:id/chain", async (c) => {
  const chain = chains.get(c.req.param("id"));
  if (!chain) return c.json({ error: "lot not found" }, 404);
  return c.json({ chain, valid: await verifyChain(sha256, chain) });
});

app.get("/export", (c) => {
  const format = c.req.query("format") === "csv" ? "csv" : "json";
  const body = exportRows(format);
  return new Response(body, {
    headers: {
      "content-type": format === "csv" ? "text/csv" : "application/json",
      "content-disposition": `attachment; filename="akiri-transactions.${format}"`,
    },
  });
});

app.get("/market", (c) =>
  c.json({ asOf: MARKET_AS_OF, rows: MARKET_SNAPSHOT }),
);

/**
 * Live refresh via Exa web research (recommended request shape: query +
 * highlights only). Needs EXA_API_KEY server-side; without it the board
 * keeps serving the researched snapshot above.
 */
app.post("/market/refresh", async (c) => {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    return c.json(
      { error: "EXA_API_KEY not configured; serving snapshot" },
      503,
    );
  }
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      query: "scrap copper aluminium e-waste PCB battery plastic rate per kg India",
      contents: { highlights: true },
    }),
  });
  if (!res.ok) return c.json({ error: `exa search failed: ${res.status}` }, 502);
  const data: unknown = await res.json();
  if (!data || typeof data !== "object" || !("results" in data)) {
    return c.json({ error: "unexpected exa response shape" }, 502);
  }
  return c.json({ asOf: new Date().toISOString().slice(0, 10), exa: data });
});

// Serve when run directly: tsx src/server.ts (npm run dev)
if (process.argv[1]?.endsWith("server.ts")) {
  serve({ fetch: app.fetch, port: 8080 }, (info) =>
    console.log(`Akiri API on http://localhost:${info.port}`),
  );
}
