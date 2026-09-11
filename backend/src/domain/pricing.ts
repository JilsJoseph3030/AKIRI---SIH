import type {
  MaterialCategory,
  PriceEntry,
  Recycler,
} from "./schemas.js";

/** Instant estimated value for a weighed lot. Pure + offline-safe. */
export function estimateValue(
  category: MaterialCategory,
  weightKg: number,
  prices: PriceEntry[],
  location: string,
): number {
  if (weightKg <= 0) return 0;
  const exact = prices.find(
    (p) => p.category === category && p.location === location,
  );
  const fallback = prices.find((p) => p.category === category);
  const rate = exact?.ratePerKg ?? fallback?.ratePerKg ?? 0;
  return Math.round(rate * weightKg);
}

export interface RankedRecycler extends Recycler {
  distanceKm: number;
  offeredRate: number;
  score: number;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/**
 * Rank nearby AUTHORIZED recyclers only: authorization is a filter, not a
 * score input. Score blends distance, offered rate, pickup availability.
 */
export function rankRecyclers(
  recyclers: Recycler[],
  category: MaterialCategory,
  lat: number,
  lng: number,
  maxKm = 50,
): RankedRecycler[] {
  return recyclers
    .filter((r) => r.authorized && r.registrationStatus === "authorized")
    .map((r) => {
      const distanceKm = haversineKm(lat, lng, r.lat, r.lng);
      const offeredRate = r.rates[category] ?? 0;
      const score =
        offeredRate * 2 + (r.pickupAvailable ? 25 : 0) - distanceKm * 1.5;
      return { ...r, distanceKm, offeredRate, score };
    })
    .filter((r) => r.distanceKm <= maxKm && r.offeredRate > 0)
    .sort((a, b) => b.score - a.score);
}
