"use client";

import { useState } from "react";

interface Msg {
  role: "user" | "assistant";
  text: string;
  failed?: boolean;
}

const SUGGESTIONS = [
  "How do I confirm a handover?",
  "What is EPR?",
  "How is scrap priced?",
];

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
        { role: "assistant", text: "Request failed — check your connection and try again.", failed: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fab"
        aria-label="Open Akiri assistant"
      >
        💬
      </button>
    );
  }

  return (
    <div className="chat" role="dialog" aria-label="Akiri Sahayak assistant">
      <div className="chat-head">
        <span className="chat-title">
          <span className="chat-status" aria-hidden="true" />
          Akiri Sahayak
        </span>
        <span className="chat-actions">
          <button
            onClick={() => setAbout((v) => !v)}
            className="chat-mini"
            aria-label="About this assistant"
            aria-expanded={about}
          >
            ⓘ
          </button>
          <button
            onClick={() => setOpen(false)}
            className="chat-mini"
            aria-label="Close assistant"
          >
            ✕
          </button>
        </span>
      </div>
      {about && (
        <p className="chat-about">
          Answers come from Akiri help notes via Muse Spark 1.3
          (Contributor free tier on OpenCode Zen). Free-tier prompts may
          be used to train future Meta models — never share collector
          personal details or financial information here.
        </p>
      )}
      <div className="chat-thread" aria-live="polite">
        {log.length === 0 ? (
          <div className="chat-empty">
            <span className="big" aria-hidden="true">🌱</span>
            <strong>Namaste! I’m Sahayak.</strong>
            Ask about handovers, pricing, or EPR — or try one below.
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          log.map((m, i) => (
            <p
              key={i}
              className={
                m.role === "user"
                  ? "msg msg-user"
                  : m.failed
                    ? "msg msg-error"
                    : "msg msg-assistant"
              }
            >
              {m.text}
            </p>
          ))
        )}
        {busy && <p className="msg msg-assistant">Thinking…</p>}
      </div>
      <div className="chat-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask about handovers, pricing, EPR…"
          className="input"
          aria-label="Ask the assistant"
        />
        <button
          onClick={ask}
          className="chat-send"
          disabled={busy || !input.trim()}
          aria-label="Send question"
        >
          ↑<span aria-hidden="true">Send</span>
        </button>
      </div>
    </div>
  );
}
