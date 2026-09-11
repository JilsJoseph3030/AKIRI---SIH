"use client";

import { useState } from "react";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setLog((l) => [...l, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as { answer?: string };
      setLog((l) => [...l, { role: "assistant", text: data.answer ?? "…" }]);
    } catch {
      setLog((l) => [
        ...l,
        { role: "assistant", text: "Request failed — try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={fab}
        aria-label="Open Akiri assistant"
      >
        💬
      </button>
    );
  }

  return (
    <div style={panel}>
      <div style={head}>
        <strong>Akiri Sahayak</strong>
        <span>
          <button onClick={() => setAbout((v) => !v)} style={mini} aria-label="About">
            ⓘ
          </button>{" "}
          <button onClick={() => setOpen(false)} style={mini} aria-label="Close">
            ✕
          </button>
        </span>
      </div>
      {about && (
        <p style={aboutStyle}>
          Answers come from Akiri help notes via Muse Spark 1.3
          (Contributor free tier on OpenCode Zen). Free-tier prompts may
          be used to train future Meta models — never share collector
          personal details or financial information here.
        </p>
      )}
      <div style={thread}>
        {log.map((m, i) => (
          <p key={i} style={m.role === "user" ? mine : theirs}>
            {m.text}
          </p>
        ))}
      </div>
      <div style={row}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask about handovers, pricing, EPR…"
          style={box}
          aria-label="Ask the assistant"
        />
        <button onClick={ask} style={send} disabled={busy}>
          ↑
        </button>
      </div>
    </div>
  );
}

const fab: React.CSSProperties = {
  position: "fixed", right: 20, bottom: 20, width: 56, height: 56,
  borderRadius: 999, border: "none", fontSize: 26, cursor: "pointer",
  background: "#7BD88F",
};
const panel: React.CSSProperties = {
  position: "fixed", right: 20, bottom: 20, width: 340, maxHeight: 480,
  display: "flex", flexDirection: "column", background: "#1B241E",
  borderRadius: 14, overflow: "hidden", border: "1px solid #2C3A2F",
};
const head: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "10px 14px", background: "#24402C",
};
const mini: React.CSSProperties = {
  background: "none", border: "none", color: "#F2F5F0",
  fontSize: 16, cursor: "pointer",
};
const aboutStyle: React.CSSProperties = {
  fontSize: 12, color: "#A9B8AC", padding: "8px 14px", margin: 0,
};
const thread: React.CSSProperties = {
  flex: 1, overflowY: "auto", padding: 12, display: "flex",
  flexDirection: "column", gap: 8, minHeight: 200,
};
const mine: React.CSSProperties = {
  alignSelf: "flex-end", background: "#24402C", padding: "8px 12px",
  borderRadius: 12, margin: 0, maxWidth: "85%",
};
const theirs: React.CSSProperties = {
  alignSelf: "flex-start", background: "#101613", padding: "8px 12px",
  borderRadius: 12, margin: 0, maxWidth: "85%",
};
const row: React.CSSProperties = { display: "flex", gap: 8, padding: 10 };
const box: React.CSSProperties = {
  flex: 1, background: "#101613", color: "#F2F5F0",
  border: "1px solid #2C3A2F", borderRadius: 10, padding: 10,
};
const send: React.CSSProperties = {
  background: "#7BD88F", border: "none", borderRadius: 10,
  width: 42, fontSize: 18, cursor: "pointer",
};
