// The 7 SIH26229 datasets as typed schemas. Collector PII is minimal by
// design: id, preferred language, general area, history only.

/** 1. Material dataset — e-waste/scrap categories the classifier emits. */
export const MATERIAL_CATEGORIES = [
  "crt",
  "lcd_panel",
  "pcb",
  "cable",
  "battery",
  "motor_magnet",
  "mixed_plastics",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export interface Material {
  category: MaterialCategory;
  /** Display labels keyed by locale code (mr/hi/en). */
  label: Record<string, string>;
  hazardous: boolean;
  handlingNote: string;
}

/** 2. Price dataset — buying rates by category + location. */
export interface PriceEntry {
  category: MaterialCategory;
  location: string;
  ratePerKg: number; // INR
  updatedAt: string; // ISO timestamp
}

/** 3. Recycler dataset — authorized facilities only surface in Match. */
export interface Recycler {
  id: string;
  authorized: boolean;
  registrationStatus: "authorized" | "pending" | "suspended";
  area: string;
  lat: number;
  lng: number;
  rates: Partial<Record<MaterialCategory, number>>;
  pickupAvailable: boolean;
}

/** 4. Transaction dataset — a weighed lot offered/confirmed for handover. */
/** Phone-channel lots wait for photo/weight/GPS before any hash entry exists. */
export type TransactionStatus = "queued" | "offered" | "confirmed" | "paid" | "pending_pickup";
export interface Transaction {
  id: string; // client-generated UUID (idempotency key)
  collectorId: string;
  recyclerId: string | null;
  category: MaterialCategory;
  weightKg: number;
  estimatedValueInr: number;
  photoHash: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  timestamp: string;
  status: TransactionStatus;
  ledgerRef: string | null;
  synced: boolean;
}

/** 5. Traceability dataset — one hash-chained custody entry. */
export interface LedgerEntry {
  hash: string;
  prevHash: string;
  photoHash: string;
  weightKg: number;
  gpsLat: number | null;
  gpsLng: number | null;
  timestamp: string;
  collectorId: string;
  recyclerId: string | null;
  /** Recycler confirmation signature payload; null until confirmed. */
  confirmation: string | null;
  refCode: string;
}

/** 6. Collector dataset — minimal PII. No name/phone/address fields. */
export interface Collector {
  id: string;
  preferredLanguage: "mr" | "hi" | "en";
  generalArea: string;
  cashByDefault: boolean;
  digitalPaymentsEnabled: boolean;
}

/** 7. AI/ML training dataset — honest provenance, no solved-story claims. */
export interface TrainingSample {
  imageRef: string;
  label: MaterialCategory;
  weightKg: number;
  priceInr: number;
  location: string;
  source: string;
  /** Known limitations, e.g. "mock seed: 42 phone photos, Nagpur only". */
  limitations: string;
}
