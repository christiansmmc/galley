import { create } from "zustand";
import { api } from "../ipc/client";
import type { CommentDraft } from "../ipc/types";

interface DraftsState {
  drafts: CommentDraft[];
  load: (prId: number) => Promise<void>;
  add: (prId: number, path: string, line: number, side: string, body: string) => Promise<void>;
  edit: (id: number, body: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clear: () => void;
}

export const useDraftsStore = create<DraftsState>((set, get) => ({
  drafts: [],
  load: async (prId) => set({ drafts: await api.listDrafts(prId) }),
  add: async (prId, path, line, side, body) => {
    const d = await api.draftComment(prId, path, line, side, body);
    set({ drafts: [...get().drafts, d] });
  },
  edit: async (id, body) => {
    const updated = await api.updateDraft(id, body);
    set({ drafts: get().drafts.map(d => d.id === id ? updated : d) });
  },
  remove: async (id) => {
    await api.deleteDraft(id);
    set({ drafts: get().drafts.filter(d => d.id !== id) });
  },
  clear: () => set({ drafts: [] }),
}));
