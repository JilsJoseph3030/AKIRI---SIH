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
  remember,
} from "../domain/voice";
import type { ExaLookup, VoiceSession } from "../domain/voice";
import type { MaterialCategory, Transaction } from "../domain/schemas";
import { MATERIALS, PRICES } from "../domain/index";
import { partByKey, partPriceLine } from "../domain/parts";
import { guideVoiceTurn } from "./guide";
import { sarvamStt } from "./sarvam";
import type { SarvamConfig } from "./sarvam";
import { getAudio, speak } from "./speak";
import { computeTwilioSignature, validTwilioSignature } from "./signature";
import { gatherSay, playHangup, recordPlay, sayHangup, sayLang, twimlXml } from "./twiml";
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

function sarvamCfg(): SarvamConfig | null {
  const apiKey = process.env.SARVAM_API_KEY ?? "";
  if (!apiKey) return null;
  return {
    apiKey,
    sttModel: process.env.SARVAM_STT_MODEL,
    ttsModel: process.env.SARVAM_TTS_MODEL,
    speaker: process.env.SARVAM_SPEAKER,
  };
}

function publicBase(): string {
  return (process.env.VOICE_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
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

/** English-first price line; the speak pipeline localizes it. */
function priceLineEn(category: MaterialCategory): string {
  const rates = PRICES.filter((p) => p.category === category).map((p) => p.ratePerKg);
  if (rates.length === 0) return "";
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const label = MATERIALS.find((m) => m.category === category)?.label.en ?? category;
  return `${label}: ${min === max ? min : `${min} to ${max}`} rupees per kilo.`;
}

/** Download a Twilio recording (basic auth with account credentials). */
async function downloadRecording(url: string): Promise<Blob | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  try {
    const res = await fetch(url, {
      headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export const voice = new Hono<{ Variables: { voiceParams: Record<string, string> } }>();

/** Gate every webhook on signature when the auth token is configured. */
voice.use("/voice/*", async (c, next) => {
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  if (!token) return c.json({ error: "voice channel not configured" }, 503);
  const params = await readForm(c);
  const signature = c.req.header("x-twilio-signature") ?? "";
  // Full URL incl. query string, exactly as Twilio called it (proxy trap:
  // VOICE_PUBLIC_BASE_URL must be the public URL, not the internal one).
  const incoming = new URL(c.req.url);
  const url = `${publicBase()}${incoming.pathname}${incoming.search}`;
  if (!validTwilioSignature(token, signature, url, params)) {
    return c.json({ error: "invalid signature" }, 403);
  }
  c.set("voiceParams", params);
  await next();
});

const MENU_EN =
  "Welcome to Akiri! Say the name of your language. Hindi, Marathi, English, Malayalam, Bengali, Tamil, Telugu, or any other Indian language.";

voice.post("/voice/incoming", async (c) => {
  const params = c.get("voiceParams") as Record<string, string>;
  const callSid = params.CallSid ?? `call-${Date.now()}`;
  const from = params.From ?? "unknown";
  const salt = process.env.VOICE_SALT ?? "akiri-voice";
  touch(callSid, { session: newVoiceSession(callSid), salt, from });
  const action = `${publicBase()}/voice/turn?CallSid=${encodeURIComponent(callSid)}`;
  const cfg = sarvamCfg();
  if (cfg) {
    const id = await speak(cfg, MENU_EN, "en");
    if (id) return twimlXml(recordPlay(`${publicBase()}/voice/audio/${id}`, action));
  }
  return twimlXml(gatherSay("Namaste! Hindi ke liye 1, Marathi ke liye 2, English ke liye 3, Malayalam ke liye 4 dabayein.", action, "hi-IN"));
});

voice.post("/voice/turn", async (c) => {
  const params = c.get("voiceParams") as Record<string, string>;
  const callSid = c.req.query("CallSid") ?? params.CallSid ?? "";
  const entry = sessions.get(callSid);
  if (!entry) return twimlXml(sayHangup("Session expired.", "en-IN"));
  const { session, salt, from } = entry;
  touch(callSid, { session, salt, from });
  const started = Date.now();
  const cfg = sarvamCfg();

  // --- Listen: Sarvam STT over the recording, else Twilio Gather text.
  let transcript: string;
  let sttLang: VoiceSession["lang"] = null;
  if (cfg && params.RecordingUrl) {
    const audio = await downloadRecording(params.RecordingUrl);
    const stt = audio ? await sarvamStt(cfg, audio, "turn.wav") : null;
    transcript = stt?.transcript ?? params.Digits ?? "";
    sttLang = stt?.lang ?? null;
    if (session.step === "language" && sttLang) session.lang = sttLang;
  } else {
    transcript = params.SpeechResult ?? params.Digits ?? "";
  }

  const pseudonym = await pseudonymizeCaller(sha256, from, salt);
  remember(session, "caller", transcript);
  // Muse Spark guides understanding (any Indian language) with full call
  // memory; null on any failure and the keyword detectors carry the turn.
  const guide = await guideVoiceTurn(process.env.OPENCODE_ZEN_API_KEY ?? "", {
    transcript,
    step: session.step,
    currentLang: session.lang,
    history: session.history,
  });
  const turn = await advanceVoice(session, transcript, pseudonym, { exaLookup, guide });
  remember(session, "agent", turn.reply);
  recordTurnLatency(session, Date.now() - started);
  if (latencyBreached(session)) {
    console.warn(`voice latency breach on ${callSid}: ${session.turnLatenciesMs.join(",")}`);
  }
  const lang = session.lang ?? "hi";
  // Factual answers are DB-composed in English; the speak pipeline
  // localizes. Conversational replies arrive English-first by contract.
  let reply = turn.reply;
  if (reply.startsWith("PART:") && session.slots.partKey) {
    const part = partByKey(session.slots.partKey);
    if (part) reply = partPriceLine(part);
  } else if (reply.startsWith("PRICE:") && session.slots.category) {
    reply = priceLineEn(session.slots.category);
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
  const action = `${publicBase()}/voice/turn?CallSid=${encodeURIComponent(callSid)}`;
  // Speak: Sarvam translate + voice, else Twilio <Say> fallback.
  if (cfg) {
    const spoken = await speak(cfg, reply, lang);
    if (spoken) {
      const url = `${publicBase()}/voice/audio/${spoken}`;
      if (turn.done) {
        sessions.delete(callSid);
        return twimlXml(playHangup(url));
      }
      return twimlXml(recordPlay(url, action));
    }
  }
  if (turn.done) {
    sessions.delete(callSid);
    return twimlXml(sayHangup(reply, sayLang(lang)));
  }
  return twimlXml(gatherSay(reply, action, sayLang(lang)));
});

voice.get("/voice/audio/:id", (c) => {
  const bytes = getAudio(c.req.param("id"));
  if (!bytes) return c.json({ error: "audio expired" }, 404);
  return new Response(bytes, { headers: { "content-type": "audio/wav" } });
});
