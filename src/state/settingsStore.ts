import { create } from "zustand";
import { api } from "../ipc/client";
import type { Settings } from "../ipc/types";

interface SettingsState {
  settings: Settings | null;
  hasPat: boolean;
  load: () => Promise<void>;
  save: (s: Settings) => Promise<void>;
  checkPat: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  hasPat: false,
  load: async () => set({ settings: await api.getSettings() }),
  save: async (s) => { await api.setSettings(s); set({ settings: s }); },
  checkPat: async () => set({ hasPat: await api.hasPat() }),
}));
