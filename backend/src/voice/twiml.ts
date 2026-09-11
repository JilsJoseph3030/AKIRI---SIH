// Minimal TwiML builder. Escapes caller-influenced text; never interpolates
// raw transcripts into XML without escaping.

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
export type SayLang = "hi-IN" | "en-IN";

/** Twilio <Say> coverage for Indic locales is uneven: English keeps its
 *  voice, everything else uses Hindi-IN (best-effort, noted in docs). */
export function sayLang(lang: string): SayLang {
  return lang === "en" ? "en-IN" : "hi-IN";
}

export function gatherSay(
  text: string,
  action: string,
  lang: SayLang,
  opts: { input?: "speech" | "dtmf speech"; timeout?: number } = {},
): string {
  const input = opts.input ?? "speech dtmf";
  const timeout = opts.timeout ?? 5;
  return (
    `<Response><Gather input="${input}" action="${esc(action)}" ` +
    `method="POST" timeout="${timeout}" language="${lang}" speechTimeout="auto">` +
    `<Say language="${lang}">${esc(text)}</Say>` +
    `</Gather><Redirect method="POST">${esc(action)}?empty=1</Redirect></Response>`
  );
}

export function sayHangup(text: string, lang: SayLang): string {
  return `<Response><Say language="${lang}">${esc(text)}</Say><Hangup/></Response>`;
}

export function twimlXml(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/xml" } });
}
