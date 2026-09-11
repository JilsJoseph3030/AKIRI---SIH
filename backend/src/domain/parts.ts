import type { MaterialCategory } from "./schemas";

/**
 * Part-level rates (researched Sep 2026): components collectors actually
 * sell have their own rates, distinct from bulk category rates.
 * Unit "piece" = per-item quote; "kg" = per-kilo. Sources in `source`.
 */
export interface PartRate {
  key: string;
  label: string;
  match: string[];
  category: MaterialCategory;
  unit: "kg" | "piece";
  rateMin: number;
  rateMax: number;
  source: string;
}

export const PART_RATES: PartRate[] = [
  { key: "laptop-keyboard", label: "Laptop keyboard", match: ["keyboard", "keypad", "कीबोर्ड", "കീബോർഡ്"], category: "mixed_plastics", unit: "kg", rateMin: 25, rateMax: 40, source: "mariyappantraders: keyboard ₹25–40/kg" },
  { key: "mouse", label: "Mouse", match: ["mouse", "माउस", "മൗസ്"], category: "mixed_plastics", unit: "kg", rateMin: 25, rateMax: 40, source: "mariyappantraders: mouse ₹25–40/kg" },
  { key: "ram", label: "RAM module", match: ["ram", "memory", "रैम", "റാം"], category: "pcb", unit: "kg", rateMin: 800, rateMax: 2500, source: "urbane recyclers: RAM ₹800–2500/kg" },
  { key: "motherboard", label: "Motherboard", match: ["motherboard", "madarbord", "मदरबोर्ड", "മദർബോർഡ്"], category: "pcb", unit: "kg", rateMin: 400, rateMax: 900, source: "urbane recyclers: motherboard ₹400–900/kg" },
  { key: "hdd", label: "Hard disk", match: ["hard disk", "harddisk", "hdd", "हार्ड डिस्क", "ഹാർഡ് ഡിസ്ക്"], category: "mixed_plastics", unit: "piece", rateMin: 65, rateMax: 300, source: "indiamart ₹65/pc; generic ₹100–300/pc" },
  { key: "ssd", label: "SSD", match: ["ssd", "एसएसडी", "എസ്എസ്ഡി"], category: "pcb", unit: "piece", rateMin: 150, rateMax: 500, source: "generic: SSD ₹150–500/pc" },
  { key: "cpu", label: "Processor", match: ["processor", "cpu", " प्रोसेसर", "പ്രോസസർ"], category: "pcb", unit: "piece", rateMin: 100, rateMax: 2000, source: "generic: CPU ₹100–2000/pc" },
  { key: "laptop-battery", label: "Laptop battery", match: ["laptop battery", "लैपटॉप बैटरी", "ലാപ്ടോപ്പ് ബാറ്ററി"], category: "battery", unit: "piece", rateMin: 50, rateMax: 200, source: "generic: Li-ion pack ₹50–200/pc" },
  { key: "charger", label: "Charger / adapter", match: ["charger", "adapter", "चार्जर", "ചാർജർ"], category: "cable", unit: "piece", rateMin: 30, rateMax: 100, source: "generic: charger ₹30–100/pc" },
  { key: "laptop-full", label: "Dead laptop (full)", match: ["laptop", "notebook", "लैपटॉप", "ലാപ്ടോപ്പ്"], category: "mixed_plastics", unit: "piece", rateMin: 300, rateMax: 800, source: "urbane recyclers: dead laptop ₹300–800/pc" },
  { key: "mobile-phone", label: "Old mobile phone", match: ["mobile", "phone", "smartphone", "मोबाइल", "ഫോൺ", "മൊബൈൽ"], category: "battery", unit: "piece", rateMin: 100, rateMax: 500, source: "kabadiwala bands: phone ₹100–500/pc by condition" },
  { key: "printer", label: "Printer", match: ["printer", "प्रिंटर", "പ്രിന്റർ"], category: "mixed_plastics", unit: "kg", rateMin: 12, rateMax: 20, source: "pune recyclers: printer ~₹15/kg" },
  { key: "ups", label: "UPS / inverter unit", match: ["ups", "inverter", "यूपीएस", "ഇൻവെർട്ടർ", "യുപിഎസ്"], category: "battery", unit: "piece", rateMin: 1500, rateMax: 4500, source: "scraprates: inverter unit ₹1500–4500/pc by Ah" },
  { key: "car-battery", label: "Car battery", match: ["car battery", "गाड़ी बैटरी", "കാർ ബാറ്ററി"], category: "battery", unit: "piece", rateMin: 500, rateMax: 1500, source: "scraprates: car battery ₹500–1500/pc" },
  { key: "tv-old", label: "Old TV", match: [" tv", "television", "टीवी", "ടിവി"], category: "crt", unit: "piece", rateMin: 150, rateMax: 300, source: "pune recyclers: TV ~₹150/pc" },
];

/** Longest-keyword match wins so "laptop battery" beats "battery". */
export function lookupPart(transcript: string): PartRate | null {
  const t = transcript.toLowerCase();
  let best: PartRate | null = null;
  let bestLen = 0;
  for (const part of PART_RATES) {
    for (const word of part.match) {
      if (word.length > bestLen && t.includes(word.toLowerCase())) {
        best = part;
        bestLen = word.length;
      }
    }
  }
  return best;
}

export function partByKey(key: string): PartRate | null {
  return PART_RATES.find((p) => p.key === key) ?? null;
}

export function partPriceLine(part: PartRate): string {
  const unit = part.unit === "kg" ? "per kg" : "per piece";
  const range = part.rateMin === part.rateMax ? `${part.rateMin}` : `${part.rateMin}-${part.rateMax}`;
  return `${part.label}: ₹${range} ${unit}`;
}
