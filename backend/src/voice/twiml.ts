// Minimal TwiML builder. Escapes caller-influenced text; never interpolates
// raw transcripts into XML without escaping.

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SayLang = "hi-IN" | "en-IN" | "ml-IN";

/**
 * TTS locale per call language. Malayalam uses Twilio's Google Wavenet
 * ml-IN voice (GA per Twilio changelog); English keeps en-IN; everything
 * else falls back to hi-IN (best-effort, noted in docs).
 */
export function sayLang(lang: string): SayLang {
  if (lang === "en") return "en-IN";
  if (lang === "ml") return "ml-IN";
  return "hi-IN";
}

/** Extra voice for <Say> when the locale needs an explicit voice name. */
export function sayVoice(lang: SayLang): string | null {
  return lang === "ml-IN" ? "Google.ml-IN-Wavenet-A" : null;
}

function sayVerb(text: string, lang: SayLang): string {
  const voice = sayVoice(lang);
  const voiceAttr = voice ? ` voice="${voice}"` : "";
  return `<Say language="${lang}"${voiceAttr}>${esc(text)}</Say>`;
}

export interface GatherOpts {
  input?: "speech" | "dtmf speech";
  /** Full-listen turns: prompt plays to the end, caller can't cut it off. */
  bargeIn?: boolean;
  /** Seconds of silence before Twilio submits. Integer (not "auto") so
   *  slow/hesitant speakers are never cut off at the first pause. */
  speechTimeout?: number;
  timeout?: number;
}

export function gatherSay(
  text: string,
  action: string,
  lang: SayLang,
  opts: GatherOpts = {},
): string {
  const input = opts.input ?? "speech dtmf";
  const timeout = opts.timeout ?? 10;
  const speechTimeout = opts.speechTimeout ?? 3;
  const bargeIn = opts.bargeIn ?? false;
  return (
    `<Response><Gather input="${input}" action="${esc(action)}" ` +
    `method="POST" timeout="${timeout}" language="${lang}" ` +
    `speechTimeout="${speechTimeout}" bargeIn="${bargeIn}">` +
    sayVerb(text, lang) +
    `</Gather><Redirect method="POST">${esc(action)}?empty=1</Redirect></Response>`
  );
}

export function sayHangup(text: string, lang: SayLang): string {
  return `<Response>${sayVerb(text, lang)}<Hangup/></Response>`;
}

export function twimlXml(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/xml" } });
}
