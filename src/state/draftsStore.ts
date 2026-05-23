import { create } from "zustand";
import { api } from "../ipc/client";
import type { CommentDraft } from "../ipc/types";

interface DraftsState {
  drafts: CommentDraft[];
  /** The PR id whose drafts are currently loaded (or being loaded). */
  loadedPrId: number | null;
  load: (prId: number) => Promise<void>;
  add: (
    prId: number,
    path: string,
    line: number,
    side: string,
    body: string,
    startLine?: number | null,
    startSide?: string | null,
  ) => Promise<CommentDraft>;
  edit: (id: number, body: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clear: () => void;
}

/**
 * Tracks the most recently *requested* PR id outside the zustand store.
 * When two `load(prId)` calls overlap (fast PR switching), the in-flight
 * response for the older prId must be dropped on arrival — otherwise it
 * clobbers the fresher state with stale drafts.
 *
 * Stored at module scope rather than in the store because we only ever
 * compare the latest-requested against the in-flight; it's a guard, not
 * a value React or other code should observe.
 */
let latestRequestedPrId: number | null = null;

export const useDraftsStore = create<DraftsState>((set, get) => ({
  drafts: [],
  loadedPrId: null,
  load: async (prId) => {
    latestRequestedPrId = prId;
    const fresh = await api.listDrafts(prId);
    // If another load() call has happened since we kicked this one off,
    // drop this response on the floor — its prId is no longer current.
    if (latestRequestedPrId !== prId) return;
    set({ drafts: fresh, loadedPrId: prId });
  },
  add: async (prId, path, line, side, body, startLine = null, startSide = null) => {
    const d = await api.draftComment(prId, path, line, side, body, startLine, startSide);
    set({ drafts: [...get().drafts, d] });
    return d;
  },
  edit: async (id, body) => {
    const updated = await api.updateDraft(id, body);
    set({ drafts: get().drafts.map(d => d.id === id ? updated : d) });
  },
  remove: async (id) => {
    await api.deleteDraft(id);
    set({ drafts: get().drafts.filter(d => d.id !== id) });
  },
  clear: () => {
    latestRequestedPrId = null;
    set({ drafts: [], loadedPrId: null });
  },
}));
