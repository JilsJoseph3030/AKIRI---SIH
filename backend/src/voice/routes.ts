import { Hono } from "hono";
import { createHash } from "node:crypto";
import {
  advanceVoice,
  detectCategory,
  exaAttribution,
  latencyBreached,
  newVoiceSession,
  pseudonymizeCaller,
  recordTurnLatency,
} from "../domain/voice";
import type { ExaLookup, VoiceLang, VoiceSession } from "../domain/voice";
import type { MaterialCategory, Transaction } from "../domain/schemas";
import { MATERIALS, PRICES } from "../domain/index";
import { guideVoiceTurn } from "./guide";
import { computeTwilioSignature, validTwilioSignature } from "./signature";
import { gatherSay, sayHangup, sayLang, twimlXml } from "./twiml";
import { lots } from "../store";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** In-memory call sessions (same vertical-slice tradeoff as store.ts). */
const sessions = new Map<string, { session: VoiceSession; salt: string; from: string; updatedAt: number }>();

const SESSION_TTL_MS = 15 * 60 * 1000;

function touch(callSid: string, entry: { session: VoiceSession; salt: string; from: string }): void {
  sessions.set(callSid, { ...entry, updatedAt: Date.now() });
  for (const [sid, e] of sessions) {
    if (Date.now() - e.updatedAt > SESSION_TTL_MS) sessions.delete(sid);
  }
}

async function readForm(c: {
  req: { parseBody: () => Promise<Record<string, string | File>> };
}): Promise<Record<string, string>> {
  const raw = await c.req.parseBody();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Description-only Exa lookup: never sends phone/location/identity. */
const exaLookup: ExaLookup = async (descriptionEn: string) => {
  const key = process.env.EXA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        query: `what e-waste material is this: ${descriptionEn}`,
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
    const category = detectCategory(hay);
    if (!category) return null;
    console.info(exaAttribution(descriptionEn, hay));
    return { category, evidence: hay.slice(0, 200) };
  } catch {
    return null;
  }
};

function priceLine(category: MaterialCategory, lang: VoiceLang): string {
  const rates = PRICES.filter((p) => p.category === category).map((p) => p.ratePerKg);
  if (rates.length === 0) return "";
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const labels = MATERIALS.find((m) => m.category === category)?.label;
  // Scripted hi/mr/en labels; other languages hear Hindi (widely understood).
  const label = labels?.[lang] ?? labels?.hi ?? category;
  if (lang === "mr") return `${label} cha bhaav ${min === max ? min : `${min} te ${max}`} rupaye kilo.`;
  if (lang === "en") return `${label}: ${min === max ? min : `${min} to ${max}`} rupees per kilo.`;
  return `${label} ka bhaav ${min === max ? min : `${min} se ${max}`} rupaye kilo.`;
}

export const voice = new Hono<{ Variables: { voiceParams: Record<string, string> } }>();
/** Gate every webhook on signature when the auth token is configured. */

voice.use("/voice/*", async (c, next) => {
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  const params = await readForm(c);
  const signature = c.req.header("x-twilio-signature") ?? "";
  // Full URL incl. query string, exactly as Twilio called it (proxy trap:
  // VOICE_PUBLIC_BASE_URL must be the public URL, not the internal one).
  const publicBase = (process.env.VOICE_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  const incoming = new URL(c.req.url);
  const url = `${publicBase}${incoming.pathname}${incoming.search}`;
  if (!validTwilioSignature(token, signature, url, params)) {
    return c.json({ error: "invalid signature" }, 403);
  }
  c.set("voiceParams", params);
  await next();
});

voice.post("/voice/incoming", (c) => {
  const params = c.get("voiceParams") as Record<string, string>;
  const callSid = params.CallSid ?? `call-${Date.now()}`;
  const from = params.From ?? "unknown";
  const salt = process.env.VOICE_SALT ?? "akiri-voice";
  touch(callSid, { session: newVoiceSession(callSid), salt, from });
  const base = process.env.VOICE_PUBLIC_BASE_URL ?? "";
  const action = `${base}/voice/turn?CallSid=${encodeURIComponent(callSid)}`;
  return twimlXml(gatherSay("Namaste! Hindi, Marathi, English?", action, "hi-IN"));
});

voice.post("/voice/turn", async (c) => {
  const params = c.get("voiceParams") as Record<string, string>;
  const callSid = c.req.query("CallSid") ?? params.CallSid ?? "";
  const entry = sessions.get(callSid);
  if (!entry) return twimlXml(sayHangup("Session expired.", "en-IN"));
  const { session, salt, from } = entry;
  touch(callSid, { session, salt, from });
  const started = Date.now();
  const transcript = params.SpeechResult ?? params.Digits ?? "";
  const pseudonym = await pseudonymizeCaller(sha256, from, salt);
  // Muse Spark guides understanding (any Indian language); null on any
  // failure and the keyword detectors carry the turn instead.
  const guide = await guideVoiceTurn(process.env.OPENCODE_ZEN_API_KEY ?? "", {
    transcript,
    step: session.step,
    currentLang: session.lang,
  });
  const turn = await advanceVoice(session, transcript, pseudonym, { exaLookup, guide });
  recordTurnLatency(session, Date.now() - started);
  if (latencyBreached(session)) {
    console.warn(`voice latency breach on ${callSid}: ${session.turnLatenciesMs.join(",")}`);
  }
  const lang = session.lang ?? "hi";
  let reply = turn.reply;
  if (reply.startsWith("PRICE:") && session.slots.category) {
    reply = priceLine(session.slots.category, lang);
  }
  if (turn.write) {
    // Phone lots ORIGINATE only: pending_pickup, NO ledger entry until
    // a real photo/weight/GPS handover step happens (see domain note).
    const tx: Transaction = {
      id: `voice-${callSid}`,
      collectorId: turn.write.collectorPseudonym,
      recyclerId: null,
      category: turn.write.slots.category ?? "mixed_plastics",
      weightKg: turn.write.slots.weightKg ?? 0,
      estimatedValueInr: 0,
      photoHash: null,
      gpsLat: null,
      gpsLng: null,
      timestamp: new Date().toISOString(),
      status: "pending_pickup",
      ledgerRef: null,
      synced: true,
    };
    if (turn.write.slots.needsReview) {
      console.info(`voice lot flagged for manual review: ${tx.id}`);
    }
    lots.set(tx.id, tx);
  }
  if (turn.done) {
    sessions.delete(callSid);
    return twimlXml(sayHangup(reply, sayLang(lang)));
  }
  const base = process.env.VOICE_PUBLIC_BASE_URL ?? "";
  const action = `${base}/voice/turn?CallSid=${encodeURIComponent(callSid)}`;
  return twimlXml(gatherSay(reply, action, sayLang(lang)));
});
