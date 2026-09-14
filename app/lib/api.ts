import NetInfo from "@react-native-community/netinfo";
import { useApp } from "./store";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const MOCK = (process.env.EXPO_PUBLIC_API_MOCK ?? "true") === "true";

/**
 * ngrok free tier serves a browser-warning interstitial unless this header
 * is present — without it API calls get HTML instead of JSON.
 */
function headers(): Record<string, string> {
  return {
    "content-type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
}

/**
 * Typed API client. Mock fixtures serve the demo when the backend is not
 * reachable; set EXPO_PUBLIC_API_MOCK=false to force live calls.
 */
export async function postLot(input: {
  id: string;
  collectorId: string;
  category: string;
  weightKg: number;
  photoHash?: string;
}): Promise<{ ledgerRef: string }> {
  if (MOCK) {
    try {
      const res = await fetch(`${BASE}/lots`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const tx = (await res.json()) as { ledgerRef: string | null };
        if (tx.ledgerRef) return { ledgerRef: tx.ledgerRef };
      }
    } catch {
      // fall through to local-only mock below
    }
    return { ledgerRef: `MOCK-${input.id.slice(-6).toUpperCase()}` };
  }
  const res = await fetch(`${BASE}/lots`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`lot upload failed: ${res.status}`);
  const tx = (await res.json()) as { ledgerRef: string | null };
  return { ledgerRef: tx.ledgerRef ?? "" };
}

export interface ScanResult {
  category: string;
  partKey: string | null;
  partLabel: string | null;
  modelHint: string | null;
  confidence: number;
  priceText: string;
  estimatedValueInr: number | null;
  ledgerRef: string | null;
  source: string;
  nearby: { id: string; area: string; lat: number; lng: number; distanceKm: number; offeredRate: number }[];
}

interface VisionPayload {
  category: unknown;
  partKey: unknown;
  modelHint: unknown;
  confidence: unknown;
  priceText: unknown;
  estimatedValueInr: unknown;
  source: unknown;
}

function isVisionPayload(value: unknown): value is VisionPayload {
  return !!value && typeof value === "object" && "category" in value;
}

function strField(obj: object, key: string): string | null {
  if (!(key in obj)) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function numField(obj: object, key: string): number | null {
  if (!(key in obj)) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "number" ? v : null;
}

function isScanResult(raw: unknown): raw is {
  lot: { category: string; estimatedValueInr: number; ledgerRef: string | null };
  vision: VisionPayload | null;
  nearby: ScanResult["nearby"];
} {
  if (!raw || typeof raw !== "object") return false;
  if (!("lot" in raw) || !("nearby" in raw) || !("vision" in raw)) return false;
  const lot = (raw as { lot: unknown }).lot;
  if (!lot || typeof lot !== "object" || !("category" in lot)) return false;
  const vision = (raw as { vision: unknown }).vision;
  if (vision !== null && !isVisionPayload(vision)) return false;
  return Array.isArray((raw as { nearby: unknown }).nearby);
}

/** Vision scan: photo → model + Exa identification + researched price + nearby centers. */
export async function identifyScan(input: {
  id: string;
  collectorId: string;
  imageBase64: string;
  weightKg: number;
  hint?: string;
  lat?: number;
  lng?: number;
}): Promise<ScanResult | null> {
  try {
    const res = await fetch(`${BASE}/vision/identify`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (!isScanResult(raw)) return null;
    const v = raw.vision;
    return {
      category: v ? (strField(v, "category") ?? String(raw.lot.category)) : String(raw.lot.category),
      partKey: v ? strField(v, "partKey") : null,
      partLabel: null,
      modelHint: v ? strField(v, "modelHint") : null,
      confidence: v ? (numField(v, "confidence") ?? 0) : 0,
      priceText: v ? (strField(v, "priceText") ?? "") : "",
      estimatedValueInr: typeof raw.lot.estimatedValueInr === "number" ? raw.lot.estimatedValueInr : null,
      ledgerRef: typeof raw.lot.ledgerRef === "string" ? raw.lot.ledgerRef : null,
      source: v ? (strField(v, "source") ?? "model") : "mock",
      nearby: raw.nearby,
    };
  } catch {
    return null;
  }
}

/** Flush unsynced lots when connectivity returns. */
export function watchConnectivity(onChange: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    const online = !!state.isConnected;
    useApp.getState().setOnline(online);
    onChange(online);
  });
}

export async function flushQueue(): Promise<void> {
  const { lots, markSynced } = useApp.getState();
  for (const lot of lots.filter((l) => !l.synced)) {
    try {
      await postLot({
        id: lot.id,
        collectorId: "col-device",
        category: lot.category,
        weightKg: lot.weightKg,
      });
      markSynced(lot.id);
    } catch {
      break; // stay queued, retry on next reconnect
    }
  }
}
