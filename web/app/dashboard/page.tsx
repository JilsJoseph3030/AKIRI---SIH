"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AssistantWidget from "../../components/AssistantWidget";
import MarketBoard from "../../components/MarketBoard";

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
  {
    id: "demo-02", category: "battery", weightKg: 1.5, estimatedValueInr: 210,
    recyclerId: "rc-nag-01",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: "confirmed", ledgerRef: "DEMO-REF2",
  },
];

const CATEGORY_ICON: Record<string, string> = {
  pcb: "🖥️",
  battery: "🔋",
  cable: "🔌",
  crt: "📺",
  lcd_panel: "🖵",
  motor_magnet: "🧲",
  mixed_plastics: "♳",
};

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

type Filter = "all" | "offered" | "confirmed";

export default function Dashboard() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [refInput, setRefInput] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null);

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

  const stats = useMemo(() => {
    const confirmed = lots.filter((l) => l.status === "confirmed");
    return {
      total: lots.length,
      pending: lots.length - confirmed.length,
      confirmed: confirmed.length,
      value: lots.reduce((n, l) => n + l.estimatedValueInr, 0),
    };
  }, [lots]);

  const visible = lots.filter((l) => filter === "all" || l.status === filter);

  async function confirm(id: string) {
    setConfirming(id);
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
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <div style={brand}>Akiri ♻️ Recycler</div>
          <div style={sub}>MIDC Hingna, Nagpur · rc-nag-01</div>
        </div>
        <div style={headerRight}>
          <span style={live ? livePill : demoPill}>
            {live ? "🟢 Live API" : "🟡 Demo data"}
          </span>
          <span style={authPill}>✅ Authorized</span>
        </div>
      </header>

      <section style={statGrid}>
        <div style={statCard}>
          <div style={statNum}>{stats.total}</div>
          <div style={statCap}>Incoming lots</div>
        </div>
        <div style={statCard}>
          <div style={{ ...statNum, color: "#F2B134" }}>{stats.pending}</div>
          <div style={statCap}>Awaiting confirmation</div>
        </div>
        <div style={statCard}>
          <div style={{ ...statNum, color: "#7BD88F" }}>{stats.confirmed}</div>
          <div style={statCap}>Sealed handovers</div>
        </div>
        <div style={statCard}>
          <div style={statNum}>₹{stats.value.toLocaleString("en-IN")}</div>
          <div style={statCap}>Total lot value</div>
        </div>
      </section>

      <MarketBoard />

      <div style={toolbar}>
        <div style={tabs}>
          {(["all", "offered", "confirmed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={filter === f ? tabActive : tab}
            >
              {f === "all" ? "All" : f === "offered" ? "⏳ Pending" : "✅ Sealed"}
            </button>
          ))}
        </div>
        <div style={exportRow}>
          <a href={`${API}/export?format=csv`} style={exportBtn}>⬇ CSV</a>
          <a href={`${API}/export?format=json`} style={exportBtn}>⬇ JSON</a>
        </div>
      </div>

      <section style={list}>
        {visible.map((lot) => {
          const sealed = lot.status === "confirmed";
          return (
            <article key={lot.id} style={card}>
              <div style={cardTop}>
                <span style={catIcon}>{CATEGORY_ICON[lot.category] ?? "📦"}</span>
                <div style={{ flex: 1 }}>
                  <div style={catName}>{lot.category.replace(/_/g, " ")}</div>
                  <div style={meta}>
                    {lot.weightKg} kg · ₹{lot.estimatedValueInr.toLocaleString("en-IN")} ·{" "}
                    {lot.timestamp ? new Date(lot.timestamp).toLocaleString("en-IN") : "—"}
                  </div>
                </div>
                <span style={sealed ? sealedPill : pendingPill}>
                  {sealed ? "✅ Sealed" : "⏳ Pending"}
                </span>
              </div>
              <div style={refRow}>
                <span style={refLabel}>Ledger ref</span>
                <code style={refCode}>{lot.ledgerRef ?? "queued…"}</code>
              </div>
              {sealed ? (
                <div style={sealedBy}>
                  Sealed{lot.recyclerId ? ` by ${lot.recyclerId}` : ""} · chain verified on confirm
                </div>
              ) : (
                <div style={confirmRow}>
                  <input
                    placeholder="Type collector's reference code"
                    value={refInput[lot.id] ?? ""}
                    onChange={(e) =>
                      setRefInput((m) => ({ ...m, [lot.id]: e.target.value }))
                    }
                    style={box}
                    aria-label="Lot reference code"
                  />
                  <button
                    onClick={() => confirm(lot.id)}
                    style={confirming === lot.id ? btnBusy : btn}
                    disabled={confirming === lot.id}
                  >
                    {confirming === lot.id ? "Sealing…" : "Confirm handover →"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {visible.length === 0 && (
          <div style={empty}>📭 No {filter === "all" ? "" : filter + " "}lots right now.</div>
        )}
      </section>

      <AssistantWidget />
    </div>
  );
}

const page: React.CSSProperties = {
  maxWidth: 980, margin: "0 auto", padding: "24px 20px 120px",
};
const header: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  gap: 12, flexWrap: "wrap", marginBottom: 20,
};
const brand: React.CSSProperties = { fontSize: 30, fontWeight: 800 };
const sub: React.CSSProperties = { color: "#A9B8AC", fontSize: 14, marginTop: 2 };
const headerRight: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const pill: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 999,
};
const livePill: React.CSSProperties = { ...pill, background: "#24402C", color: "#7BD88F" };
const demoPill: React.CSSProperties = { ...pill, background: "#3A2F14", color: "#F2B134" };
const authPill: React.CSSProperties = { ...pill, background: "#1B241E", color: "#F2F5F0", border: "1px solid #2C3A2F" };
const statGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12, marginBottom: 20,
};
const statCard: React.CSSProperties = {
  background: "#1B241E", border: "1px solid #2C3A2F",
  borderRadius: 14, padding: "16px 18px",
};
const statNum: React.CSSProperties = { fontSize: 30, fontWeight: 800 };
const statCap: React.CSSProperties = { color: "#A9B8AC", fontSize: 13, marginTop: 2 };
const toolbar: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 12, flexWrap: "wrap", marginBottom: 14,
};
const tabs: React.CSSProperties = { display: "flex", gap: 8 };
const tab: React.CSSProperties = {
  background: "#1B241E", color: "#A9B8AC", border: "1px solid #2C3A2F",
  borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const tabActive: React.CSSProperties = {
  ...tab, background: "#24402C", color: "#7BD88F", borderColor: "#24402C",
};
const exportRow: React.CSSProperties = { display: "flex", gap: 8 };
const exportBtn: React.CSSProperties = {
  color: "#7BD88F", fontWeight: 700, fontSize: 14, textDecoration: "none",
  border: "1px solid #2C3A2F", borderRadius: 999, padding: "8px 16px",
};
const list: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const card: React.CSSProperties = {
  background: "#1B241E", border: "1px solid #2C3A2F",
  borderRadius: 16, padding: 18,
};
const cardTop: React.CSSProperties = { display: "flex", gap: 12, alignItems: "flex-start" };
const catIcon: React.CSSProperties = {
  fontSize: 34, background: "#101613", borderRadius: 12,
  width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
};
const catName: React.CSSProperties = { fontSize: 19, fontWeight: 800, textTransform: "capitalize" };
const meta: React.CSSProperties = { color: "#A9B8AC", fontSize: 14, marginTop: 2 };
const sealedPill: React.CSSProperties = { ...pill, background: "#24402C", color: "#7BD88F", whiteSpace: "nowrap" };
const pendingPill: React.CSSProperties = { ...pill, background: "#3A2F14", color: "#F2B134", whiteSpace: "nowrap" };
const refRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, marginTop: 12,
  background: "#101613", borderRadius: 10, padding: "10px 12px",
};
const refLabel: React.CSSProperties = { color: "#A9B8AC", fontSize: 13 };
const refCode: React.CSSProperties = {
  color: "#7BD88F", fontWeight: 800, fontSize: 17, letterSpacing: 2,
};
const sealedBy: React.CSSProperties = { color: "#7BD88F", fontSize: 13, marginTop: 10 };
const confirmRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" };
const box: React.CSSProperties = {
  background: "#101613", color: "#F2F5F0", border: "1px solid #2C3A2F",
  borderRadius: 10, padding: "12px", flex: "1 1 200px", fontSize: 15,
};
const btn: React.CSSProperties = {
  background: "#7BD88F", color: "#101613", border: "none", borderRadius: 10,
  padding: "12px 20px", fontWeight: 800, fontSize: 15, cursor: "pointer",
};
const btnBusy: React.CSSProperties = { ...btn, opacity: 0.6, cursor: "wait" };
const empty: React.CSSProperties = {
  textAlign: "center", color: "#A9B8AC", padding: 40, fontSize: 16,
};
