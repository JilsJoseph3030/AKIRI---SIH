// Minimal TwiML builder. Escapes caller-influenced text; never interpolates
// raw transcripts into XML without escaping.

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SayLang = "hi-IN" | "mr-IN" | "en-IN";

export function sayLang(lang: "hi" | "mr" | "en"): SayLang {
  return lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
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
