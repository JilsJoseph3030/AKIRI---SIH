import type { HashFn } from "./trust-ledger";
import type { MaterialCategory } from "./schemas";
import { MATERIALS } from "./seed";
import { lookupPart, partByKey } from "./parts";

export type VoiceLang = "hi" | "mr" | "en" | "bn" | "ta" | "te" | "kn" | "ml" | "gu" | "pa" | "or" | "as" | "ur";
export type VoiceIntent = "price" | "pickup" | "safety" | "human";
export type VoiceStep = "language" | "intent" | "slot" | "confirm" | "done";

export interface VoiceSlots {
  category?: MaterialCategory;
  weightKg?: number;
  hazard?: MaterialCategory;
  uncategorized?: boolean;
  needsReview?: boolean;
  /** Exact part key from PART_RATES when the caller named a component. */
  partKey?: string;
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
  /** Unrecognized-intent attempts; human fallback only after cap. */
  intentRetries: number;
  /** Unmatched-slot attempts per flow; human redirect only after cap. */
  slotRetries: number;
  /** Targeted inspection questions asked; generic fallback after cap. */
  inspectRounds: number;
  /** Cumulative caller description across inspection turns. */
  note: string;
  /**
   * Short-term call memory: alternating caller/agent lines, newest last.
   * Lives ONLY in this session object — deleted with it on hangup/TTL.
   * Never written to disk, DB, or logs (transcripts stay out of logs).
   */
  history: { role: "caller" | "agent"; text: string }[];
}

export function newVoiceSession(callSid: string): VoiceSession {
  return {
    callSid,
    lang: null,
    intent: null,
    step: "language",
    slots: {},
    turnLatenciesMs: [],
    intentRetries: 0,
    slotRetries: 0,
    inspectRounds: 0,
    note: "",
    history: [],
  };
}

/** Append one memory line, keeping only the last 8 (prompt-budget bound). */
export function remember(session: VoiceSession, role: "caller" | "agent", text: string): void {
  session.history.push({ role, text: text.slice(0, 200) });
  while (session.history.length > 8) session.history.shift();
}

/** DTMF-first menu (reliable on noisy lines); speech names still work. */
const DIGIT_LANG: Record<string, VoiceLang> = { "1": "hi", "2": "mr", "3": "en", "4": "ml" };

/** Single-question-at-a-time prompts, no jargon. */
const PROMPTS: Record<string, Record<string, string>> = {
  language: {
    hi: "Namaste! Hindi ke liye 1, Marathi ke liye 2, English ke liye 3, Malayalam ke liye 4 dabayein.",
    mr: "Namaskar! Hindi sathi 1, Marathi sathi 2, English sathi 3, Malayalam sathi 4 daba.",
    en: "Hello! Press 1 for Hindi, 2 for Marathi, 3 for English, 4 for Malayalam.",
    ml: "Namaskaram! Hindi 1, Marathi 2, English 3, Malayalam 4 amarthoo.",
  },
  intent: {
    hi: "Bahut badhiya! Ab bataiye — bhaav jaanna hai, pickup karwana hai, ya suraksha jaankari chahiye?",
    mr: "Chhan! Ata sanga — bhaav havay, pickup karaychay, ki suraksha mahiti havi?",
    en: "Great to hear from you! Tell me — do you want prices, a pickup, or safety guidance?",
    ml: "Valare nanni! Ippo parayoo — vila aano, pickup aano, suraksha aano?",
  },
  priceSlot: {
    hi: "Kaun se maal ka bhaav chahiye? Battery, taar, board, ya plastic?",
    mr: "Kontya malacha bhaav havay? Battery, taar, board, ki plastic?",
    en: "Which material's price? Battery, cable, board, or plastic?",
    ml: "Etha saadhanathinte vila venam? Battery, kambi, board, plastic?",
  },
  pickupSlot: {
    hi: "Aapke paas kya hai? Maal aur andazan wazan bataiye.",
    mr: "Tumchyakade kay aahe? Maal ani andaje vajan sanga.",
    en: "What do you have? Tell me the material and rough weight.",
    ml: "Ningalude kayyil enthu undu? Saadhanavum thookkavum parayoo.",
  },
  safetySlot: {
    hi: "Kis cheez ki suraksha jaankari chahiye? Battery ya screen?",
    mr: "Kontya goshtichi suraksha mahiti havi? Battery ki screen?",
    en: "Which hazard? Batteries or screens?",
    ml: "Ethanekkurichulla suraksha vivaram venam? Battery yo screen yo?",
  },
  human: {
    hi: "Madad ke liye hamare sahayak number par sampark kariye. Dhanyavaad!",
    mr: "Madatisathi amchya sahayyak kramankavar sampark kara. Dhanyavaad!",
    en: "Please contact our support number for further help. Thank you!",
    ml: "Sahayathinu support nambaril vilikku. Nanni!",
  },
  confirmed: {
    hi: "Ho gaya! Darj ho gaya hai. Nazdeeki recycler ko khabar bhej di jayegi. Dhanyavaad!",
    mr: "Jhala! Nond jhali aahe. Jawalchya recycler la kalavle jail. Dhanyavaad!",
    en: "All done! It is registered, and a nearby authorized recycler will be notified. Thank you!",
    ml: "Kazhinju! Rajistar cheythu. Aduthulla recyclerine ariyikkum. Nanni!",
  },
  aborted: {
    hi: "Koi baat nahi, kuchh darj nahin hua. Aaram se phir se bataiye.",
    mr: "Kahi harkat nahi, kahi nond jhali nahi. Savkash punha sanga.",
    en: "No worries, nothing was recorded. Take your time and tell me again.",
    ml: "Kuzhappamilla, onnum rajistar cheythilla. Samadhanathode veendum parayoo.",
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
  price: ["price", "bhaav", "bhav", "भाव", "rate", "kimat", "ves", "dam", "vila", "വില"],
  pickup: ["pickup", "collect", "lene", "uthao", "उठा", "bechna", "vikayche", "sell", "gadi", "pick", "edukku", "എടുക്ക്"],
  safety: ["safety", "suraksha", "सुरक्षा", "khatra", "savdhani", "burn", "jala", "vidyut", "സുരക്ഷ"],
  human: ["human", "aadmi", "madad", "help", "agent", "number", "contact", "bolna"],
};

const YES_WORDS = ["yes", "haan", "haanji", "ho", "हो", "हां", "barobar", "sahi", "correct", "ok", "athe", "sheri", "ശരി"];
const NO_WORDS = ["no", "nahi", "नहीं", "नाही", "naka", "wrong", "galat", "chuk", "alla", "veda", "അല്ല"];

const CATEGORY_WORDS: Record<MaterialCategory, string[]> = {
  battery: ["battery", "बैटरी", "बॅटरी", "cell", "inverter", "सेल", "ബാറ്ററി", "exide", "amaron", "ups", "car", "phone", "mobile", "laptop"],
  cable: ["cable", "wire", "taar", "तार", "copper", "तांब", "കമ്പി", "വയർ", "charger", "cord", "plug", "charger"],
  pcb: ["board", "pcb", "circuit", "motherboard", "बोर्ड", "chip", "green board", "processor", "ram"],
  crt: ["crt", "tv", "टीवी", "monitor", "maanitar", "tube", "bulky", "glass", "videocon"],
  lcd_panel: ["lcd", "led", "screen", "स्क्रीन", "display", "panel", "flat", "samsung", "lg", "monitor"],
  motor_magnet: ["motor", "मोटर", "magnet", "fan", "पंखा", "pump", "speaker", "mixer", "fridge", "compressor", "washing", "havells"],
  mixed_plastics: ["plastic", "प्लास्टिक", "cabinet", "dabba", "bottle", "cover", "casing", "remote", "keyboard", "mouse", "body"],
};

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
  /** One targeted inspection question in the caller's language, or null. */
  ask: string | null;
  /** English web-search query for vague descriptions, or null. */
  searchQuery: string | null;
  /** Exact part key from PART_RATES, or null. */
  part: string | null;
  /** Model's spoken words for this turn (caller's language), or null. */
  reply: string | null;
}

export interface VoiceContext {
  exaLookup: ExaLookup;
  guide?: VoiceGuide | null;
}

/** Model's words win when present; templates are the offline safety net. */
function said(guide: VoiceGuide | null | undefined, fallback: string): string {
  return guide?.reply && guide.reply.length > 0 ? guide.reply : fallback;
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
    const digit = DIGIT_LANG[transcript.trim()] ?? null;
    session.lang = digit ?? ctx.guide?.lang ?? detectLanguage(transcript) ?? session.lang ?? "hi";
    session.step = "intent";
    return { reply: said(g, prompt("intent", session.lang)), done: false };
  }

  if (session.step === "intent") {
    const intent = ctx.guide?.intent ?? detectIntent(transcript);
    // Never hang up on a garbled first try: reprompt twice, human fallback after.
    if (intent === "human" && session.intentRetries < 2) {
      session.intentRetries += 1;
      return { reply: said(g, prompt("intent", lang)), done: false };
    }
    session.intent = intent;
    session.step = session.intent === "human" ? "done" : "slot";
    session.slotRetries = 0;
    if (session.intent === "human") return { reply: said(g, prompt("human", lang)), done: true };
    const key = session.intent === "price" ? "priceSlot" : session.intent === "pickup" ? "pickupSlot" : "safetySlot";
    return { reply: said(g, prompt(key, lang)), done: false };
  }
  if (session.step === "slot") {
    const missed = () => {
      session.slotRetries += 1;
      if (session.slotRetries >= 3) {
        session.step = "done";
        return { reply: said(g, prompt("human", lang)), done: true };
      }
      const key = session.intent === "price" ? "priceSlot" : session.intent === "safety" ? "safetySlot" : "pickupSlot";
      return { reply: said(g, prompt(key, lang)), done: false };
    };
    if (session.intent === "price") {
      const guidedPart = g?.part ? partByKey(g.part) : null;
      const part = guidedPart ?? lookupPart(transcript);
      if (part) {
        session.slots.partKey = part.key;
        session.slots.category = part.category;
        session.step = "done";
        return { reply: `PART:${part.key}`, done: true };
      }
      const cat = g?.category ?? detectCategory(transcript);
      if (!cat) return missed();
      session.slots.category = cat;
      session.step = "done";
      return { reply: `PRICE:${cat}`, done: true };
    }
    if (session.intent === "safety") {
      const cat = g?.category ?? detectCategory(transcript);
      if (!cat) return missed();
      session.slots.hazard = cat;
      session.step = "done";
      return { reply: safetyBrief(cat, lang), done: true };
    }
    // pickup: category (+ optional weight), then confirm-back
    const cat = g?.category ?? detectCategory(transcript);
    const weightKg = g?.weightKg ?? parseWeightKg(transcript);
    if (!cat) {
      session.note = `${session.note} ${transcript}`.trim();
      // Guided inspection first: one targeted question per turn (cap 2),
      // so the caller is led to the discriminating detail.
      if (g?.ask && session.inspectRounds < 2) {
        session.inspectRounds += 1;
        return { reply: g.ask, done: false };
      }
      const query = g?.searchQuery ?? session.note;
      const proposal = await ctx.exaLookup(query);
      if (proposal) {
        session.proposal = proposal.category;
        session.exaLog = { query, evidence: proposal.evidence };
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
    const named = g?.part ? partByKey(g.part) : lookupPart(transcript);
    const display = named ? named.label : cat;
    if (named) session.slots.partKey = named.key;
    session.step = "confirm";
    return { reply: confirmPickup(display, weightKg, lang), done: false };
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
        reply: said(g, prompt("confirmed", lang)),
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
    return { reply: said(g, `${prompt("aborted", lang)} ${prompt(key, lang)}`), done: false };
  }

  return { reply: said(g, prompt("human", lang)), done: true };
}
/** Scripted hi/mr/en/ml; other languages fall back to Hindi. */
function phrasing(map: { hi: string; mr: string; en: string; ml: string }, lang: VoiceLang): string {
  if (lang === "mr" || lang === "en" || lang === "ml") return map[lang];
  return map.hi;
}

function confirmPickup(display: string, weightKg: number | null, lang: VoiceLang): string {
  const what =
    weightKg
      ? phrasing({ hi: `${display}, ${weightKg} kilo`, mr: `${display}, ${weightKg} kilo`, en: `${display}, ${weightKg} kilos`, ml: `${display}, ${weightKg} kilo` }, lang)
      : display;
  const ask = phrasing({
    hi: "Samajh gaya! Bas pakka kar lein — kya yeh sahi hai? Haan ya na boliye.",
    mr: "Samajle! Fakt khatri karuya — hey barobar aahe ka? Ho ki nahi sanga.",
    en: "Got it! Just to be sure — is that right? Say yes or no.",
    ml: "Manassilayi! Onnu urappikkatte — sheriyano? Yes o no o parayoo.",
  }, lang);
  return `${what}. ${ask}`;
}

function confirmProposal(cat: MaterialCategory, lang: VoiceLang): string {
  return phrasing({
    hi: `Lagta hai yeh ${cat} hai — kya yeh sahi hai?`,
    mr: `Vatate he ${cat} aahe — hey barobar aahe ka?`,
    en: `It sounds like a ${cat} — is that right?`,
    ml: `Ithu ${cat} aanennu thonnunnu — sheriyano?`,
  }, lang);
}

function confirmGeneric(lang: VoiceLang): string {
  return phrasing({
    hi: "Samajh nahin aaya. Mixed maal ke roop mein darj karoon? Haan ya na.",
    mr: "Samajle nahi. Mixed maal mhanun nond karu ka? Ho ki nahi.",
    en: "I couldn't identify it. Log as mixed material for manual review? Yes or no.",
    ml: "Manassilayilla. Mixed aayi rajistar cheyyatte? Yes o no o.",
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
