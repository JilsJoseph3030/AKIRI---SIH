import Link from "next/link";
import { ArrowRight, BadgeCheck, Camera, FileDown, Recycle, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Camera,
    tint: "tint-green",
    title: "Snap & Lot",
    body: "Photograph scrap, classify materials with AI, weigh it, see payout instant offline-first.",
  },
  {
    icon: BadgeCheck,
    tint: "tint-deep",
    title: "Trust Ledger",
    body: "Every handover is cryptographically sealed with a verifiable hash chain both parties verify.",
  },
  {
    icon: FileDown,
    tint: "tint-bright",
    title: "EPR Compliance",
    body: "One-tap CPCB & EPR-ready CSV and JSON audit trails straight from the dashboard.",
  },
] as const;

const GALLERY = [
  {
    title: "Doorstep Informal Collection",
    category: "Step 1 · Ground Collector",
    desc: "Empowering 1.5M+ informal scrap collectors (Kabadiwalas) with digital lot generation and instant fair pricing.",
    img: "/images/collector-informal.png",
    alt: "Informal scrap collector sorting recyclable cardboard and materials on a street cart",
  },
  {
    title: "Handover Verification",
    category: "Step 2 · Formal Logistics",
    desc: "Safety-compliant handover sealed using unique Crockford Base32 cryptographic reference codes.",
    img: "/images/collector-formal.jpg",
    alt: "Formal waste collection worker with safety equipment and green recycling truck",
  },
  {
    title: "Solid Waste Management",
    category: "Step 3 · Circular Chain",
    desc: "Bringing informal collection channels into formal municipal and national recycling pipelines.",
    img: "/images/recycle-emblem.png",
    alt: "Green solid waste management and recycling emblem",
  },
  {
    title: "Smart E-Waste Categorization",
    category: "Material Classification",
    desc: "AI classification for PCBs, batteries, copper cables, screens, and consumer electronic waste.",
    img: "/images/ewaste-items.jpg",
    alt: "E-waste electronics including phones, chargers, smartwatches and circuit boards",
  },
  {
    title: "Industrial Material Recovery",
    category: "Step 4 · Processing Plant",
    desc: "Registered recycling plants process incoming batches into high-purity recycled secondary raw materials.",
    img: "/images/recycling-facility.jpg",
    alt: "Industrial recycling facility conveyor belt sorting line",
  },
  {
    title: "Multi-Stream Segregation Bins",
    category: "Standardized Sorting",
    desc: "Structured sorting guidelines for Glass, Paper, Metals, and Hazardous Electronic Plastics.",
    img: "/images/waste-bins.jpg",
    alt: "Color coded waste segregation recycling bins for glass, paper, metal, and plastic",
  },
] as const;

export default function Landing() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Primary">
        <span className="landing-brand">
          <span className="logo-badge logo-badge-sm" aria-hidden="true">
            <Recycle size={22} />
          </span>
          Akiri
        </span>
        <div className="nav-actions">
          <Link href="/dashboard" className="btn btn-primary btn-small">
            Open Recycler Dashboard <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </nav>

      {/* Responsive Hero Section */}
      <section className="hero hero-large">
        <Recycle size={320} className="hero-watermark" aria-hidden="true" />
        <div className="hero-grid">
          <div className="hero-content">
            <p className="eyebrow">SIH26229 · Kabadiwala Connect</p>
            <h1 className="hero-title">The informal collector, on the formal chain.</h1>
            <p className="hero-sub">
              Akiri brings informal e-waste and scrap collectors into verified recycling —
              snap a lot, seal the handover on a cryptographic trust ledger, export EPR-ready compliance records.
            </p>
            <div className="hero-ctas">
              <Link href="/dashboard" className="btn btn-primary">
                Open Recycler Dashboard <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#ecosystem" className="btn btn-outline-light">
                Explore Value Chain
              </a>
            </div>
          </div>
          <div className="hero-image-wrap">
            <div className="hero-photo-card">
              <img
                src="/images/collector-informal.png"
                alt="Informal scrap collector in India sorting recyclables"
                className="hero-img"
              />
              <div className="hero-photo-badge">
                <ShieldCheck size={16} className="badge-icon" />
                <span>Verified Collector Channel · Nagpur Pilot</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="how" className="landing-feats" aria-label="How Akiri works">
        {FEATURES.map((f) => (
          <div key={f.title} className="feat">
            <span className={`stat-icon ${f.tint}`} aria-hidden="true">
              <f.icon size={22} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      {/* Ecosystem Visual Gallery */}
      <section id="ecosystem" className="ecosystem-section" aria-label="Ecosystem value chain gallery">
        <div className="section-head">
          <div>
            <p className="eyebrow">End-to-End Traceability</p>
            <h2>Formalized E-Waste & Scrap Recycling Chain</h2>
            <p className="count">Integrating ground-level collection with state EPR compliance</p>
          </div>
        </div>

        <div className="gallery-grid">
          {GALLERY.map((item) => (
            <article key={item.title} className="image-card">
              <div className="image-card-img-wrap">
                <img src={item.img} alt={item.alt} loading="lazy" />
                <span className="image-card-tag">{item.category}</span>
              </div>
              <div className="image-card-body">
                <h3 className="image-card-title">{item.title}</h3>
                <p className="image-card-desc">{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-foot">
        <p>Team Nexus · Expo Collector App + Hono API + Next.js Recycler Dashboard</p>
      </footer>
    </main>
  );
}
