// Retrieval-grounded FAQ scope gate for the recycler assistant.
// "Training" = grounding: keyword retrieval over docs/knowledge-base +
// a scoped system prompt. No weight updates anywhere in this pipeline.

export interface KnowledgeChunk {
  id: string;
  title: string;
  body: string;
}

const STOP: Record<string, true> = {
  the: true, a: true, an: true, is: true, are: true, was: true, were: true,
  be: true, to: true, of: true, and: true, or: true, in: true, on: true,
  for: true, with: true, how: true, what: true, why: true, when: true,
  do: true, does: true, can: true, i: true, my: true, me: true, it: true,
  this: true, that: true, by: true, at: true, from: true, about: true,
  please: true, tell: true, explain: true, give: true,
  kya: true, hai: true, ka: true, ki: true, ke: true, mein: true,
  ahe: true, kay: true, mala: true,
};
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u097F]+/u)
    .filter((t) => t.length > 2 && !STOP[t]);
}

/** Score chunks by token overlap; top-N above a floor, else []. */
export function retrieve(
  chunks: KnowledgeChunk[],
  question: string,
  topN = 3,
): KnowledgeChunk[] {
  const q = new Set(tokens(question));
  if (q.size === 0) return [];
  return chunks
    .map((c) => {
      const body = new Set(tokens(`${c.title} ${c.body}`));
      let overlap = 0;
      for (const t of q) if (body.has(t)) overlap++;
      return { c, score: overlap / Math.sqrt(q.size) };
    })
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((r) => r.c);
}

export const ASSISTANT_SYSTEM_PROMPT = `You are Akiri Sahayak, the support assistant for the Akiri recycler dashboard (SIH26229 Kabadiwala Connect). Answer ONLY from the grounded notes provided with each request: how Akiri works, EPR/e-waste basics, confirming a handover, pricing, troubleshooting. If the notes do not cover the question, say so and point to the human contact channel. Never invent EPR compliance details, never ask for or repeat collector PII or transaction financials. Keep answers short; the user may be on a phone.`;

export interface GroundedRequest {
  question: string;
  notes: KnowledgeChunk[];
}

export function buildPrompt(req: GroundedRequest): string {
  const context = req.notes
    .map((n) => `### ${n.title}\n${n.body}`)
    .join("\n\n");
  return `${ASSISTANT_SYSTEM_PROMPT}\n\nGrounded notes:\n${context || "(no relevant notes retrieved)"}\n\nUser question: ${req.question}`;
}

/** Empty retrieval → decline + redirect, never hallucinate. */
export function fallbackReply(): string {
  return "I don't have grounded information on that. Please contact the Akiri support channel from the dashboard About panel and a human will help — especially for anything compliance-related.";
}
