import type { LedgerEntry } from "./schemas";

/** Hash function injected per platform (expo-crypto / node:crypto). */
export type HashFn = (input: string) => Promise<string> | string;

export interface LotInput {
  photoHash: string;
  weightKg: number;
  gpsLat: number | null;
  gpsLng: number | null;
  timestamp: string;
  collectorId: string;
  recyclerId: string | null;
  prevHash: string;
}

export const GENESIS = "GENESIS";

function canonical(input: LotInput): string {
  return [
    input.photoHash,
    input.weightKg,
    input.gpsLat ?? "",
    input.gpsLng ?? "",
    input.timestamp,
    input.collectorId,
    input.recyclerId ?? "",
    input.prevHash || GENESIS,
  ].join("|");
}

/** entry_hash = SHA256(photo_hash|weight|lat|lng|timestamp|collector|recycler|prev) */
export async function createEntry(
  hash: HashFn,
  input: LotInput,
): Promise<LedgerEntry> {
  const entryHash = await hash(canonical({ ...input }));
  return {
    hash: entryHash,
    prevHash: input.prevHash || GENESIS,
    photoHash: input.photoHash,
    weightKg: input.weightKg,
    gpsLat: input.gpsLat,
    gpsLng: input.gpsLng,
    timestamp: input.timestamp,
    collectorId: input.collectorId,
    recyclerId: input.recyclerId,
    confirmation: null,
    refCode: toRefCode(entryHash),
  };
}

/** Short human-shareable reference: base32 of first 5 hash bytes. */
export function toRefCode(hashHex: string): string {
  const bytes = hashHex
    .slice(0, 10)
    .match(/../g)!
    .map((b) => parseInt(b, 16));
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford: no I/L/O/U
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(value >>> bits) & 31];
    }
  }
  return out;
}

/**
 * Recycler "confirm handover": appends a confirmation entry chained onto
 * the previous hash, sealing the chain across both sides. The confirmed
 * entry keeps its original hash inputs untouched — the seal lives in the
 * new entry, so verification never depends on mutation order.
 */
export async function confirmHandover(
  hash: HashFn,
  chain: LedgerEntry[],
  recyclerId: string,
  confirmedAt: string,
): Promise<LedgerEntry> {
  const prev = chain[chain.length - 1];
  if (!prev) throw new Error("empty chain: nothing to confirm");
  prev.confirmation = `confirmed-by:${recyclerId}@${confirmedAt}`;
  return createEntry(hash, {
    photoHash: `confirmation:${prev.hash}`,
    weightKg: prev.weightKg,
    gpsLat: prev.gpsLat,
    gpsLng: prev.gpsLng,
    timestamp: confirmedAt,
    collectorId: prev.collectorId,
    recyclerId,
    prevHash: prev.hash,
  });
}

/** Recomputes every link; returns false on any tamper or broken link. */
export async function verifyChain(
  hash: HashFn,
  chain: LedgerEntry[],
): Promise<boolean> {
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (i === 0 ? e.prevHash !== GENESIS : e.prevHash !== chain[i - 1].hash)
      return false;
    const recomputed = await hash(
      canonical({
        photoHash: e.photoHash,
        weightKg: e.weightKg,
        gpsLat: e.gpsLat,
        gpsLng: e.gpsLng,
        timestamp: e.timestamp,
        collectorId: e.collectorId,
        recyclerId: e.recyclerId,
        prevHash: e.prevHash,
      }),
    );
    if (recomputed !== e.hash) return false;
    if (toRefCode(e.hash) !== e.refCode) return false;
  }
  return true;
}

// TODO: anchor chain root to CPCB-compatible format
