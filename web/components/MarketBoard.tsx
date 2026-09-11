"use client";

import { useEffect, useState } from "react";
import {
  MARKET_AS_OF,
  MARKET_SNAPSHOT,
} from "@akiri/backend/domain";
import type { MarketRow } from "@akiri/backend/domain";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const ICON: Record<string, string> = {
  pcb: "🖥️",
  cable: "🔌",
  battery: "🔋",
  motor_magnet: "🧲",
  mixed_plastics: "♳",
  lcd_panel: "🖵",
  crt: "📺",
};

function Spark({ data, up }: { data: number[]; up: boolean }) {
  const w = 96;
  const h = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(" ");
  const color = up ? "#7BD88F" : "#E4572E";
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function isMarketPayload(value: unknown): value is { rows: MarketRow[]; asOf: string } {
  return (
    !!value &&
    typeof value === "object" &&
    "rows" in value &&
    Array.isArray(value.rows) &&
    "asOf" in value &&
    typeof value.asOf === "string"
  );
}

export default function MarketBoard() {
  const [rows, setRows] = useState<MarketRow[]>(MARKET_SNAPSHOT);
  const [asOf, setAsOf] = useState(MARKET_AS_OF);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/market`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((raw: unknown) => {
        if (isMarketPayload(raw) && raw.rows.length > 0) {
          setRows(raw.rows);
          setAsOf(raw.asOf);
        }
      })
      .catch(() => {});
  }, []);

  async function refresh() {
    setNote(null);
    try {
      const res = await fetch(`${API}/market/refresh`, { method: "POST" });
      const body: unknown = await res.json();
      if (!res.ok) {
        setNote(
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "Refresh unavailable — showing researched snapshot.",
        );
        return;
      }
      setNote("Live Exa research returned — snapshot update is curator-reviewed before publishing.");
    } catch {
      setNote("API unreachable — showing researched snapshot.");
    }
  }

  const sorted = [...rows].sort((a, b) => b.spotInrPerKg - a.spotInrPerKg);

  return (
    <section style={wrap} aria-label="Market price board">
      <div style={head}>
        <div>
          <h2 style={title}>📈 Market board</h2>
          <div style={sub}>
            Indicative ₹/kg · as of {asOf} · 7-day drift is illustrative, not exchange data
          </div>
        </div>
        <button onClick={refresh} style={refreshBtn}>↻ Refresh via Exa</button>
      </div>
      {note && <div style={noteStyle}>{note}</div>}
      <div style={table}>
        <div style={{ ...rowStyle, ...headRow }}>
          <span>Material</span>
          <span style={num}>Spot ₹/kg</span>
          <span style={num}>24h</span>
          <span style={trendHead}>7-day trend</span>
        </div>
        {sorted.map((r) => {
          const up = r.changePct24h >= 0;
          return (
            <div key={r.category} style={rowStyle} title={r.source}>
              <span style={mat}>
                <span style={icon}>{ICON[r.category] ?? "📦"}</span>
                <span>
                  <div style={label}>{r.label}</div>
                  <div style={src}>
                    {r.confidence === "sourced" ? "● sourced" : "○ indicative"}
                  </div>
                </span>
              </span>
              <span style={spot}>₹{r.spotInrPerKg.toLocaleString("en-IN")}</span>
              <span style={up ? upPill : downPill}>
                {up ? "▲" : "▼"} {Math.abs(r.changePct24h).toFixed(1)}%
              </span>
              <span style={trendHead}>
                <Spark data={r.history7d} up={up} />
              </span>
            </div>
          );
        })}
      </div>
      <div style={foot}>
        Sources: scraprates.in · scrap.trade · metalemart.in · metalscost.com · wastewisetech.com (Sep 2026).
        Collector payout rates on the app price board differ — those are fixed first-buyer rates.
      </div>
    </section>
  );
}

const wrap: React.CSSProperties = {
  background: "#1B241E", border: "1px solid #2C3A2F",
  borderRadius: 16, padding: 20, marginBottom: 20,
};
const head: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  gap: 12, flexWrap: "wrap", marginBottom: 12,
};
const title: React.CSSProperties = { margin: 0, fontSize: 22 };
const sub: React.CSSProperties = { color: "#A9B8AC", fontSize: 13, marginTop: 2 };
const refreshBtn: React.CSSProperties = {
  background: "#101613", color: "#7BD88F", border: "1px solid #2C3A2F",
  borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const noteStyle: React.CSSProperties = {
  background: "#101613", borderRadius: 10, padding: "10px 12px",
  fontSize: 13, color: "#F2B134", marginBottom: 12,
};
const table: React.CSSProperties = { display: "flex", flexDirection: "column" };
const rowStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.6fr 0.7fr",
  gap: 8, alignItems: "center", padding: "10px 4px",
  borderTop: "1px solid #2C3A2F",
};
const headRow: React.CSSProperties = {
  borderTop: "none", color: "#A9B8AC", fontSize: 12,
  textTransform: "uppercase", letterSpacing: 1,
};
const num: React.CSSProperties = { textAlign: "right" };
const trendHead: React.CSSProperties = { textAlign: "right", display: "flex", justifyContent: "flex-end" };
const mat: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center" };
const icon: React.CSSProperties = { fontSize: 24 };
const label: React.CSSProperties = { fontWeight: 700, fontSize: 15 };
const src: React.CSSProperties = { color: "#A9B8AC", fontSize: 12 };
const spot: React.CSSProperties = { textAlign: "right", fontWeight: 800, fontSize: 17 };
const change: React.CSSProperties = {
  textAlign: "right", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap",
};
const upPill: React.CSSProperties = { ...change, color: "#7BD88F" };
const downPill: React.CSSProperties = { ...change, color: "#E4572E" };
const foot: React.CSSProperties = { color: "#A9B8AC", fontSize: 12, marginTop: 12 };
