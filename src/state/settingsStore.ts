import { create } from "zustand";
import { api } from "../ipc/client";
import type { Settings } from "../ipc/types";
import { setLanguageChoice } from "../i18n";

interface SettingsState {
  settings: Settings | null;
  hasPat: boolean;
  load: () => Promise<void>;
  save: (s: Settings) => Promise<void>;
  checkPat: () => Promise<void>;
}

/**
 * Persist the language to i18next whenever the settings change.
 * Reading settings happens through `load` (initial) and `save` (mutation);
 * both must re-sync so a fresh install's persisted choice wins over the
 * value we initially picked from navigator.language at module load.
 */
function syncLanguage(s: Settings | null) {
  if (!s) return;
  // Older configs without the field default to "auto" via serde, but in case
  // a hand-edited config lacks the field at the TS level, treat undefined
  // as "auto" too.
  const lang = s.ui.language ?? "auto";
  setLanguageChoice(lang);
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  hasPat: false,
  load: async () => {
    const settings = await api.getSettings();
    set({ settings });
    syncLanguage(settings);
  },
  save: async (s) => {
    await api.setSettings(s);
    set({ settings: s });
    syncLanguage(s);
  },
  checkPat: async () => set({ hasPat: await api.hasPat() }),
}));
