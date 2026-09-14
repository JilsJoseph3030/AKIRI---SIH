import { describe, expect, it } from "vitest";
import {
  identifyImage,
  parseVisionResult,
  quoteFor,
  VisionError,
  VISION_MODEL,
} from "../src/vision/identify";

const okFetch = (body: unknown) => async () => ({
  ok: true,
  status: 200,
  json: async () => body,
});

describe("vision identification", () => {
  it("uses the contributor-free spark model id", () => {
    expect(VISION_MODEL).toBe("muse-spark-1.3-contributor-free");
  });

  it("parses strict output and rejects invented categories and parts", () => {
    const good = parseVisionResult({
      category: "pcb",
      part: "ram",
      modelHint: "Samsung K4T",
      confidence: 0.9,
    });
    expect(good).toEqual({ category: "pcb", partKey: "ram", modelHint: "Samsung K4T", confidence: 0.9 });
    expect(parseVisionResult({ category: "gold", part: null, modelHint: null, confidence: 0.9 })).toBe(null);
    expect(parseVisionResult({ category: "pcb", part: "gold-toilet", modelHint: null, confidence: 0.9 })?.partKey).toBe(null);
    expect(parseVisionResult(null)).toBe(null);
  });

  it("quotes exact part rates over bulk rates", () => {
    const part = quoteFor("mixed_plastics", "laptop-keyboard", 2);
    expect(part.priceText).toContain("₹25-40 per kg");
    expect(part.estimatedValueInr).toBe(66);
    const bulk = quoteFor("pcb", null, 1);
    expect(bulk.priceText).toContain("per kg");
    expect(bulk.estimatedValueInr).toBe(320);
  });

  it("identifies model, part, and price from a vision response", async () => {
    const seen: string[] = [];
    const result = await identifyImage(
      "key",
      "exa",
      { imageBase64: "AAA", weightKg: 2, hint: "old laptop ram" },
      async (url, init) => {
        seen.push(url);
        return okFetch({
          output_text: '{"category":"pcb","part":"ram","modelHint":"Samsung","confidence":0.92}',
        })();
      },
    );
    expect(result.category).toBe("pcb");
    expect(result.partKey).toBe("ram");
    expect(result.modelHint).toBe("Samsung");
    expect(result.priceText).toContain("₹800-2500 per kg");
    expect(result.source).toBe("model");
    expect(seen).toEqual(["https://opencode.ai/zen/v1/responses"]);
  });

  it("throws honestly instead of mocking: no key, provider error, uncertain", async () => {
    await expect(identifyImage("", "exa", { imageBase64: "AAA" })).rejects.toMatchObject({
      status: 503,
    });
    await expect(
      identifyImage("k", "exa", { imageBase64: "AAA" }, async () => ({
        ok: false,
        status: 400,
        json: async () => ({}),
      })),
    ).rejects.toBeInstanceOf(VisionError);
    await expect(
      identifyImage(
        "k",
        "exa",
        { imageBase64: "AAA", hint: "blurry dark photo" },
        async (url) =>
          url.includes("exa.ai")
            ? { ok: true, status: 200, json: async () => ({ results: [] }) }
            : okFetch({ output_text: '{"category":"pcb","part":null,"modelHint":null,"confidence":0.3}' })(),
      ),
    ).rejects.toMatchObject({ status: 502 });
  });
});
