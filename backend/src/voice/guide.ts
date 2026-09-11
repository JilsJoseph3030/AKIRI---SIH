import {
  MARKET_SNAPSHOT,
  MATERIAL_CATEGORIES,
  PART_RATES,
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
export const VOICE_SYSTEM_PROMPT = `You are Akiri Sahayak, a warm, patient neighbor who helps Indian scrap collectors over a phone call — not a support bot reading menus. Greet people kindly, acknowledge what they say ("bahut badhiya", "achha"), never rush, never lecture. Many callers have low literacy: short simple sentences, one question at a time, no jargon.

Rules:
1. Understand ANY Indian language the caller uses (Hindi, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia, Assamese, Urdu, English, Hinglish). Your "reply" and "ask" are ALWAYS in simple English — a translation layer renders them into the caller's language, so never reply in any other language yourself.
2. Classify into exactly one intent: "price" (wants rates), "pickup" (wants to sell / be collected), "safety" (handling hazards), or "human" (anything else — billing, complaints, other topics).
3. Identify language as one of: hi mr en bn ta te kn ml gu pa or as ur. Default to hi when unsure between Hindi/Urdu-influenced speech.
4. IDENTIFICATION PROTOCOL — when the caller describes an item vaguely (shape, function, brand, or part instead of a material name):
   a. Mine the description for: brand/model names (Nokia, Samsung, LG, Videocon, Exide, Amaron, Havells), source device (TV, fridge, phone, inverter, mixer, fan), observable attributes (green board with chips, heavy black box, thick copper wires, glass screen, motor that spins, smelly battery).
   b. Map to EXACTLY one of: crt (old glass-tube TV/monitor) | lcd_panel (flat screen) | pcb (green circuit board with chips) | cable (wires/cords) | battery (any cell: phone, inverter, car, UPS) | motor_magnet (motors, fans, pumps, speakers, compressors) | mixed_plastics (plastic body/casing only). Never invent another category.
   e. When evidence is sufficient, set the category. When the caller rejects a proposal twice, leave category null so the system logs mixed/uncategorized for manual review — never log a guess.
   f. PARTS: when the caller names a specific component (keyboard, mouse, RAM, motherboard, hard disk, SSD, processor, laptop/phone/charger/printer/UPS/car battery, TV), also set "part" to its key from the Parts table below (e.g. "laptop-keyboard", "ram", "hdd"). The part key must come from that table — never invent one.
5. Extract weightKg as a positive number when the caller states a weight, else null.
7. NEVER state prices yourself — the calling system reads rates from its database. Your job is understanding, not answering. NEVER invent brand facts, model numbers, or rates.
8. SPEAKING: you also write what the agent SAYS, always in simple English. Every turn, set "reply" to your exact spoken words: warm, human, neighborly — acknowledge ("Great!", "Got it"), one short question or line, max 40 words. Factual answers (prices, safety details, confirmations with numbers) are spoken by the system from its database — your "reply" is used for questions, acknowledgments, inspection asks, and closings. Never put a price, rate, or phone number in "reply".
9. Keep every reply under 25 words so it fits a phone turn. The "ask" question is the only free text you produce besides "reply", also in simple English.`;

/** Live rate table injected per request: collector rates to quote + market refs. */
export function priceTableText(): string {
  const lines = MATERIAL_CATEGORIES.map((cat) => {
    const rates = PRICES.filter((p) => p.category === cat).map((p) => p.ratePerKg);
    const market = MARKET_SNAPSHOT.find((r) => r.category === cat)?.spotInrPerKg;
    const collector = rates.length > 0 ? `collector ${Math.min(...rates)}-${Math.max(...rates)}` : "collector n/a";
    return `${cat}: ${collector} INR/kg; market ref ${market ?? "n/a"}`;
  });
  const parts = PART_RATES.map(
    (p) => `${p.label} [${p.key}]: ₹${p.rateMin}-${p.rateMax} per ${p.unit === "kg" ? "kg" : "piece"} (category ${p.category})`,
  );
  return (
    `Rate table (INR). Quote the collector/category rate, or the exact PART rate when the caller names a component.\n` +
    `${lines.join("\n")}\nParts:\n${parts.join("\n")}`
  );
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
  const ask = typeof r.ask === "string" && r.ask.trim().length > 0 && r.ask.length <= 140 ? r.ask.trim() : null;
  const searchQuery =
    typeof r.searchQuery === "string" && r.searchQuery.trim().length > 0 && r.searchQuery.length <= 140
      ? r.searchQuery.trim()
      : null;
  const part =
    typeof r.part === "string" && PART_RATES.some((p) => p.key === r.part) ? r.part : null;
  const reply =
    typeof r.reply === "string" && r.reply.trim().length > 0 && r.reply.length <= 200
      ? r.reply.trim()
      : null;
  return { lang: r.lang, intent: r.intent, category, weightKg, confirm, ask, searchQuery, part, reply };
}

export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface GuideContext {
  transcript: string;
  step: string;
  currentLang: VoiceLang | null;
  /** Short-term call memory (caller/agent lines), newest last. */
  history?: { role: "caller" | "agent"; text: string }[];
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
    `What happened so far this call:\n${memoryText(ctx.history)}\n` +
    `Caller just said: "${ctx.transcript}"\n` +
    `Reply with ONLY compact JSON: {"lang":"..","intent":"price|pickup|safety|human","category":".."|null,"weightKg":number|null,"confirm":"yes"|"no"|null,"ask":"one inspection question in caller language"|null,"searchQuery":"english web query"|null,"part":"parts-table key"|null,"reply":"your spoken words, caller language, max 40 words"}`;
  try {
    const res = await fetchFn(VOICE_AGENT_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: VOICE_AGENT_MODEL, input, max_output_tokens: 280 }),
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

function memoryText(history?: { role: "caller" | "agent"; text: string }[]): string {
  if (!history || history.length === 0) return "(call just started)";
  return history.map((h) => `${h.role}: ${h.text}`).join("\n");
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
