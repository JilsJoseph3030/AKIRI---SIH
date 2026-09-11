import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  fallbackReply,
  retrieve,
} from "../src/domain/assistant";
import type { KnowledgeChunk } from "../src/domain/assistant";

const chunks: KnowledgeChunk[] = [
  {
    id: "handover",
    title: "Confirming a handover",
    body: "The recycler types the lot reference code and taps confirm handover to seal the trust ledger entry.",
  },
  {
    id: "pricing",
    title: "How pricing is calculated",
    body: "Estimated value is weight times the per-kg buying rate for the material category and location.",
  },
];

describe("assistant grounding", () => {
  it("retrieves the handover note for an in-scope question", () => {
    const found = retrieve(chunks, "how do I confirm a handover?");
    expect(found[0]?.id).toBe("handover");
    expect(buildPrompt({ question: "q", notes: found })).toContain(
      "confirm handover",
    );
  });

  it("returns nothing out-of-scope so the caller declines", () => {
    expect(retrieve(chunks, "who will win the cricket match")).toEqual([]);
    expect(fallbackReply()).toContain("human");
  });
});
