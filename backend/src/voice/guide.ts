import {
  MARKET_SNAPSHOT,
  MATERIAL_CATEGORIES,
  PRICES,
} from "../domain/index";
import type { MaterialCategory } from "../domain/schemas";
import type { VoiceGuide, VoiceIntent, VoiceLang } from "../domain/voice";

export type GuideResult = VoiceGuide;

/** Verified live against https://opencode.ai/zen/v1/models. */
export const VOICE_AGENT_MODEL = "muse-spark-1.3-contributor-free";
export const VOICE_AGENT_ENDPOINT = "https://opencode.ai/zen/v1/responses";

/**
 * Improved system prompt: the model guides (classifies + extracts), the
 * state machine decides. Prices/categories below are injected per request
 * from the same datasets the app reads — the model never invents rates.
 */
export const VOICE_SYSTEM_PROMPT = `You are Akiri Sahayak, a voice helper for Indian scrap collectors calling by phone. Many callers have low literacy: use short simple sentences, one question at a time, no jargon, no English loanwords unless common.

Rules:
1. Understand ANY Indian language the caller uses (Hindi, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia, Assamese, Urdu, English, Hinglish). Always reply in the caller's own language.
2. Classify into exactly one intent: "price" (wants rates), "pickup" (wants to sell / be collected), "safety" (handling hazards), or "human" (anything else — billing, complaints, other topics).
3. Identify language as one of: hi mr en bn ta te kn ml gu pa or as ur. Default to hi when unsure between Hindi/Urdu-influenced speech.
4. For price/pickup/safety, extract material as EXACTLY one of: crt lcd_panel pcb cable battery motor_magnet mixed_plastics. Never invent another category; use mixed_plastics when unsure.
5. Extract weightKg as a positive number when the caller states a weight, else null.
6. Detect confirmation as yes/no/null (null = not a confirmation turn).
7. NEVER state prices yourself — the calling system reads rates from its database. Your job is understanding, not answering.
8. Keep every reply under 25 words so it fits a phone turn.`;

/** Live rate table injected per request: collector rates to quote + market refs. */
export function priceTableText(): string {
  const lines = MATERIAL_CATEGORIES.map((cat) => {
    const rates = PRICES.filter((p) => p.category === cat).map((p) => p.ratePerKg);
    const market = MARKET_SNAPSHOT.find((r) => r.category === cat)?.spotInrPerKg;
    const collector = rates.length > 0 ? `collector ${Math.min(...rates)}-${Math.max(...rates)}` : "collector n/a";
    return `${cat}: ${collector} INR/kg; market ref ${market ?? "n/a"}`;
  });
  return `Rate table (INR per kg). Quote the collector rate to callers.\n${lines.join("\n")}`;
}
const GUIDE_LANGS = ["hi", "mr", "en", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "as", "ur"] as const;

function isGuideLang(value: unknown): value is VoiceLang {
  return typeof value === "string" && (GUIDE_LANGS as readonly string[]).includes(value);
}

function isGuideIntent(value: unknown): value is VoiceIntent {
  return (
    value === "price" || value === "pickup" || value === "safety" || value === "human"
  );
}

function isGuideCategory(value: unknown): value is MaterialCategory {
  return (
    typeof value === "string" &&
    (MATERIAL_CATEGORIES as readonly string[]).includes(value)
  );
}

/** Strict parse of model output: anything off-schema degrades to nulls. */
export function parseGuideResult(raw: unknown): GuideResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isGuideLang(r.lang) || !isGuideIntent(r.intent)) return null;
  const category = r.category == null || r.category === "" ? null : r.category;
  if (category !== null && !isGuideCategory(category)) return null;
  const weightKg =
    typeof r.weightKg === "number" && r.weightKg > 0 && r.weightKg < 10000 ? r.weightKg : null;
  const confirm = r.confirm === "yes" || r.confirm === "no" ? r.confirm : null;
  return { lang: r.lang, intent: r.intent, category, weightKg, confirm };
}

export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface GuideContext {
  transcript: string;
  step: string;
  currentLang: VoiceLang | null;
}

/**
 * Muse Spark guidance call. Returns null on any failure (no key, network,
 * bad shape) so the caller falls back to the keyword detectors — the call
 * never depends on the model being reachable.
 */
export async function guideVoiceTurn(
  apiKey: string,
  ctx: GuideContext,
  fetchFn: FetchFn = defaultFetch,
): Promise<GuideResult | null> {
  if (!apiKey) return null;
  const input =
    `${VOICE_SYSTEM_PROMPT}\n\n${priceTableText()}\n\n` +
    `Call state: step=${ctx.step}, known language=${ctx.currentLang ?? "unknown"}.\n` +
    `Caller said: "${ctx.transcript}"\n` +
    `Reply with ONLY compact JSON: {"lang":"..","intent":"price|pickup|safety|human","category":".."|null,"weightKg":number|null,"confirm":"yes"|"no"|null}`;
  try {
    const res = await fetchFn(VOICE_AGENT_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: VOICE_AGENT_MODEL, input, max_output_tokens: 200 }),
    });
    if (!res.ok) {
      console.warn(`voice guide: zen HTTP ${res.status}`);
      return null;
    }
    const data: unknown = await res.json();
    const text = extractOutputText(data);
    if (!text) {
      console.warn(`voice guide: zen response without output_text`);
      return null;
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = parseGuideResult(JSON.parse(text.slice(start, end + 1)));
    if (!parsed) console.warn(`voice guide: off-schema model output`);
    return parsed;
  } catch {
    return null;
  }
}

function extractOutputText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if ("output_text" in data && typeof data.output_text === "string") return data.output_text;
  return null;
}

const defaultFetch: FetchFn = (url, init) =>
  fetch(url, init).then((res) => ({
    ok: res.ok,
    status: res.status,
    json: () => res.json() as Promise<unknown>,
  }));
