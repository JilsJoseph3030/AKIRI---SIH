"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  Cable,
  Check,
  Clock,
  Cpu,
  Download,
  Inbox,
  LayoutGrid,
  Magnet,
  Megaphone,
  MessageCircle,
  Monitor,
  Package,
  Recycle,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Tv,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

const CATEGORY_ICON: Record<string, LucideIcon> = {
  pcb: Cpu,
  battery: BatteryCharging,
  cable: Cable,
  crt: Tv,
  lcd_panel: Monitor,
  motor_magnet: Magnet,
  mixed_plastics: Recycle,
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

const TABS: { key: Filter; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "offered", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Sealed", icon: Check },
];

interface QuickAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  tint: "tint-bright" | "tint-deep" | "tint-amber" | "tint-green";
  href?: string;
  onClick?: () => void;
}

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

  const ACTIONS: QuickAction[] = [
    {
      label: "Confirm handover",
      hint: "Seal a collector lot",
      icon: Check,
      tint: "tint-bright",
      href: "#lots",
      onClick: () => setFilter("offered"),
    },
    {
      label: "Market rates",
      hint: "Indicative prices",
      icon: TrendingUp,
      tint: "tint-deep",
      href: "#market",
    },
    {
      label: "Export data",
      hint: "EPR-ready CSV",
      icon: Download,
      tint: "tint-amber",
      href: `${API}/export?format=csv`,
    },
    {
      label: "Ask Sahayak",
      hint: "Help in seconds",
      icon: MessageCircle,
      tint: "tint-green",
      onClick: () => window.dispatchEvent(new Event("akiri:open-assistant")),
    },
  ];

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
      <section className="hero">
        <Recycle size={220} className="hero-watermark" aria-hidden="true" />
        <header className="hero-head">
        <div className="brand-block">
          <span className="logo-badge" aria-hidden="true">
            <Recycle size={28} />
          </span>
          <div>
            <p className="eyebrow">Recycler console</p>
            <h1 className="brand">Akiri Recycler</h1>
            <p className="page-sub">MIDC Hingna, Nagpur · rc-nag-01</p>
          </div>
        </div>
        <div className="head-pills">
          <span className={live ? "pill pill-green" : "pill pill-amber"}>
            <span className="dot" aria-hidden="true" />
            {live ? "Live API" : "Demo data"}
          </span>
          <span className="pill pill-neutral">
            <ShieldCheck size={13} aria-hidden="true" /> Authorized
          </span>
        </div>
        </header>
        <div className="actions">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            const inner = (
              <>
                <span className={`action-icon ${a.tint}`} aria-hidden="true">
                  <Icon size={24} />
                </span>
                <span>
                  <span className="action-label">{a.label}</span>
                  <span className="action-hint">{a.hint}</span>
                </span>
              </>
            );
            return a.href ? (
              <a
                key={a.label}
                href={a.href}
                onClick={a.onClick}
                className="action"
              >
                {inner}
              </a>
            ) : (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="action"
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      {!live && (
        <div className="alert alert-amber" role="status">
          <span className="alert-illust" aria-hidden="true">
            <Megaphone size={20} />
          </span>
          <div className="alert-body">
            <strong>Showing demo data — collector API unreachable.</strong>
            <p>
              Start the backend, then retry. Expected at <code>{API}</code>.
            </p>
          </div>
          <button className="btn btn-primary btn-small" onClick={load}>
            <RefreshCw size={13} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      <section className="stats" aria-label="Lot summary">
        <div className="stat-card">
          <span className="stat-icon tint-green" aria-hidden="true">
            <Package size={22} />
          </span>
          <div>
            <div className="stat-num">{stats.total}</div>
            <div className="stat-cap">Incoming lots</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon tint-amber" aria-hidden="true">
            <Clock size={22} />
          </span>
          <div>
            <div className="stat-num" style={{ color: "var(--amber-strong)" }}>{stats.pending}</div>
            <div className="stat-cap">Awaiting confirmation</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon tint-deep" aria-hidden="true">
            <BadgeCheck size={22} />
          </span>
          <div>
            <div className="stat-num" style={{ color: "var(--accent-strong)" }}>{stats.confirmed}</div>
            <div className="stat-cap">Sealed handovers</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon tint-bright" aria-hidden="true">
            <Wallet size={22} />
          </span>
          <div>
            <div className="stat-num">₹{stats.value.toLocaleString("en-IN")}</div>
            <div className="stat-cap">Total lot value</div>
          </div>
        </div>
      </section>

      <section className="dashboard-visual-banner" aria-label="Visual verification and material guide">
        <div className="section-head" style={{ margin: "0 0 12px" }}>
          <div>
            <p className="eyebrow">Visual Field Guide</p>
            <h2 style={{ fontSize: "19px" }}>Ground Collection & Processing Ecosystem</h2>
          </div>
        </div>
        <div className="guide-grid">
          <div className="guide-card">
            <img src="/images/collector-informal.png" alt="Informal scrap collector sorting materials" />
            <div className="guide-card-info">
              <p className="guide-card-title">Informal Collector</p>
              <p className="guide-card-sub">Doorstep Kabadiwala batch</p>
            </div>
          </div>
          <div className="guide-card">
            <img src="/images/collector-formal.jpg" alt="Formal worker with green waste truck" />
            <div className="guide-card-info">
              <p className="guide-card-title">Safety Handover</p>
              <p className="guide-card-sub">Verified intake protocol</p>
            </div>
          </div>
          <div className="guide-card">
            <img src="/images/ewaste-items.jpg" alt="E-waste items" />
            <div className="guide-card-info">
              <p className="guide-card-title">E-Waste Stream</p>
              <p className="guide-card-sub">PCB, Cable, Battery, Screens</p>
            </div>
          </div>
          <div className="guide-card">
            <img src="/images/waste-bins.jpg" alt="Waste segregation bins" />
            <div className="guide-card-info">
              <p className="guide-card-title">Sorting Bins</p>
              <p className="guide-card-sub">Glass, Paper, Metal, Plastic</p>
            </div>
          </div>
          <div className="guide-card">
            <img src="/images/recycling-facility.jpg" alt="Recycling conveyor belt" />
            <div className="guide-card-info">
              <p className="guide-card-title">Recycling Plant</p>
              <p className="guide-card-sub">MIDC Hingna Recovery Line</p>
            </div>
          </div>
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
            <Download size={13} aria-hidden="true" /> CSV
          </a>
          <a className="btn btn-ghost btn-small" href={`${API}/export?format=json`}>
            <Download size={13} aria-hidden="true" /> JSON
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
            <t.icon size={14} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <section className="lot-list" id="lots" aria-label="Incoming lots">
        {visible.map((lot) => {
          const sealed = lot.status === "confirmed";
          const CatIcon = CATEGORY_ICON[lot.category] ?? Package;
          return (
            <article
              key={lot.id}
              className="lot-card"
              data-status={sealed ? "confirmed" : "offered"}
            >
              <div className="lot-top">
                <span className="lot-icon">
                  <CatIcon size={28} strokeWidth={1.8} aria-hidden="true" />
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
                  {sealed ? (
                    <Check size={12} aria-hidden="true" />
                  ) : (
                    <Clock size={12} aria-hidden="true" />
                  )}
                  {sealed ? "Sealed" : "Pending"}
                </span>
              </div>
              <div className="ref-well">
                <span className="micro-label">Ledger ref</span>
                <code className="ref-code">{lot.ledgerRef ?? "queued…"}</code>
              </div>
              {sealed ? (
                <p className="sealed-by">
                  <Check size={13} aria-hidden="true" />
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
                    {confirming === lot.id ? (
                      "Sealing…"
                    ) : (
                      <>
                        Confirm handover <ArrowRight size={16} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {visible.length === 0 && (
          <div className="empty-state">
            <span className="big" aria-hidden="true">
              <Inbox size={30} />
            </span>
            No {filter === "all" ? "" : filter + " "}lots right now.
          </div>
        )}
      </section>

      <AssistantWidget />
    </div>
  );
}
