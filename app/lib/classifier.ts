import type { MaterialCategory } from "@akiri/backend/domain";

/**
 * Production-shaped classifier seam. Swap MockClassifier for a real
 * on-device TFLite model by implementing this interface — UI code
 * never changes.
 */
export interface Classification {
  category: MaterialCategory;
  confidence: number;
}

export interface ClassifierService {
  classify(photoUri: string): Promise<Classification[]>;
}

/** Rule-based stand-in: keyword match on URI, plausible fallback ranking. */
export class MockClassifier implements ClassifierService {
  async classify(photoUri: string): Promise<Classification[]> {
    const name = photoUri.toLowerCase();
    const keywords: Record<MaterialCategory, string[]> = {
      crt: ["crt", "monitor", "tv"],
      lcd_panel: ["lcd", "screen", "panel"],
      pcb: ["pcb", "board", "circuit", "motherboard"],
      cable: ["cable", "wire", "copper"],
      battery: ["battery", "cell", "inverter"],
      motor_magnet: ["motor", "magnet", "fan", "compressor"],
      mixed_plastics: ["plastic", "cabinet", "casing"],
    };
    const top: MaterialCategory = (
      Object.keys(keywords) as MaterialCategory[]
    ).find((cat) => keywords[cat].some((k) => name.includes(k))) ?? "mixed_plastics";
    return [
      { category: top, confidence: 0.82 },
      { category: "mixed_plastics", confidence: top === "mixed_plastics" ? 0.1 : 0.12 },
    ];
  }
}

/** Placeholder for the future on-device TFLite bundle. */
export class TfliteClassifier implements ClassifierService {
  async classify(_photoUri: string): Promise<Classification[]> {
    throw new Error("TFLite model not bundled yet — using MockClassifier");
  }
}

export const classifier: ClassifierService = new MockClassifier();
