import { create } from "zustand";
import type { MaterialCategory } from "@akiri/backend/domain";
import type { AppLanguage } from "./i18n";

export interface LotDraft {
  id: string;
  photoUri: string | null;
  category: MaterialCategory;
  weightKg: number;
  valueInr: number;
  ledgerRef: string | null;
  synced: boolean;
}

interface AppState {
  language: AppLanguage;
  digitalPayments: boolean;
  online: boolean;
  lots: LotDraft[];
  setLanguage: (l: AppLanguage) => void;
  setDigital: (v: boolean) => void;
  setOnline: (v: boolean) => void;
  addLot: (lot: LotDraft) => void;
  markSynced: (id: string) => void;
}

export const useApp = create<AppState>((set) => ({
  language: "mr",
  digitalPayments: false,
  online: true,
  lots: [],
  setLanguage: (language) => set({ language }),
  setDigital: (digitalPayments) => set({ digitalPayments }),
  setOnline: (online) => set({ online }),
  addLot: (lot) => set((s) => ({ lots: [lot, ...s.lots] })),
  markSynced: (id) =>
    set((s) => ({
      lots: s.lots.map((l) => (l.id === id ? { ...l, synced: true } : l)),
    })),
}));

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
