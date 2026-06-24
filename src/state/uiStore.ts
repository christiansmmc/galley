import { create } from "zustand";
import { useSettingsStore } from "./settingsStore";

interface Toast { id: number; kind: "info" | "error" | "success"; message: string; }
interface UiState {
  authBanner: boolean;
  toasts: Toast[];
  prListCollapsed: boolean;
  fileTreeCollapsed: boolean;
  /** Seconds until the next CI auto-refresh, or null when not polling. */
  ciCountdown: number | null;
  setAuthBanner: (b: boolean) => void;
  pushToast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
  setCiCountdown: (n: number | null) => void;
  setPrListCollapsed: (b: boolean) => void;
  togglePrList: () => void;
  setFileTreeCollapsed: (b: boolean) => void;
  toggleFileTree: () => void;
}

let nextId = 1;

/** Mirror the collapse state into persisted settings so it survives reloads. */
function persistFileTreeCollapsed(collapsed: boolean) {
  const ss = useSettingsStore.getState();
  const s = ss.settings;
  if (!s || s.ui.filetree_collapsed === collapsed) return;
  void ss.save({ ...s, ui: { ...s.ui, filetree_collapsed: collapsed } });
}

export const useUiStore = create<UiState>((set, get) => ({
  authBanner: false,
  toasts: [],
  prListCollapsed: false,
  fileTreeCollapsed: false,
  ciCountdown: null,
  setAuthBanner: (b) => set({ authBanner: b }),
  pushToast: (kind, message) => {
    const t = { id: nextId++, kind, message };
    set({ toasts: [...get().toasts, t] });
    setTimeout(() => get().dismissToast(t.id), 5000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
  setCiCountdown: (n) => set({ ciCountdown: n }),
  setPrListCollapsed: (b) => set({ prListCollapsed: b }),
  togglePrList: () => set({ prListCollapsed: !get().prListCollapsed }),
  setFileTreeCollapsed: (b) => { set({ fileTreeCollapsed: b }); persistFileTreeCollapsed(b); },
  toggleFileTree: () => { const n = !get().fileTreeCollapsed; set({ fileTreeCollapsed: n }); persistFileTreeCollapsed(n); },
}));
