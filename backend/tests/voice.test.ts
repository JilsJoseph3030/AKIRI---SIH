import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  advanceVoice,
  detectCategory,
  detectIntent,
  detectLanguage,
  exaAttribution,
  isNo,
  isYes,
  latencyBreached,
  newVoiceSession,
  parseWeightKg,
  pseudonymizeCaller,
  recordTurnLatency,
  safetyBrief,
} from "../src/domain/voice";
import {
  computeTwilioSignature,
  validTwilioSignature,
} from "../src/voice/signature";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const noopExa = async () => null;

describe("twilio signature validation", () => {
  const token = "test-auth-token";
  const url = "https://example.com/voice/turn";
  const params = { CallSid: "CA123", From: "+919876543210" };

  it("accepts a correctly computed signature", () => {
    const sig = computeTwilioSignature(token, url, params);
    expect(validTwilioSignature(token, sig, url, params)).toBe(true);
  });

  it("rejects forged, empty, and tampered requests", () => {
    const sig = computeTwilioSignature(token, url, params);
    expect(validTwilioSignature(token, "forged", url, params)).toBe(false);
    expect(validTwilioSignature(token, "", url, params)).toBe(false);
    expect(
      validTwilioSignature(token, sig, url, { ...params, From: "+911111111111" }),
    ).toBe(false);
    expect(validTwilioSignature(token, sig, url + "?x=1", params)).toBe(false);
  });
});

describe("language + intent detection (hi/mr/en)", () => {
  it("picks language from voice response", () => {
    expect(detectLanguage("mala marathi pahije")).toBe("mr");
    expect(detectLanguage("mujhe hindi chahiye")).toBe("hi");
    expect(detectLanguage("english please")).toBe("en");
    expect(detectLanguage("hello")).toBe(null);
  });

  it("constrains to exactly the 3 flows plus human fallback", () => {
    expect(detectIntent("aaj ka bhaav kya hai")).toBe("price");
    expect(detectIntent("pickup karayche aahe")).toBe("pickup");
    expect(detectIntent("battery suraksha")).toBe("safety");
    expect(detectIntent("weather kaisa hai")).toBe("human");
  });
});

describe("price flow in Hindi", () => {
  it("walks language → intent → category", async () => {
    const s = newVoiceSession("CA1");
    let t = await advanceVoice(s, "hindi", "voice:abc", { exaLookup: noopExa });
    expect(s.lang).toBe("hi");
    t = await advanceVoice(s, "bhaav batao", "voice:abc", { exaLookup: noopExa });
    expect(s.intent).toBe("price");
    t = await advanceVoice(s, "battery ka", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(true);
    expect(t.reply).toContain("PRICE:battery");
    expect(t.write).toBeUndefined(); // read-only flow writes nothing
  });
});

describe("pickup flow in Marathi with confirm-back", () => {
  it("writes only after explicit yes", async () => {
    const s = newVoiceSession("CA2");
    await advanceVoice(s, "marathi", "voice:abc", { exaLookup: noopExa });
    await advanceVoice(s, "pickup karayche", "voice:abc", { exaLookup: noopExa });
    const t = await advanceVoice(s, "battery 5 kilo", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(false);
    expect(t.write).toBeUndefined();
    expect(s.slots).toMatchObject({ category: "battery", weightKg: 5 });
    const done = await advanceVoice(s, "ho", "voice:abc", { exaLookup: noopExa });
    expect(done.done).toBe(true);
    expect(done.write?.slots.category).toBe("battery");
  });

  it("'no' at confirmation aborts the write and re-prompts", async () => {
    const s = newVoiceSession("CA3");
    await advanceVoice(s, "hindi", "voice:abc", { exaLookup: noopExa });
    await advanceVoice(s, "pickup", "voice:abc", { exaLookup: noopExa });
    await advanceVoice(s, "cable 2 kilo", "voice:abc", { exaLookup: noopExa });
    const t = await advanceVoice(s, "nahi, galat hai", "voice:abc", { exaLookup: noopExa });
    expect(t.write).toBeUndefined();
    expect(t.done).toBe(false);
    expect(s.step).toBe("slot");
    expect(s.slots).toEqual({});
  });
});

describe("vague material via Exa", () => {
  it("confirms the Exa proposal; rejection logs uncategorized for review", async () => {
    const exa = async () => ({ category: "pcb" as const, evidence: "green board with chips" });
    const s = newVoiceSession("CA4");
    await advanceVoice(s, "english", "voice:abc", { exaLookup: exa });
    await advanceVoice(s, "pickup please", "voice:abc", { exaLookup: exa });
    const t = await advanceVoice(s, "flat green thing with small chips", "voice:abc", { exaLookup: exa });
    expect(t.reply).toContain("pcb");
    const no = await advanceVoice(s, "no, wrong", "voice:abc", { exaLookup: exa });
    expect(no.write).toBeUndefined(); // rejected guess is never logged as a category
    const retry = await advanceVoice(s, "just take it as mixed", "voice:abc", {
      exaLookup: async () => null,
    });
    expect(retry.done).toBe(false); // confirm-back for the generic entry
    const yes = await advanceVoice(s, "yes", "voice:abc", { exaLookup: async () => null });
    expect(yes.write?.slots.uncategorized).toBe(true);
    expect(yes.write?.slots.needsReview).toBe(true);
    expect(exaAttribution("flat green thing", "green board with chips")).toContain("voice-channel exa lookup");
  });
});

describe("safety flow reuses app content", () => {
  it("reads the same handling note in Marathi", async () => {
    const s = newVoiceSession("CA5");
    await advanceVoice(s, "marathi", "voice:abc", { exaLookup: noopExa });
    await advanceVoice(s, "suraksha mahiti", "voice:abc", { exaLookup: noopExa });
    const t = await advanceVoice(s, "battery", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(true);
    expect(t.reply).toContain("बॅटरी");
  });

  it("detects categories and weights from transliterated speech", () => {
    expect(detectCategory("mere paas taar hai")).toBe("cable");
    expect(parseWeightKg("lagbhag 2.5 kilo")).toBe(2.5);
    expect(parseWeightKg("pata nahi")).toBe(null);
    expect(isYes("haanji sahi hai")).toBe(true);
    expect(isNo("nahi chahiye")).toBe(true);
    expect(safetyBrief("battery", "en")).toContain("Tape");
  });
});

describe("privacy + ledger integrity + latency", () => {
  it("pseudonymizes the caller and never exposes the raw number", async () => {
    const pseudo = await pseudonymizeCaller(sha256, "+919876543210", "salt");
    expect(pseudo.startsWith("voice:")).toBe(true);
    expect(pseudo).not.toContain("9876543210");
    const again = await pseudonymizeCaller(sha256, "+919876543210", "salt");
    expect(again).toBe(pseudo); // stable for repeat callers, same handset
  });

  it("flags flows breaching ~5s/turn", () => {
    const s = newVoiceSession("CA6");
    recordTurnLatency(s, 1200);
    recordTurnLatency(s, 6100);
    expect(latencyBreached(s)).toBe(true);
    const ok = newVoiceSession("CA7");
    recordTurnLatency(ok, 900);
    recordTurnLatency(ok, 1100);
    expect(latencyBreached(ok)).toBe(false);
  });
});

describe("voice HTTP routes", () => {
  it("seals nothing: phone pickup writes a pending lot with no chain entry", async () => {
    process.env.TWILIO_AUTH_TOKEN = "route-test-token";
    process.env.VOICE_PUBLIC_BASE_URL = "https://voice.example.com";
    process.env.VOICE_SALT = "test-salt";
    const { app } = await import("../src/server");
    const { chains, lots } = await import("../src/store");
    const callSid = "CA-route-1";
    const post = async (path: string, params: Record<string, string>) => {
      const url = `https://voice.example.com${path}`;
      const body = new URLSearchParams(params).toString();
      const sig = computeTwilioSignature("route-test-token", url, params);
      return app.request(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-twilio-signature": sig,
        },
        body,
      });
    };
    const base = { CallSid: callSid, From: "+919999999999" };
    let res = await post("/voice/incoming", base);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<Gather");
    res = await post("/voice/turn?CallSid=CA-route-1", { ...base, SpeechResult: "hindi" });
    expect(res.status).toBe(200);
    res = await post("/voice/turn?CallSid=CA-route-1", { ...base, SpeechResult: "pickup karna hai" });
    expect(res.status).toBe(200);
    res = await post("/voice/turn?CallSid=CA-route-1", { ...base, SpeechResult: "battery 3 kilo" });
    expect(res.status).toBe(200);
    // Unsigned twin of the same request is rejected before any state change.
    const forged = await app.request("https://voice.example.com/voice/turn?CallSid=CA-route-1", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...base, SpeechResult: "haan" }).toString(),
    });
    expect(forged.status).toBe(403);
    res = await post("/voice/turn?CallSid=CA-route-1", { ...base, SpeechResult: "haan sahi hai" });
    expect(await res.text()).toContain("<Hangup");
    const tx = lots.get(`voice-${callSid}`);
    expect(tx?.status).toBe("pending_pickup");
    expect(tx?.photoHash).toBe(null);
    expect(tx?.collectorId.startsWith("voice:")).toBe(true);
    expect(tx?.collectorId).not.toContain("9999999999");
    expect(chains.get(`voice-${callSid}`)).toBeUndefined();
    lots.delete(`voice-${callSid}`);
    delete process.env.TWILIO_AUTH_TOKEN;
  });
});

describe("muse spark guide", () => {
  it("uses the verified contributor-free model id", async () => {
    const { VOICE_AGENT_MODEL, VOICE_AGENT_ENDPOINT } = await import("../src/voice/guide");
    expect(VOICE_AGENT_MODEL).toBe("muse-spark-1.3-contributor-free");
    expect(VOICE_AGENT_ENDPOINT).toBe("https://opencode.ai/zen/v1/responses");
  });

  it("parses strict output and rejects off-schema guesses", async () => {
    const { parseGuideResult } = await import("../src/voice/guide");
    expect(
      parseGuideResult({ lang: "ta", intent: "price", category: "battery", weightKg: 3, confirm: null }),
    ).toEqual({ lang: "ta", intent: "price", category: "battery", weightKg: 3, confirm: null });
    expect(parseGuideResult({ lang: "ta", intent: "price", category: "gold-bars", weightKg: 3, confirm: null })).toBe(null);
    expect(parseGuideResult({ lang: "xx", intent: "price", category: null, weightKg: null, confirm: null })).toBe(null);
    expect(parseGuideResult({ lang: "hi", intent: "dance", category: null, weightKg: null, confirm: null })).toBe(null);
    expect(parseGuideResult(null)).toBe(null);
  });

  it("returns null without a key or on fetch failure (keyword fallback)", async () => {
    const { guideVoiceTurn } = await import("../src/voice/guide");
    const ctx = { transcript: "x", step: "intent", currentLang: null };
    await expect(guideVoiceTurn("", ctx)).resolves.toBe(null);
    await expect(
      guideVoiceTurn("k", ctx, async () => {
        throw new Error("down");
      }),
    ).resolves.toBe(null);
    await expect(
      guideVoiceTurn("k", ctx, async () => ({ ok: false, status: 500, json: async () => ({}) })),
    ).resolves.toBe(null);
  });

  it("guides a Tamil turn through the state machine", async () => {
    const { guideVoiceTurn } = await import("../src/voice/guide");
    const stub = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        output_text: '{"lang":"ta","intent":"price","category":"battery","weightKg":null,"confirm":null}',
      }),
    });
    const guide = await guideVoiceTurn("k", { transcript: "battery vilai", step: "slot", currentLang: "ta" }, stub);
    expect(guide?.category).toBe("battery");
    const s = newVoiceSession("CA-ta");
    s.lang = "ta";
    s.intent = "price";
    s.step = "slot";
    const t = await advanceVoice(s, "battery vilai enna", "voice:abc", { exaLookup: noopExa, guide });
    expect(t.done).toBe(true);
    expect(t.reply).toContain("PRICE:battery");
  });

  it("detects major Indian languages at the language step", () => {
    expect(detectLanguage("bangla bolbo")).toBe("bn");
    expect(detectLanguage("tamil pesuven")).toBe("ta");
    expect(detectLanguage("nenu telugu matladutanu")).toBe("te");
    expect(detectLanguage("gujarati bolu chhu")).toBe("gu");
    expect(detectLanguage("punjabi chahidi")).toBe("pa");
  });

  it("quotes researched collector rates in the price table", async () => {
    const { priceTableText } = await import("../src/voice/guide");
    const text = priceTableText();
    expect(text).toContain("battery: collector 140-140");
    expect(text).toContain("pcb: collector 320-320");
    expect(text).toContain("market ref");
  });
});

describe("malayalam support and full-listen turns", () => {
  it("walks a Malayalam price flow with scripted replies", async () => {
    const s = newVoiceSession("CA-ml");
    let t = await advanceVoice(s, "malayalam samsarikkamo", "voice:abc", { exaLookup: noopExa });
    expect(s.lang).toBe("ml");
    expect(t.reply).toContain("Ningalkku enthu venam");
    t = await advanceVoice(s, "vila ariyano", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(false);
    t = await advanceVoice(s, "battery", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(true);
    expect(t.reply).toContain("PRICE:battery");
  });

  it("emits full-listen gather attributes and ml-IN wavenet voice", async () => {
    const { gatherSay, sayHangup, sayLang } = await import("../src/voice/twiml");
    const xml = gatherSay("Ningalkku enthu venam?", "https://x.test/voice/turn", sayLang("ml"));
    expect(sayLang("ml")).toBe("ml-IN");
    expect(xml).toContain('language="ml-IN"');
    expect(xml).toContain('voice="Google.ml-IN-Wavenet-A"');
    expect(xml).toContain('bargeIn="false"');
    expect(xml).toContain('speechTimeout="3"');
    expect(xml).toContain('timeout="10"');
    expect(sayHangup("Nanni!", sayLang("ml"))).toContain("ml-IN");
    expect(sayLang("ta")).toBe("hi-IN");
  });

  it("confirms back in Malayalam and honors athe/alla", async () => {
    const s = newVoiceSession("CA-ml2");
    await advanceVoice(s, "malayalam", "voice:abc", { exaLookup: noopExa });
    await advanceVoice(s, "pickup vende", "voice:abc", { exaLookup: noopExa });
    const t = await advanceVoice(s, "battery 2 kilo", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(false);
    expect(isYes("athe sheriyanu")).toBe(true);
    expect(isNo("alla veda")).toBe(true);
    const done = await advanceVoice(s, "athe", "voice:abc", { exaLookup: noopExa });
    expect(done.done).toBe(true);
    expect(done.write?.slots.category).toBe("battery");
  });
});

describe("resilient call flow (no premature hangup)", () => {
  it("maps DTMF digits to languages", async () => {
    for (const [digit, lang] of [["1", "hi"], ["2", "mr"], ["3", "en"], ["4", "ml"]] as const) {
      const s = newVoiceSession(`CA-d${digit}`);
      const t = await advanceVoice(s, digit, "voice:abc", { exaLookup: noopExa });
      expect(s.lang).toBe(lang);
      expect(t.done).toBe(false);
    }
  });

  it("reprompts garbled intents twice before human fallback", async () => {
    const s = newVoiceSession("CA-retry");
    await advanceVoice(s, "1", "voice:abc", { exaLookup: noopExa });
    let t = await advanceVoice(s, "weather kaisa hai", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(false); // first garble: reprompt, NOT hangup
    t = await advanceVoice(s, "cricket score", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(false); // second garble: reprompt again
    t = await advanceVoice(s, "film ka gana", "voice:abc", { exaLookup: noopExa });
    expect(t.done).toBe(true); // third strike: human redirect + close
    expect(s.intent).toBe("human");
  });

  it("understood intents never touch the retry path", async () => {
    const s = newVoiceSession("CA-ok");
    await advanceVoice(s, "hindi", "voice:abc", { exaLookup: noopExa });
    const t = await advanceVoice(s, "bhaav batao", "voice:abc", { exaLookup: noopExa });
    expect(s.intent).toBe("price");
    expect(t.done).toBe(false);
    expect(s.intentRetries).toBe(0);
  });
});
