import Link from "next/link";

export default function Landing() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 56, marginBottom: 8 }}>Akiri</h1>
      <p style={{ color: "#A9B8AC", fontSize: 19 }}>
        Kabadiwala Connect — bringing the informal collector into the
        formal recycling chain (SIH26229).
      </p>
      <Link
        href="/dashboard"
        style={{
          display: "inline-block",
          marginTop: 24,
          background: "#7BD88F",
          color: "#101613",
          fontWeight: 800,
          padding: "14px 28px",
          borderRadius: 12,
          textDecoration: "none",
        }}
      >
        Open recycler dashboard →
      </Link>
    </main>
  );
}
