import type { HashFn } from "./trust-ledger";
import type { MaterialCategory } from "./schemas";
import { MATERIALS } from "./seed";

export type VoiceLang = "hi" | "mr" | "en" | "bn" | "ta" | "te" | "kn" | "ml" | "gu" | "pa" | "or" | "as" | "ur";
export type VoiceIntent = "price" | "pickup" | "safety" | "human";
export type VoiceStep = "language" | "intent" | "slot" | "confirm" | "done";

export interface VoiceSlots {
  category?: MaterialCategory;
  weightKg?: number;
  hazard?: MaterialCategory;
  uncategorized?: boolean;
  needsReview?: boolean;
}

export interface VoiceSession {
  callSid: string;
  lang: VoiceLang | null;
  intent: VoiceIntent | null;
  step: VoiceStep;
  slots: VoiceSlots;
  /** Exa-proposed category awaiting caller confirmation. */
  proposal?: MaterialCategory | null;
  exaLog?: { query: string; evidence: string };
  turnLatenciesMs: number[];
}

export function newVoiceSession(callSid: string): VoiceSession {
  return {
    callSid,
    lang: null,
    intent: null,
    step: "language",
    slots: {},
    turnLatenciesMs: [],
  };
}

/** Single-question-at-a-time prompts, no jargon. */
const PROMPTS: Record<string, Record<string, string>> = {
  language: {
    hi: "Namaste! Bhasha chunein. Hindi ke liye Hindi boliye.",
    mr: "Namaskar! Bhasha nivda. Marathi sathi Marathi bola.",
    en: "Hello! Please say Hindi, Marathi, or English to choose your language.",
  },
  intent: {
    hi: "Aap kya karna chahte hain? Bhaav, pickup, ya suraksha jaankari?",
    mr: "Tumhala kay have aahe? Bhaav, pickup, ki suraksha mahiti?",
    en: "What would you like to do? Hear prices, request a pickup, or safety guidance?",
  },
  priceSlot: {
    hi: "Kaun se maal ka bhaav chahiye? Battery, taar, board, ya plastic?",
    mr: "Kontya malacha bhaav havay? Battery, taar, board, ki plastic?",
    en: "Which material's price? Battery, cable, board, or plastic?",
  },
  pickupSlot: {
    hi: "Aapke paas kya hai? Maal aur andazan wazan bataiye.",
    mr: "Tumchyakade kay aahe? Maal ani andaje vajan sanga.",
    en: "What do you have? Tell me the material and rough weight.",
  },
  safetySlot: {
    hi: "Kis cheez ki suraksha jaankari chahiye? Battery ya screen?",
    mr: "Kontya goshtichi suraksha mahiti havi? Battery ki screen?",
    en: "Which hazard? Batteries or screens?",
  },
  human: {
    hi: "Madad ke liye hamare sahayak number par sampark kariye. Dhanyavaad!",
    mr: "Madatisathi amchya sahayyak kramankavar sampark kara. Dhanyavaad!",
    en: "Please contact our support number for further help. Thank you!",
  },
  confirmed: {
    hi: "Darj ho gaya. Recycler ko soochit kiya jayega. Dhanyavaad!",
    mr: "Nond jhali. Recycler la kalavle jail. Dhanyavaad!",
    en: "Registered. A nearby authorized recycler will be notified. Thank you!",
  },
  aborted: {
    hi: "Theek hai, kuchh darj nahin hua. Phir se bataiye.",
    mr: "Theek aahe, kahi nond jhali nahi. Punha sanga.",
    en: "Okay, nothing was recorded. Please tell me again.",
  },
};

const LANG_WORDS: Record<VoiceLang, string[]> = {
  hi: ["hindi", "हिंदी"],
  mr: ["marathi", "मराठी"],
  en: ["english"],
  bn: ["bengali", "bangla", "বাংলা"],
  ta: ["tamil", "தமிழ்"],
  te: ["telugu", "తెలుగు"],
  kn: ["kannada", "ಕನ್ನಡ"],
  ml: ["malayalam", "മലയാളം"],
  gu: ["gujarati", "ગુજરાતી"],
  pa: ["punjabi", "ਪੰਜਾਬੀ"],
  or: ["odia", "oriya", "ଓଡ଼ିଆ"],
  as: ["assamese", "অসমীয়া"],
  ur: ["urdu", "اردو"],
};

const INTENT_WORDS: Record<VoiceIntent, string[]> = {
  price: ["price", "bhaav", "bhav", "भाव", "rate", "kimat", "ves", "dam"],
  pickup: ["pickup", "collect", "lene", "uthao", "उठा", "bechna", "vikayche", "sell", "gadi", "pick"],
  safety: ["safety", "suraksha", "सुरक्षा", "khatra", "savdhani", "burn", "jala", "vidyut"],
  human: ["human", "aadmi", "madad", "help", "agent", "number", "contact", "bolna"],
};

const CATEGORY_WORDS: Record<MaterialCategory, string[]> = {
  battery: ["battery", "बैटरी", "बॅटरी", "cell", "inverter", "सेल"],
  cable: ["cable", "wire", "taar", "तार", "copper", "तांब"],
  pcb: ["board", "pcb", "circuit", "motherboard", "बोर्ड", "chip"],
  crt: ["crt", "tv", "टीवी", "monitor", "maanitar"],
  lcd_panel: ["lcd", "led", "screen", "स्क्रीन", "display", "panel"],
  motor_magnet: ["motor", "मोटर", "magnet", "fan", "पंखा", "pump"],
  mixed_plastics: ["plastic", "प्लास्टिक", "cabinet", "dabba", "bottle"],
};

const YES_WORDS = ["yes", "haan", "haanji", "ho", "हो", "हां", "barobar", "sahi", "correct", "ok"];
const NO_WORDS = ["no", "nahi", "नहीं", "नाही", "naka", "wrong", "galat", "chuk"];

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function detectLanguage(transcript: string): VoiceLang | null {
  const t = transcript.toLowerCase();
  const langs = ["hi", "mr", "en", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "as", "ur"] as VoiceLang[];
  for (const lang of langs) {
    if (includesAny(t, LANG_WORDS[lang])) return lang;
  }
  return null;
}

export function detectIntent(transcript: string): VoiceIntent {
  const t = transcript.toLowerCase();
  for (const intent of ["price", "pickup", "safety"] as VoiceIntent[]) {
    if (includesAny(t, INTENT_WORDS[intent])) return intent;
  }
  return "human";
}

export function detectCategory(transcript: string): MaterialCategory | null {
  const t = transcript.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    if (includesAny(t, words)) return cat as MaterialCategory;
  }
  return null;
}

/** Digits + kilo variants ("2.5 kilo", "5kg", "dha kilo" unsupported → null). */
export function parseWeightKg(transcript: string): number | null {
  const m = transcript.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos)?/i);
  if (!m) return null;
  const v = Number(m[1]);
  return v > 0 && v < 10000 ? v : null;
}

export function isYes(transcript: string): boolean {
  return includesAny(transcript.toLowerCase(), YES_WORDS);
}

export function isNo(transcript: string): boolean {
  return includesAny(transcript.toLowerCase(), NO_WORDS);
}

/** Caller pseudonym: salted hash, 12 hex chars. Raw number never stored. */
export async function pseudonymizeCaller(
  hash: HashFn,
  phoneNumber: string,
  salt: string,
): Promise<string> {
  const digest = String(await hash(`${salt}:${phoneNumber}`));
  return `voice:${digest.slice(0, 12)}`;
}

/** Exa attribution line for the AI/ML Training dataset source field. */
export function exaAttribution(query: string, evidence: string): string {
  return `voice-channel exa lookup | query: "${query}" | evidence: "${evidence.slice(0, 140)}"`;
}

/** Same safety content as the app carousel — single source in seed.ts. */
export function safetyBrief(category: MaterialCategory, lang: VoiceLang): string {
  const m = MATERIALS.find((x) => x.category === category);
  if (!m) return PROMPTS.safetySlot![lang];
  return lang === "en" ? m.handlingNote : `${m.label[lang]}. ${m.handlingNote}`;
}

export interface ExaLookup {
  (descriptionEn: string): Promise<{ category: MaterialCategory; evidence: string } | null>;
}

/** Muse Spark understanding of one turn; keywords fill whatever is null. */
export interface VoiceGuide {
  lang: VoiceLang;
  intent: VoiceIntent;
  category: MaterialCategory | null;
  weightKg: number | null;
  confirm: "yes" | "no" | null;
}

export interface VoiceContext {
  exaLookup: ExaLookup;
  guide?: VoiceGuide | null;
}
export interface VoiceTurn {
  reply: string;
  done: boolean;
  /** Present only after an explicit yes at the confirm step. */
  write?: { intent: VoiceIntent; slots: VoiceSlots; collectorPseudonym: string };
}

function prompt(key: string, lang: VoiceLang): string {
  // Full scripts exist for hi/mr/en only; other languages fall back to
  // Hindi (widely understood) while the LLM guide still understands
  // and classifies the caller's own language.
  const table = PROMPTS[key];
  return table?.[lang] ?? table?.hi ?? "";
}

/**
 * One transcript → one reply. Pure apart from the optional Exa lookup.
 * Writes happen ONLY via the returned `write` after explicit yes.
 */
export async function advanceVoice(
  session: VoiceSession,
  transcript: string,
  collectorPseudonym: string,
  ctx: VoiceContext,
): Promise<VoiceTurn> {
  const lang = session.lang ?? ctx.guide?.lang ?? "en";
  const g = ctx.guide ?? null;

  if (session.step === "language") {
    session.lang = ctx.guide?.lang ?? detectLanguage(transcript) ?? "hi";
    session.step = "intent";
    return { reply: prompt("intent", session.lang), done: false };
  }

  if (session.step === "intent") {
    session.intent = ctx.guide?.intent ?? detectIntent(transcript);
    session.step = session.intent === "human" ? "done" : "slot";
    if (session.intent === "human") return { reply: prompt("human", lang), done: true };
    const key = session.intent === "price" ? "priceSlot" : session.intent === "pickup" ? "pickupSlot" : "safetySlot";
    return { reply: prompt(key, lang), done: false };
  }

  if (session.step === "slot") {
    if (session.intent === "price") {
      const cat = g?.category ?? detectCategory(transcript);
      if (!cat) return { reply: prompt("priceSlot", lang), done: false };
      session.slots.category = cat;
      session.step = "done";
      return { reply: `PRICE:${cat}`, done: true };
    }
    if (session.intent === "safety") {
      const cat = g?.category ?? detectCategory(transcript);
      if (!cat) return { reply: prompt("safetySlot", lang), done: false };
      session.slots.hazard = cat;
      session.step = "done";
      return { reply: safetyBrief(cat, lang), done: true };
    }
    // pickup: category (+ optional weight), then confirm-back
    const cat = g?.category ?? detectCategory(transcript);
    const weightKg = g?.weightKg ?? parseWeightKg(transcript);
    if (!cat) {
      const proposal = await ctx.exaLookup(transcript);
      if (proposal) {
        session.proposal = proposal.category;
        session.exaLog = { query: transcript, evidence: proposal.evidence };
        session.step = "confirm";
        return {
          reply: confirmProposal(proposal.category, lang),
          done: false,
        };
      }
      session.slots.uncategorized = true;
      session.slots.needsReview = true;
      session.step = "confirm";
      return { reply: confirmGeneric(lang), done: false };
    }
    session.slots.category = cat;
    if (weightKg) session.slots.weightKg = weightKg;
    session.step = "confirm";
    return { reply: confirmPickup(cat, weightKg, lang), done: false };
  }

  if (session.step === "confirm") {
    const saidYes = g?.confirm === "yes" || (isYes(transcript) && !isNo(transcript));
    const saidNo = g?.confirm === "no" || isNo(transcript);
    if (saidYes && !saidNo) {
      if (session.proposal && !session.slots.category) {
        session.slots.category = session.proposal;
        session.slots.needsReview = true;
      }
      const out: VoiceTurn = {
        reply: prompt("confirmed", lang),
        done: true,
        write: { intent: session.intent!, slots: { ...session.slots }, collectorPseudonym },
      };
      session.step = "done";
      return out;
    }
    // "no" (or unclear): abort the write, re-prompt the slot step.
    session.proposal = null;
    session.slots = {};
    session.step = "slot";
    const key = session.intent === "price" ? "priceSlot" : session.intent === "pickup" ? "pickupSlot" : "safetySlot";
    return { reply: `${prompt("aborted", lang)} ${prompt(key, lang)}`, done: false };
  }

  return { reply: prompt("human", lang), done: true };
}

/** Trilingual scripts with Hindi fallback for the other 10 languages. */
function phrasing(map: { hi: string; mr: string; en: string }, lang: VoiceLang): string {
  return map[lang as "hi" | "mr" | "en"] ?? map.hi;
}

function confirmPickup(cat: MaterialCategory, weightKg: number | null, lang: VoiceLang): string {
  const what =
    weightKg
      ? phrasing({ hi: `${cat}, ${weightKg} kilo`, mr: `${cat}, ${weightKg} kilo`, en: `${cat}, ${weightKg} kilos` }, lang)
      : cat;
  const ask = phrasing({
    hi: "Samajh gaya. Kya yeh sahi hai? Haan ya na boliye.",
    mr: "Samajle. Hey barobar aahe ka? Ho ki nahi sanga.",
    en: "Understood. Is that right? Say yes or no.",
  }, lang);
  return `${what}. ${ask}`;
}

function confirmProposal(cat: MaterialCategory, lang: VoiceLang): string {
  return phrasing({
    hi: `Lagta hai yeh ${cat} hai — kya yeh sahi hai?`,
    mr: `Vatate he ${cat} aahe — hey barobar aahe ka?`,
    en: `It sounds like a ${cat} — is that right?`,
  }, lang);
}

function confirmGeneric(lang: VoiceLang): string {
  return phrasing({
    hi: "Samajh nahin aaya. Mixed maal ke roop mein darj karoon? Haan ya na.",
    mr: "Samajle nahi. Mixed maal mhanun nond karu ka? Ho ki nahi.",
    en: "I couldn't identify it. Log as mixed material for manual review? Yes or no.",
  }, lang);
}

/** Turn latency bookkeeping: flag flows regularly breaching ~5s/turn. */
export function recordTurnLatency(session: VoiceSession, ms: number): void {
  session.turnLatenciesMs.push(ms);
}

export function latencyBreached(session: VoiceSession, budgetMs = 5000): boolean {
  const turns = session.turnLatenciesMs;
  if (turns.length < 2) return false;
  const breaches = turns.filter((t) => t > budgetMs).length;
  return breaches / turns.length >= 0.5;
}
