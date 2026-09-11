import { createHash } from "node:crypto";
import {
  sarvamLocale,
  sarvamTranslate,
  sarvamTts,
} from "./sarvam";
import type { SarvamConfig } from "./sarvam";

/** Rendered prompt audio, keyed by sha1(text+locale). Memory-only. */
const audioCache = new Map<string, Buffer>();
const AUDIO_CAP = 200;

export function audioId(text: string, locale: string): string {
  return createHash("sha1").update(`${locale}:${text}`).digest("hex").slice(0, 16);
}

export function getAudio(id: string): Buffer | null {
  return audioCache.get(id) ?? null;
}

function putAudio(id: string, bytes: Buffer): void {
  audioCache.set(id, bytes);
  while (audioCache.size > AUDIO_CAP) {
    const oldest = audioCache.keys().next().value;
    if (oldest === undefined) break;
    audioCache.delete(oldest);
  }
}

/**
 * English-first speech: translate to the caller's language, voice it in
 * the matching locale. Any failure degrades toward English (always
 * intelligible) — never toward a mismatched script/voice pair.
 * Returns the playable audio id, or null when Sarvam is unusable.
 */
export async function speak(
  cfg: SarvamConfig,
  textEn: string,
  lang: string,
): Promise<string | null> {
  const translated = await sarvamTranslate(cfg, textEn, lang);
  const locale = translated ? sarvamLocale(lang) : "en-IN";
  const audio = await sarvamTts(cfg, translated ?? textEn, locale);
  if (!audio) return null;
  const id = audioId(translated ?? textEn, locale);
  putAudio(id, audio);
  return id;
}
