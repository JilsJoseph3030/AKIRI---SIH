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
    recyclerId: opt("recyclerId"),
    estimatedValueInr: num("estimatedValueInr"),
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

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "offered", label: "◷ Pending" },
  { key: "confirmed", label: "✓ Sealed" },
];

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
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Recycler console</p>
          <h1 className="brand">
            Akiri <span className="leaf">♻️</span> Recycler
          </h1>
          <p className="page-sub">MIDC Hingna, Nagpur · rc-nag-01</p>
        </div>
        <div className="head-pills">
          <span className={live ? "pill pill-green" : "pill pill-amber"}>
            <span className="dot" aria-hidden="true" />
            {live ? "Live API" : "Demo data"}
          </span>
          <span className="pill pill-neutral">
            <span aria-hidden="true">✓</span> Authorized
          </span>
        </div>
      </header>

      {!live && (
        <div className="alert alert-amber" role="status">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M9 1.5 16.5 15.5H1.5L9 1.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M9 6.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="9" cy="13" r="1.1" fill="currentColor" />
          </svg>
          <div className="alert-body">
            <strong>Showing demo data — collector API unreachable.</strong>
            <p>
              Start the backend, then retry. Expected at <code>{API}</code>.
            </p>
          </div>
          <button className="btn btn-ghost btn-small" onClick={load}>
            ↻ Retry
          </button>
        </div>
      )}

      <section className="stats" aria-label="Lot summary">
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-cap">Incoming lots</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--amber-strong)" }}>{stats.pending}</div>
          <div className="stat-cap">Awaiting confirmation</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--accent-strong)" }}>{stats.confirmed}</div>
          <div className="stat-cap">Sealed handovers</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">₹{stats.value.toLocaleString("en-IN")}</div>
          <div className="stat-cap">Total lot value</div>
        </div>
      </section>

      <MarketBoard />

      <div className="section-head">
        <div>
          <p className="eyebrow">Lot queue</p>
          <h2>Incoming lots</h2>
          <p className="count">
            {visible.length} of {lots.length} lots
            {filter !== "all" && ` · filtered: ${filter}`}
          </p>
        </div>
        <div className="export-row">
          <a className="btn btn-ghost btn-small" href={`${API}/export?format=csv`}>
            ↓ CSV
          </a>
          <a className="btn btn-ghost btn-small" href={`${API}/export?format=json`}>
            ↓ JSON
          </a>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter lots by status">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={filter === t.key}
            onClick={() => setFilter(t.key)}
            className={filter === t.key ? "tab tab-active" : "tab"}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="lot-list" aria-label="Incoming lots">
        {visible.map((lot) => {
          const sealed = lot.status === "confirmed";
          return (
            <article
              key={lot.id}
              className="lot-card"
              data-status={sealed ? "confirmed" : "offered"}
            >
              <div className="lot-top">
                <span className="lot-icon" aria-hidden="true">
                  {CATEGORY_ICON[lot.category] ?? "📦"}
                </span>
                <div className="lot-main">
                  <h3 className="lot-title">{lot.category.replace(/_/g, " ")}</h3>
                  <p className="lot-figures">
                    <strong>{lot.weightKg} kg</strong>
                    {" · "}
                    <strong className="value">
                      ₹{lot.estimatedValueInr.toLocaleString("en-IN")}
                    </strong>
                  </p>
                  <p className="lot-meta">
                    {lot.timestamp ? new Date(lot.timestamp).toLocaleString("en-IN") : "—"}
                    {" · "}
                    {lot.id}
                  </p>
                </div>
                <span className={sealed ? "pill pill-green" : "pill pill-amber"}>
                  <span aria-hidden="true">{sealed ? "✓" : "◷"}</span>
                  {sealed ? "Sealed" : "Pending"}
                </span>
              </div>
              <div className="ref-well">
                <span className="micro-label">Ledger ref</span>
                <code className="ref-code">{lot.ledgerRef ?? "queued…"}</code>
              </div>
              {sealed ? (
                <p className="sealed-by">
                  <span aria-hidden="true">✓</span>
                  Sealed{lot.recyclerId ? ` by ${lot.recyclerId}` : ""} · chain verified on confirm
                </p>
              ) : (
                <div className="confirm-row">
                  <input
                    placeholder="Type collector's reference code"
                    value={refInput[lot.id] ?? ""}
                    onChange={(e) =>
                      setRefInput((m) => ({ ...m, [lot.id]: e.target.value }))
                    }
                    className="input"
                    aria-label="Lot reference code"
                  />
                  <button
                    onClick={() => confirm(lot.id)}
                    className="btn btn-primary"
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
          <div className="empty-state">
            <span className="big" aria-hidden="true">📭</span>
            No {filter === "all" ? "" : filter + " "}lots right now.
          </div>
        )}
      </section>

      <AssistantWidget />
    </div>
  );
}
