import NetInfo from "@react-native-community/netinfo";
import { useApp } from "./store";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const MOCK = (process.env.EXPO_PUBLIC_API_MOCK ?? "true") === "true";

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
        headers: { "content-type": "application/json" },
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`lot upload failed: ${res.status}`);
  const tx = (await res.json()) as { ledgerRef: string | null };
  return { ledgerRef: tx.ledgerRef ?? "" };
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
