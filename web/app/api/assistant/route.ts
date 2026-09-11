import { NextResponse } from "next/server";
import {
  buildPrompt,
  fallbackReply,
  retrieve,
} from "@akiri/backend/domain";
import { loadKnowledge } from "../../../lib/knowledge";

const MODEL = "muse-spark-1.3-contributor-free";
const ENDPOINT = "https://opencode.ai/zen/v1/responses";

/**
 * FAQ assistant proxy. The API key never leaves the server. Flow:
 * keyword retrieval over docs/knowledge-base → scoped prompt → Zen
 * Responses API. Empty retrieval or missing key → grounded fallback,
 * never a hallucinated answer. No collector PII is accepted here.
 */
export async function POST(req: Request) {
  const body: unknown = await req.json();
  const question =
    body && typeof body === "object" && "question" in body && typeof body.question === "string"
      ? body.question
      : "";
  if (!question.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  const notes = retrieve(await loadKnowledge(), question);
  if (notes.length === 0) return NextResponse.json({ answer: fallbackReply(), grounded: false });

  const key = process.env.OPENCODE_ZEN_API_KEY;
  if (!key) {
    // Demo-safe: return the grounded notes directly, labelled.
    return NextResponse.json({
      answer: notes.map((n) => n.body).join("\n\n"),
      grounded: true,
      model: "grounded-notes (no key)",
    });
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: buildPrompt({ question, notes }),
      max_output_tokens: 500,
    }),
  });
  if (!res.ok) {
    return NextResponse.json({
      answer: notes.map((n) => n.body).join("\n\n"),
      grounded: true,
      model: "grounded-notes (zen unavailable)",
    });
  }
  const data: unknown = await res.json();
  const answer = extractText(data) ?? notes.map((n) => n.body).join("\n\n");
  return NextResponse.json({ answer, grounded: true, model: MODEL });
}

function extractText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if ("output_text" in data && typeof data.output_text === "string") {
    return data.output_text;
  }
  if (!("output" in data) || !Array.isArray(data.output)) return null;
  const texts: string[] = [];
  for (const item of data.output) {
    if (!item || typeof item !== "object" || !("content" in item)) continue;
    if (!Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        texts.push(part.text);
      }
    }
  }
  return texts.length > 0 ? texts.join("") : null;
}
