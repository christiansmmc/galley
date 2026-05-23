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
  prError: unknown | null;

  refreshLists: () => Promise<void>;
  openPr: (owner: string, repo: string, number: number) => Promise<void>;
  closePr: () => void;
  selectFile: (path: string) => void;
  refreshThreads: () => Promise<void>;
}

export const usePrsStore = create<PrsState>((set, get) => ({
  mine: [],
  reviewRequested: [],
  loadingLists: false,
  listError: null,

  currentPr: null,
  diff: [],
  threads: [],
  selectedFile: null,
  loadingPr: false,
  prError: null,

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
    set({ loadingPr: true, prError: null, currentPr: null, diff: [], threads: [], selectedFile: null });
    try {
      // Always refresh on open — invalidates cached PR/diff/threads server
      // side so the user sees up-to-date data after external GitHub changes
      // (e.g. deleted reviews, new commits). Cache still helps within the
      // session for repeated file selections.
      const pr = await api.refreshPr(owner, repo, number);
      const [diff, threads] = await Promise.all([
        api.getPrDiff(owner, repo, number),
        api.getPrThreads(owner, repo, number),
      ]);
      set({
        currentPr: pr,
        diff,
        threads,
        selectedFile: diff[0]?.path ?? null,
      });
      const ui = useUiStore.getState();
      ui.setPrListCollapsed(true);
      ui.setFileTreeCollapsed(false);
    } catch (e) {
      set({ prError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      set({ loadingPr: false });
    }
  },

  closePr: () => {
    set({ currentPr: null, diff: [], threads: [], selectedFile: null, prError: null });
  },

  selectFile: (path) => set({ selectedFile: path }),

  refreshThreads: async () => {
    const pr = get().currentPr;
    if (!pr) return;
    const threads = await api.getPrThreads(pr.summary.owner, pr.summary.repo, pr.summary.number);
    set({ threads });
  },
}));
