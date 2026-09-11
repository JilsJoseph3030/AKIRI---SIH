"use client";

import { useEffect, useState } from "react";
import {
  BatteryCharging,
  Cable,
  Cpu,
  Info,
  Magnet,
  Monitor,
  Package,
  Recycle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Tv,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MARKET_AS_OF,
  MARKET_SNAPSHOT,
} from "@akiri/backend/domain";
import type { MarketRow } from "@akiri/backend/domain";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const ICON: Record<string, LucideIcon> = {
  pcb: Cpu,
  cable: Cable,
  battery: BatteryCharging,
  motor_magnet: Magnet,
  mixed_plastics: Recycle,
  lcd_panel: Monitor,
  crt: Tv,
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
  const color = up ? "var(--accent-strong)" : "var(--red-strong)";
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
    <section className="market" aria-label="Market price board">
      <div className="market-head">
        <div>
          <p className="eyebrow">Indicative rates</p>
          <h2 className="market-title">
            <TrendingUp size={20} aria-hidden="true" /> Market board
          </h2>
          <div className="market-sub">
            Indicative ₹/kg · as of {asOf} · 7-day drift is illustrative, not exchange data
          </div>
        </div>
        <button onClick={refresh} className="btn btn-primary btn-small">
          <RefreshCw size={14} aria-hidden="true" /> Refresh via Exa
        </button>
      </div>
      {note && (
        <div className="market-note" role="status">
          <Info size={14} aria-hidden="true" />
          <span>{note}</span>
        </div>
      )}
      <div className="market-table" role="table" aria-label="Material spot prices">
        <div className="market-row market-row-head" role="row">
          <span role="columnheader">Material</span>
          <span className="market-num" role="columnheader">Spot ₹/kg</span>
          <span className="market-num" role="columnheader">24h</span>
          <span className="market-trend" role="columnheader">7-day trend</span>
        </div>
        {sorted.map((r) => {
          const up = r.changePct24h >= 0;
          const MatIcon = ICON[r.category] ?? Package;
          return (
            <div key={r.category} className="market-row" role="row" title={r.source}>
              <span className="market-mat" role="cell">
                <span className="market-icon">
                  <MatIcon size={24} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>
                  <div className="market-label">{r.label}</div>
                  <div className="market-src">
                    {r.confidence === "sourced" ? (
                      <>
                        <span className="dot" aria-hidden="true" />
                        <span className="sourced">sourced</span>
                      </>
                    ) : (
                      <>
                        <span className="dot dot-hollow" aria-hidden="true" />
                        <span>indicative</span>
                      </>
                    )}
                  </div>
                </span>
              </span>
              <span className="market-spot" role="cell">₹{r.spotInrPerKg.toLocaleString("en-IN")}</span>
              <span className={up ? "market-change up" : "market-change down"} role="cell">
                {up ? (
                  <TrendingUp size={13} aria-hidden="true" />
                ) : (
                  <TrendingDown size={13} aria-hidden="true" />
                )}
                {Math.abs(r.changePct24h).toFixed(1)}%
              </span>
              <span className="market-trend" role="cell">
                <Spark data={r.history7d} up={up} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="market-foot">
        Sources: scraprates.in · scrap.trade · metalemart.in · metalscost.com · wastewisetech.com (Sep 2026).
        Collector payout rates on the app price board differ — those are fixed first-buyer rates.
      </div>
    </section>
  );
}
