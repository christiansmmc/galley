import { create } from "zustand";

interface Toast { id: number; kind: "info" | "error"; message: string; }
interface UiState {
  authBanner: boolean;
  toasts: Toast[];
  prListCollapsed: boolean;
  fileTreeOpen: boolean;
  setAuthBanner: (b: boolean) => void;
  pushToast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
  setPrListCollapsed: (b: boolean) => void;
  togglePrList: () => void;
  setFileTreeOpen: (b: boolean) => void;
  toggleFileTree: () => void;
}

let nextId = 1;

export const useUiStore = create<UiState>((set, get) => ({
  authBanner: false,
  toasts: [],
  prListCollapsed: false,
  fileTreeOpen: false,
  setAuthBanner: (b) => set({ authBanner: b }),
  pushToast: (kind, message) => {
    const t = { id: nextId++, kind, message };
    set({ toasts: [...get().toasts, t] });
    setTimeout(() => get().dismissToast(t.id), 5000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
  setPrListCollapsed: (b) => set({ prListCollapsed: b }),
  togglePrList: () => set({ prListCollapsed: !get().prListCollapsed }),
  setFileTreeOpen: (b) => set({ fileTreeOpen: b }),
  toggleFileTree: () => set({ fileTreeOpen: !get().fileTreeOpen }),
}));
