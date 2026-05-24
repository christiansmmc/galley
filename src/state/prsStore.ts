import { create } from "zustand";
import { api } from "../ipc/client";
import { isAppError, userMessage } from "../ipc/errors";
import { useUiStore } from "./uiStore";
import type { FileDiff, PrDetail, PrSummary, ReviewThread } from "../ipc/types";

interface PrsState {
  mine: PrSummary[];
  reviewRequested: PrSummary[];
  loadingLists: boolean;
  listError: unknown | null;

  currentPr: PrDetail | null;
  diff: FileDiff[];
  threads: ReviewThread[];
  selectedFile: string | null;
  loadingPr: boolean;
  /** PR currently being fetched (used to render per-row spinners). Null when idle. */
  pendingPr: { owner: string; repo: string; number: number } | null;
  prError: unknown | null;
  /** Paths viewed for the current PR. Populated by openPr; mutated by setViewed. */
  viewedFiles: Set<string>;

  refreshLists: () => Promise<void>;
  openPr: (owner: string, repo: string, number: number) => Promise<void>;
  closePr: () => void;
  selectFile: (path: string) => void;
  refreshThreads: () => Promise<void>;
  setViewed: (path: string, viewed: boolean) => Promise<void>;
}

export const usePrsStore = create<PrsState>((set, get) => ({
  mine: [],
  reviewRequested: [],
  // Defaults to true so the very first render shows the loading sweep +
  // skeleton instead of flashing an "empty inbox" state for one frame
  // while the first refreshLists() roundtrip resolves.
  loadingLists: true,
  listError: null,

  currentPr: null,
  diff: [],
  threads: [],
  selectedFile: null,
  loadingPr: false,
  pendingPr: null,
  prError: null,
  viewedFiles: new Set(),

  refreshLists: async () => {
    set({ loadingLists: true, listError: null });
    try {
      const [mine, rr] = await Promise.all([
        api.listPrs("mine"),
        api.listPrs("review_requested"),
      ]);
      set({ mine, reviewRequested: rr });
    } catch (e) {
      set({ listError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      set({ loadingLists: false });
    }
  },

  openPr: async (owner, repo, number) => {
    set({
      loadingPr: true,
      prError: null,
      currentPr: null,
      diff: [],
      threads: [],
      selectedFile: null,
      viewedFiles: new Set(),
      pendingPr: { owner, repo, number },
    });
    try {
      // Always refresh on open — invalidates cached PR/diff/threads server
      // side so the user sees up-to-date data after external GitHub changes
      // (e.g. deleted reviews, new commits). Cache still helps within the
      // session for repeated file selections.
      const pr = await api.refreshPr(owner, repo, number);
      const [diff, threads, viewedList] = await Promise.all([
        api.getPrDiff(owner, repo, number),
        api.getPrThreads(owner, repo, number),
        api.listViewedFiles(pr.summary.id),
      ]);
      set({
        currentPr: pr,
        diff,
        threads,
        selectedFile: diff[0]?.path ?? null,
        viewedFiles: new Set(viewedList),
      });
      const ui = useUiStore.getState();
      ui.setPrListCollapsed(true);
      ui.setFileTreeCollapsed(false);
    } catch (e) {
      set({ prError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      set({ loadingPr: false, pendingPr: null });
    }
  },

  closePr: () => {
    set({ currentPr: null, diff: [], threads: [], selectedFile: null, prError: null, viewedFiles: new Set() });
  },

  selectFile: (path) => set({ selectedFile: path }),

  refreshThreads: async () => {
    const pr = get().currentPr;
    if (!pr) return;
    const threads = await api.getPrThreads(pr.summary.owner, pr.summary.repo, pr.summary.number);
    set({ threads });
  },

  setViewed: async (path, viewed) => {
    const pr = get().currentPr;
    if (!pr) return;
    await api.markViewed(pr.summary.id, path, viewed);
    const next = new Set(get().viewedFiles);
    if (viewed) next.add(path); else next.delete(path);
    set({ viewedFiles: next });
  },
}));
