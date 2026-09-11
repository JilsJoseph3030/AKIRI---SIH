import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  confirmHandover,
  createEntry,
  verifyChain,
} from "../src/domain/trust-ledger.js";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const lot = (prevHash: string, weightKg = 2.4) => ({
  photoHash: "photo:abc123",
  weightKg,
  gpsLat: 21.15,
  gpsLng: 79.09,
  timestamp: "2026-09-11T10:00:00Z",
  collectorId: "col-01",
  recyclerId: null as string | null,
  prevHash,
});

describe("trust ledger", () => {
  it("builds a verifiable 3-entry chain with distinct ref codes", async () => {
    const e1 = await createEntry(sha256, lot(""));
    const e2 = await createEntry(sha256, lot(e1.hash, 1.1));
    const e3 = await createEntry(sha256, lot(e2.hash, 0.8));
    const chain = [e1, e2, e3];
    await expect(verifyChain(sha256, chain)).resolves.toBe(true);
    const refs = new Set(chain.map((e) => e.refCode));
    expect(refs.size).toBe(3);
  });

  it("fails verification after tampering with one field", async () => {
    const e1 = await createEntry(sha256, lot(""));
    const e2 = await createEntry(sha256, lot(e1.hash));
    const chain = [e1, e2];
    await expect(verifyChain(sha256, chain)).resolves.toBe(true);
    e1.weightKg = 99.9;
    await expect(verifyChain(sha256, chain)).resolves.toBe(false);
  });

  it("confirm-handover seals the chain and stays verifiable", async () => {
    const e1 = await createEntry(sha256, lot(""));
    const chain = [e1];
    const sealed = await confirmHandover(
      sha256,
      chain,
      "rc-nag-01",
      "2026-09-11T12:00:00Z",
    );
    chain.push(sealed);
    expect(e1.confirmation).toContain("rc-nag-01");
    await expect(verifyChain(sha256, chain)).resolves.toBe(true);
  });
});
