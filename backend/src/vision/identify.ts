import {
  MATERIAL_CATEGORIES,
  PART_RATES,
  PRICES,
} from "../domain/index";
import type { MaterialCategory } from "../domain/schemas";
import { detectCategory } from "../domain/voice";
import { lookupPart } from "../domain/parts";

/** Verified: Responses API takes input_image blocks; Zen uses the same path. */
export const VISION_MODEL = "muse-spark-1.3-contributor-free";
export const VISION_ENDPOINT = "https://opencode.ai/zen/v1/responses";

export const VISION_SYSTEM_PROMPT = `You identify e-waste and scrap items from a photo for Indian collectors. Look carefully: device type, brand/model markings, screen type (glass tube vs flat), green circuit boards, batteries, motors, cables, plastics.

Return ONLY compact JSON: {"category":"..","part":".."|null,"modelHint":"visible brand/model text or null","confidence":0-1}.
Rules:
- "category" is EXACTLY one of: crt lcd_panel pcb cable battery motor_magnet mixed_plastics.
- "part" is a Parts-table key when a specific component is visible (laptop-keyboard, mouse, ram, motherboard, hdd, ssd, cpu, laptop-battery, charger, laptop-full, mobile-phone, printer, ups, car-battery, tv-old), else null. Never invent a key.
- "modelHint" is brand/model text you can actually READ in the image, else null. Never guess a model you cannot see.
- Set confidence below 0.55 when the photo is blurry, dark, or ambiguous.`;

export interface VisionResult {
  category: MaterialCategory;
  partKey: string | null;
  modelHint: string | null;
  confidence: number;
  /** Researched price line for the identified item. */
  priceText: string;
  estimatedValueInr: number | null;
  source: "model+exa" | "model" | "mock";
}

function isVisionCategory(value: unknown): value is MaterialCategory {
  return (
    typeof value === "string" &&
    (MATERIAL_CATEGORIES as readonly string[]).includes(value)
  );
}

export function parseVisionResult(raw: unknown): {
  category: MaterialCategory;
  partKey: string | null;
  modelHint: string | null;
  confidence: number;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isVisionCategory(r.category)) return null;
  const part =
    typeof r.part === "string" && PART_RATES.some((p) => p.key === r.part) ? r.part : null;
  const modelHint =
    typeof r.modelHint === "string" && r.modelHint.trim().length > 0 && r.modelHint.length <= 80
      ? r.modelHint.trim()
      : null;
  const confidence =
    typeof r.confidence === "number" && r.confidence >= 0 && r.confidence <= 1
      ? r.confidence
      : 0;
  return { category: r.category, partKey: part, modelHint, confidence };
}

export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Researched per-item quote: exact part rate wins, else category rate. */
export function quoteFor(
  category: MaterialCategory,
  partKey: string | null,
  weightKg: number | null,
): { priceText: string; estimatedValueInr: number | null } {
  if (partKey) {
    const part = PART_RATES.find((p) => p.key === partKey);
    if (part) {
      const unit = part.unit === "kg" ? "per kg" : "per piece";
      const mid = Math.round((part.rateMin + part.rateMax) / 2);
      const value =
        weightKg && part.unit === "kg" ? Math.round(mid * weightKg) : part.unit === "piece" ? mid : null;
      return {
        priceText: `${part.label}: ₹${part.rateMin}-${part.rateMax} ${unit}`,
        estimatedValueInr: value,
      };
    }
  }
  const rates = PRICES.filter((p) => p.category === category).map((p) => p.ratePerKg);
  if (rates.length === 0) return { priceText: `${category}: rate on request`, estimatedValueInr: null };
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return {
    priceText: `${category}: ₹${min}${min === max ? "" : `-${max}`} per kg`,
    estimatedValueInr: weightKg ? Math.round(((min + max) / 2) * weightKg) : null,
  };
}

export interface IdentifyInput {
  imageBase64: string;
  mimeType?: string;
  weightKg?: number;
  hint?: string;
}

/**
 * Vision identification: photo → model (category/part/modelHint) → Exa
 * price grounding → researched quote. No mocks, no fallbacks: provider
 * failures throw VisionError and the route answers 502/503 honestly.
 */
export class VisionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function identifyImage(
  apiKey: string,
  exaKey: string,
  input: IdentifyInput,
  fetchFn: FetchFn = defaultFetch,
): Promise<VisionResult> {
  const weightKg = input.weightKg ?? null;
  if (!apiKey) throw new VisionError(503, "vision model key not configured");
  let res;
  try {
    const mime = input.mimeType ?? "image/jpeg";
    res = await fetchFn(VISION_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `${VISION_SYSTEM_PROMPT}\n\nCaller hint: ${input.hint ?? "none"}` },
              { type: "input_image", image_url: `data:${mime};base64,${input.imageBase64}`, detail: "auto" },
            ],
          },
        ],
        max_output_tokens: 200,
      }),
    });
  } catch {
    throw new VisionError(502, "vision model unreachable");
  }
  if (!res.ok) throw new VisionError(502, `vision model HTTP ${res.status}`);
  const data: unknown = await res.json();
  const text = extractText(data);
  const parsed = text ? parseVisionResult(JSON.parse(sliceJson(text))) : null;
  if (!parsed) throw new VisionError(502, "vision model gave no usable identification");
  if (parsed.confidence < 0.55) {
    // Low-confidence: Exa grounds the caller's hint before answering.
    const grounded = await exaGround(exaKey, input.hint ?? "", fetchFn);
    if (!grounded) throw new VisionError(502, "identification too uncertain; retake the photo");
    return { category: grounded, partKey: null, modelHint: null, confidence: parsed.confidence, ...quoteFor(grounded, null, weightKg), source: "model+exa" };
  }
  const part = parsed.partKey ?? lookupPart(input.hint ?? "")?.key ?? null;
  return { ...parsed, partKey: part, ...quoteFor(parsed.category, part, weightKg), source: "model" };
}

async function exaGround(
  exaKey: string,
  hint: string,
  fetchFn: FetchFn,
): Promise<MaterialCategory | null> {
  if (!exaKey || !hint.trim()) return null;
  try {
    const res = await fetchFn("https://api.exa.ai/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": exaKey },
      body: JSON.stringify({
        query: `what e-waste scrap material is this: ${hint} India buyback rate`,
        contents: { highlights: true },
      }),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results)) {
      return null;
    }
    const hay = data.results
      .slice(0, 3)
      .map((r) => {
        if (!r || typeof r !== "object") return "";
        const t = "title" in r && typeof r.title === "string" ? r.title : "";
        const h = "highlights" in r && Array.isArray(r.highlights) ? r.highlights.join(" ") : "";
        return `${t} ${h}`;
      })
      .join(" ")
      .toLowerCase();
    const { detectCategory } = await import("../domain/voice");
    return detectCategory(hay);
  } catch {
    return null;
  }
}

function extractText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if ("output_text" in data && typeof data.output_text === "string") return data.output_text;
  return null;
}

function sliceJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : "{}";
}

const defaultFetch: FetchFn = (url, init) =>
  fetch(url, init).then((res) => ({
    ok: res.ok,
    status: res.status,
    json: () => res.json() as Promise<unknown>,
  }));
