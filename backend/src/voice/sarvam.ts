import type { VoiceLang } from "../domain/voice";

const STT_URL = "https://api.sarvam.ai/speech-to-text";
const TTS_URL = "https://api.sarvam.ai/text-to-speech";

const KNOWN_LANGS = ["hi", "mr", "en", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "as", "ur"] as const;

/** "ml-IN" → "ml"; unknown prefixes degrade to null (keyword fallback). */
export function mapSarvamLang(code: unknown): VoiceLang | null {
  if (typeof code !== "string") return null;
  const prefix = code.split("-")[0]?.toLowerCase() ?? "";
  return (KNOWN_LANGS as readonly string[]).includes(prefix)
    ? (prefix as VoiceLang)
    : null;
}

export interface SarvamConfig {
  apiKey: string;
  sttModel?: string;
  ttsModel?: string;
  speaker?: string;
}

export interface SttResult {
  transcript: string;
  lang: VoiceLang | null;
  rawLanguageCode: string;
}

export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: unknown },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Saarika STT with automatic language identification. */
export async function sarvamStt(
  cfg: SarvamConfig,
  audio: Blob,
  filename: string,
  fetchFn: FetchFn = defaultFetch,
): Promise<SttResult | null> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", cfg.sttModel ?? "saarika:v2.5");
  try {
    const res = await fetchFn(STT_URL, {
      method: "POST",
      headers: { "api-subscription-key": cfg.apiKey },
      body: form,
    });
    if (!res.ok) {
      console.warn(`sarvam stt HTTP ${res.status}`);
      return null;
    }
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("transcript" in data)) return null;
    const transcript = typeof data.transcript === "string" ? data.transcript : "";
    if (!transcript.trim()) return null;
    const raw = "language_code" in data && typeof data.language_code === "string"
      ? data.language_code
      : "";
    return { transcript, lang: mapSarvamLang(raw), rawLanguageCode: raw };
  } catch {
    return null;
  }
}

/** Bulbul TTS at telephony rate. Returns raw audio bytes (WAV). */
export async function sarvamTts(
  cfg: SarvamConfig,
  text: string,
  targetLanguageCode: string,
  fetchFn: FetchFn = defaultFetch,
): Promise<Buffer | null> {
  try {
    const res = await fetchFn(TTS_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": cfg.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        target_language_code: targetLanguageCode,
        speaker: cfg.speaker ?? "anand",
        model: cfg.ttsModel ?? "bulbul:v3",
        speech_sample_rate: 8000,
      }),
    });
    if (!res.ok) {
      console.warn(`sarvam tts HTTP ${res.status}`);
      return null;
    }
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("audios" in data) || !Array.isArray(data.audios)) {
      return null;
    }
    const first: unknown = data.audios[0];
    if (typeof first !== "string" || first.length === 0) return null;
    return Buffer.from(first, "base64");
  } catch {
    return null;
  }
}

const defaultFetch: FetchFn = (url, init) =>
  fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body as FormData,
  }).then((res) => ({
    ok: res.ok,
    status: res.status,
    json: () => res.json() as Promise<unknown>,
  }));
