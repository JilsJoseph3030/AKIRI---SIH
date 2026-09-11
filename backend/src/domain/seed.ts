import type {
  Material,
  PriceEntry,
  Recycler,
  TrainingSample,
} from "./schemas.js";

export const MATERIALS: Material[] = [
  { category: "crt", label: { en: "CRT monitor", hi: "सीआरटी मॉनिटर", mr: "सीआरटी मॉनिटर" }, hazardous: true, handlingNote: "Do not break the tube — leaded glass. Keep dry, hand over intact." },
  { category: "lcd_panel", label: { en: "LCD panel", hi: "एलसीडी पैनल", mr: "एलसीडी पॅनेल" }, hazardous: true, handlingNote: "Cracked backlights may contain mercury. Do not crush." },
  { category: "pcb", label: { en: "Circuit board (PCB)", hi: "सर्किट बोर्ड", mr: "सर्किट बोर्ड" }, hazardous: true, handlingNote: "Keep whole. No open burning to recover metal." },
  { category: "cable", label: { en: "Cables / wires", hi: "तार / केबल", mr: "तारा / केबल" }, hazardous: false, handlingNote: "Do not burn insulation to strip copper." },
  { category: "battery", label: { en: "Battery", hi: "बैटरी", mr: "बॅटरी" }, hazardous: true, handlingNote: "Tape terminals, keep away from heat and metal. Never puncture." },
  { category: "motor_magnet", label: { en: "Motor / magnet assembly", hi: "मोटर / चुंबक", mr: "मोटर / चुंबक" }, hazardous: false, handlingNote: "Heavy — lift with care. Keep magnets away from phones." },
  { category: "mixed_plastics", label: { en: "Mixed plastics", hi: "मिश्रित प्लास्टिक", mr: "मिश्र प्लास्टिक" }, hazardous: false, handlingNote: "Keep e-plastic separate from food containers." },
];

/** Fixture buying rates (INR/kg). Replace with live board via /prices sync. */
export const PRICES: PriceEntry[] = [
  { category: "pcb", location: "Nagpur", ratePerKg: 320, updatedAt: "2026-09-01T06:00:00Z" },
  { category: "cable", location: "Nagpur", ratePerKg: 180, updatedAt: "2026-09-01T06:00:00Z" },
  { category: "battery", location: "Nagpur", ratePerKg: 140, updatedAt: "2026-09-01T06:00:00Z" },
  { category: "motor_magnet", location: "Nagpur", ratePerKg: 120, updatedAt: "2026-09-01T06:00:00Z" },
  { category: "lcd_panel", location: "Nagpur", ratePerKg: 60, updatedAt: "2026-09-01T06:00:00Z" },
  { category: "crt", location: "Nagpur", ratePerKg: 25, updatedAt: "2026-09-01T06:00:00Z" },
  { category: "mixed_plastics", location: "Nagpur", ratePerKg: 18, updatedAt: "2026-09-01T06:00:00Z" },
];

export const RECYCLERS: Recycler[] = [
  {
    id: "rc-nag-01", authorized: true, registrationStatus: "authorized",
    area: "MIDC Hingna, Nagpur", lat: 21.12, lng: 78.98,
    rates: { pcb: 330, cable: 185, battery: 145, motor_magnet: 125, lcd_panel: 62, crt: 28, mixed_plastics: 20 },
    pickupAvailable: true,
  },
  {
    id: "rc-nag-02", authorized: true, registrationStatus: "authorized",
    area: "Butibori, Nagpur", lat: 20.93, lng: 78.79,
    rates: { pcb: 310, cable: 175, battery: 150, motor_magnet: 118, lcd_panel: 58, crt: 24, mixed_plastics: 17 },
    pickupAvailable: false,
  },
  {
    id: "rc-nag-03", authorized: false, registrationStatus: "pending",
    area: "Kamptee Road", lat: 21.18, lng: 79.1,
    rates: { pcb: 400, cable: 220 },
    pickupAvailable: true,
  },
];

/** Honest seed: tiny mock set, limitations stated, not a solved dataset. */
export const TRAINING_SAMPLES: TrainingSample[] = [
  {
    imageRef: "seed/pcb-001.jpg", label: "pcb", weightKg: 2.4,
    priceInr: 768, location: "Nagpur", source: "mock seed fixture",
    limitations: "mock seed: rule-based mock classifier, no real photos yet; target 500+ field photos across 3 cities before on-device TFLite",
  },
];
