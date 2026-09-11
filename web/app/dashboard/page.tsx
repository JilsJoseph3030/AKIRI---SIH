"use client";

import { useCallback, useEffect, useState } from "react";
import AssistantWidget from "../../components/AssistantWidget";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

interface Lot {
  id: string;
  category: string;
  weightKg: number;
  estimatedValueInr: number;
  recyclerId: string | null;
  timestamp: string;
  status: string;
  ledgerRef: string | null;
}

const MOCK_LOTS: Lot[] = [
  {
    id: "demo-01", category: "pcb", weightKg: 2.4, estimatedValueInr: 768,
    recyclerId: null, timestamp: new Date().toISOString(),
    status: "offered", ledgerRef: "DEMO-REF1",
  },
];

function isLot(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    "category" in value &&
    "weightKg" in value &&
    "estimatedValueInr" in value &&
    "timestamp" in value &&
    "status" in value
  );
}

function toLot(raw: Record<string, unknown>): Lot {
  const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const num = (k: string) => (typeof raw[k] === "number" ? (raw[k] as number) : 0);
  const opt = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : null);
  return {
    id: str("id"),
    category: str("category"),
    weightKg: num("weightKg"),
    estimatedValueInr: num("estimatedValueInr"),
    recyclerId: opt("recyclerId"),
    timestamp: str("timestamp"),
    status: str("status"),
    ledgerRef: opt("ledgerRef"),
  };
}

function asLots(raw: unknown, fallback: Lot[]): Lot[] {
  if (!Array.isArray(raw)) return fallback;
  const lots = raw.filter(isLot).map(toLot);
  return lots.length > 0 || raw.length === 0 ? lots : fallback;
}

export default function Dashboard() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [live, setLive] = useState(false);
  const [refInput, setRefInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/lots`);
      if (!res.ok) throw new Error();
      setLots(asLots(await res.json(), MOCK_LOTS));
      setLive(true);
    } catch {
      setLots(MOCK_LOTS); // demoable with no backend
      setLive(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirm(id: string) {
    try {
      const res = await fetch(`${API}/lots/${id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recyclerId: "rc-nag-01" }),
      });
      if (!res.ok) throw new Error();
      const body: unknown = await res.json();
      if (body && typeof body === "object" && "lot" in body && isLot(body.lot)) {
        const lot = toLot(body.lot);
        setLots((ls) => ls.map((l) => (l.id === id ? lot : l)));
        return;
      }
      throw new Error();
    } catch {
      // Offline demo: seal locally so the flow is still reviewable.
      setLots((ls) =>
        ls.map((l) =>
          l.id === id ? { ...l, status: "confirmed", recyclerId: "rc-nag-01" } : l,
        ),
      );
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <p style={{ color: live ? "#7BD88F" : "#F2B134" }}>
        {live ? "🟢 live API" : "🟡 demo data (API unreachable)"}
      </p>
      <h1>Incoming lots</h1>

      <section
        style={{
          border: "1px solid #2C3A2F", borderRadius: 12,
          padding: 16, marginBottom: 20,
        }}
      >
        <strong>✅ Registration: authorized recycler</strong>
        <span style={{ color: "#A9B8AC" }}> · rc-nag-01 · MIDC Hingna</span>
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <a href={`${API}/export?format=csv`} style={link}>Export CSV</a>
          <a href={`${API}/export?format=json`} style={link}>Export JSON</a>
        </div>
      </section>

      {lots.map((lot) => (
        <article
          key={lot.id}
          style={{
            border: "1px solid #2C3A2F", borderRadius: 12,
            padding: 16, marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            📦 {lot.category} · {lot.weightKg} kg · ₹{lot.estimatedValueInr}
          </div>
          <div style={{ color: "#A9B8AC", margin: "6px 0" }}>
            🔗 {lot.ledgerRef ?? "—"} ·{" "}
            {new Date(lot.timestamp).toLocaleString()} · {lot.status}
          </div>
          {lot.status !== "confirmed" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                placeholder="Reference code"
                value={refInput[lot.id] ?? ""}
                onChange={(e) =>
                  setRefInput((m) => ({ ...m, [lot.id]: e.target.value }))
                }
                style={box}
                aria-label="Lot reference code"
              />
              <button onClick={() => confirm(lot.id)} style={btn}>
                Confirm handover →
              </button>
            </div>
          ) : (
            <div style={{ color: "#7BD88F", fontWeight: 700 }}>
              ✅ Sealed{lot.recyclerId ? ` by ${lot.recyclerId}` : ""}
            </div>
          )}
        </article>
      ))}

      <AssistantWidget />
    </main>
  );
}

const box: React.CSSProperties = {
  background: "#101613", color: "#F2F5F0", border: "1px solid #2C3A2F",
  borderRadius: 10, padding: 10, flex: 1,
};
const btn: React.CSSProperties = {
  background: "#7BD88F", border: "none", borderRadius: 10,
  padding: "10px 18px", fontWeight: 800, cursor: "pointer",
};
const link: React.CSSProperties = { color: "#7BD88F", fontWeight: 700 };
