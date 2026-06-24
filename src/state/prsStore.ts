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
  /** Ids of PRs merged this session. GitHub's eventually-consistent search
   *  (and the backend list cache) can keep returning a just-merged PR as open
   *  for a few seconds, so we hide these from the lists until it stops
   *  returning them. Self-prunes in refreshLists. */
  recentlyMerged: Set<number>;

  currentPr: PrDetail | null;
  diff: FileDiff[];
  threads: ReviewThread[];
  selectedFile: string | null;
  loadingPr: boolean;
  /** True while refreshCurrentPr is in flight. Separate from loadingPr so an
   *  in-place refresh does NOT trigger the full-view skeleton. */
  refreshingPr: boolean;
  /** PR currently being fetched (used to render per-row spinners). Null when idle. */
  pendingPr: { owner: string; repo: string; number: number } | null;
  prError: unknown | null;
  /** Paths viewed for the current PR. Populated by openPr; mutated by setViewed. */
  viewedFiles: Set<string>;

  /** Reload both PR lists. Pass `force` (manual refresh) to bypass the backend
   *  list cache so the user always gets fresh data. */
  refreshLists: (force?: boolean) => Promise<void>;
  /** Mark a PR merged: drop it from the lists now and keep it hidden until
   *  GitHub stops returning it as open. */
  markMerged: (id: number) => void;
  openPr: (owner: string, repo: string, number: number) => Promise<void>;
  refreshCurrentPr: () => Promise<void>;
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
  recentlyMerged: new Set(),

  currentPr: null,
  diff: [],
  threads: [],
  selectedFile: null,
  loadingPr: false,
  refreshingPr: false,
  pendingPr: null,
  prError: null,
  viewedFiles: new Set(),

  refreshLists: async (force = false) => {
    set({ loadingLists: true, listError: null });
    try {
      const [mineRaw, rrRaw] = await Promise.all([
        api.listPrs("mine", force),
        api.listPrs("review_requested", force),
      ]);
      // Filter out PRs merged this session that the search/list cache may still
      // return as open. Prune ids GitHub no longer returns (it caught up).
      const merged = get().recentlyMerged;
      let mine = mineRaw, reviewRequested = rrRaw, pruned = merged;
      if (merged.size > 0) {
        const present = new Set<number>([...mineRaw, ...rrRaw].map(p => p.id));
        pruned = new Set([...merged].filter(id => present.has(id)));
        mine = mineRaw.filter(p => !pruned.has(p.id));
        reviewRequested = rrRaw.filter(p => !pruned.has(p.id));
      }
      set({ mine, reviewRequested, recentlyMerged: pruned });
    } catch (e) {
      set({ listError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      set({ loadingLists: false });
    }
  },

  markMerged: (id) => set(s => ({
    recentlyMerged: new Set(s.recentlyMerged).add(id),
    mine: s.mine.filter(p => p.id !== id),
    reviewRequested: s.reviewRequested.filter(p => p.id !== id),
  })),

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
      // Collapse the PR list on open (existing UX); leave the file tree in
      // whatever collapse state the user persisted — see uiStore hydration.
      useUiStore.getState().setPrListCollapsed(true);
    } catch (e) {
      set({ prError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      set({ loadingPr: false, pendingPr: null });
    }
  },

  refreshCurrentPr: async () => {
    const cur = get().currentPr;
    if (!cur) return;
    const { owner, repo, number } = cur.summary;
    // In-place refresh: do NOT null currentPr/diff or reset selectedFile, so
    // the user stays on the file they were reviewing. refreshingPr (not
    // loadingPr) drives a button spinner, not the full-view skeleton.
    set({ refreshingPr: true, prError: null });
    try {
      const fresh = await api.refreshPr(owner, repo, number);
      const [diff, threads, viewedList] = await Promise.all([
        api.getPrDiff(owner, repo, number),
        api.getPrThreads(owner, repo, number),
        api.listViewedFiles(fresh.summary.id),
      ]);
      const prev = get().selectedFile;
      const selectedFile = prev && diff.some(f => f.path === prev)
        ? prev
        : (diff[0]?.path ?? null);
      set({ currentPr: fresh, diff, threads, selectedFile, viewedFiles: new Set(viewedList) });
    } catch (e) {
      set({ prError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      set({ refreshingPr: false });
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
