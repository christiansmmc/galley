import { create } from "zustand";
import { api } from "../ipc/client";
import { isAppError, userMessage } from "../ipc/errors";
import { useUiStore } from "./uiStore";
import { useSettingsStore } from "./settingsStore";
import type { CiStatus, FileDiff, PrDetail, PrSummary, ReviewThread } from "../ipc/types";

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
  /** Epoch ms of the last successful list fetch (null = never fetched).
   *  Drives the freshness guard in refreshLists — see LIST_FRESH_MS. */
  listsFetchedAt: number | null;
  /** Repo set the lists were fetched for. Part of the freshness identity:
   *  the same timestamp is meaningless once the user adds/removes a repo. */
  listsFetchedKey: string | null;

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

  /** Reload both PR lists. Pass `force` (manual refresh) to bypass BOTH the
   *  client-side freshness guard and the backend list cache, so the user
   *  always gets fresh data. Without `force` the call is a no-op while the
   *  current lists are still fresh (see LIST_FRESH_MS). */
  refreshLists: (force?: boolean) => Promise<void>;
  /** Mark a PR merged: drop it from the lists now and keep it hidden until
   *  GitHub stops returning it as open. */
  markMerged: (id: number) => void;
  openPr: (owner: string, repo: string, number: number) => Promise<void>;
  refreshCurrentPr: () => Promise<void>;
  /** Patch only the CI status of the open PR (cheap CI poll — see
   *  useCiAutoRefresh). `headSha` guards against a poll that resolves after
   *  the user switched to another PR. */
  setCiStatus: (headSha: string, status: CiStatus) => void;
  closePr: () => void;
  selectFile: (path: string) => void;
  refreshThreads: () => Promise<void>;
  setViewed: (path: string, viewed: boolean) => Promise<void>;
}

/**
 * How long fetched lists count as fresh. A non-forced refreshLists() inside
 * this window resolves without touching the network.
 *
 * PrListPanel is mounted conditionally (Layout swaps in the narrow rail when
 * the list is collapsed, and openPr collapses it on every open), so its
 * mount-time load used to refire two full list round-trips on every
 * collapse/expand. The window mirrors the backend list cache TTL
 * (`LIST_TTL_SECS` = 60s in src-tauri/src/cache/ttl.rs): fetching sooner than
 * that would only re-read the same cached rows back over IPC anyway.
 */
export const LIST_FRESH_MS = 60_000;

/**
 * In-flight list fetch, de-duplicated at module scope. Two callers landing in
 * the same tick (a remount plus a settings-close, say) share one round-trip
 * instead of racing two. Cleared as soon as the fetch settles.
 */
let listsInFlight: Promise<void> | null = null;

/**
 * Monotonic token identifying the most recent PR load (openPr or
 * refreshCurrentPr). Both now fire detail/diff/threads concurrently and commit
 * each piece as it lands, so a response belonging to a PR the user has already
 * navigated away from can arrive *after* the newer PR's state is in place and
 * clobber it. Every commit point captures the token it started with and drops
 * its response when the token is no longer the latest.
 *
 * Same guard draftsStore uses for `latestRequestedPrId`, but a counter instead
 * of a PR id so that re-opening the *same* PR also supersedes the previous
 * in-flight load. Module scope rather than store state because it is a guard,
 * not a value any component should observe.
 */
let latestPrRequest = 0;

/**
 * Identity of the configured repo set. The lists are only "fresh" for the repo
 * set they were fetched with — adding or removing a repo in Settings must
 * invalidate them immediately, regardless of how recently they were fetched.
 */
function reposKey(): string {
  const repos = useSettingsStore.getState().settings?.repos ?? [];
  return repos.map(r => `${r.owner}/${r.name}`).join(",");
}

/** Silence "unhandled rejection" noise for promises we await later (or not at
 *  all, when an earlier one already rejected). Attaching a handler here does
 *  not swallow anything: the awaits below still see the rejection. */
function ignoreRejection(p: Promise<unknown>): void {
  void p.catch(() => {});
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
  listsFetchedAt: null,
  listsFetchedKey: null,

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
    // An explicit refresh (button, command palette, post-merge) must always
    // hit the network — it never consults the freshness guard.
    if (!force) {
      const { listsFetchedAt, listsFetchedKey } = get();
      const fresh =
        listsFetchedAt !== null &&
        Date.now() - listsFetchedAt < LIST_FRESH_MS &&
        listsFetchedKey === reposKey();
      if (fresh) return;
      // Already fetching: piggyback instead of firing a second pair of calls.
      if (listsInFlight) return listsInFlight;
    }
    set({ loadingLists: true, listError: null });
    const run = (async () => {
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
        set({
          mine, reviewRequested, recentlyMerged: pruned,
          listsFetchedAt: Date.now(), listsFetchedKey: reposKey(),
        });
      } catch (e) {
        set({ listError: e });
        if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
        else useUiStore.getState().pushToast("error", userMessage(e));
      } finally {
        set({ loadingLists: false });
      }
    })();
    listsInFlight = run;
    try {
      await run;
    } finally {
      if (listsInFlight === run) listsInFlight = null;
    }
  },

  markMerged: (id) => set(s => ({
    recentlyMerged: new Set(s.recentlyMerged).add(id),
    mine: s.mine.filter(p => p.id !== id),
    reviewRequested: s.reviewRequested.filter(p => p.id !== id),
  })),

  openPr: async (owner, repo, number) => {
    const token = ++latestPrRequest;
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
    // Detail, diff and threads are three independent GitHub reads — fire them
    // all at once instead of chaining, they don't depend on each other.
    //
    // `force: true` (rather than refreshPr) still refreshes on open, so the
    // user sees up-to-date data after external GitHub changes (deleted
    // reviews, new commits), and the cache keeps helping within the session
    // for repeated file selections. It has to be the flag and not refresh_pr:
    // refresh_pr *deletes* the cached rows first, which would race with these
    // concurrent reads writing their fresh rows back.
    const detailP = api.getPr(owner, repo, number, true);
    const diffP = api.getPrDiff(owner, repo, number, true);
    const threadsP = api.getPrThreads(owner, repo, number, true);
    [detailP, diffP, threadsP].forEach(ignoreRejection);
    try {
      // Progressive render: commit the detail the moment it lands so the
      // header + meta strip paint, instead of holding the whole view blank
      // until the (much heavier) diff arrives.
      const detail = await detailP;
      if (token !== latestPrRequest) return;
      set({ currentPr: detail });
      // Collapse the PR list on open (existing UX); leave the file tree in
      // whatever collapse state the user persisted — see uiStore hydration.
      useUiStore.getState().setPrListCollapsed(true);

      // listViewedFiles is the only call that genuinely needs the PR id, and
      // it's a local SQLite read — chaining it off the detail costs nothing.
      const [diff, threads, viewedList] = await Promise.all([
        diffP,
        threadsP,
        api.listViewedFiles(detail.summary.id),
      ]);
      if (token !== latestPrRequest) return;
      set({
        diff,
        threads,
        selectedFile: diff[0]?.path ?? null,
        viewedFiles: new Set(viewedList),
      });
    } catch (e) {
      if (token !== latestPrRequest) return;
      set({ prError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      // Only the latest request owns the loading flags; a superseded one
      // clearing them would kill the spinner of the PR now being opened.
      if (token === latestPrRequest) set({ loadingPr: false, pendingPr: null });
    }
  },

  refreshCurrentPr: async () => {
    const cur = get().currentPr;
    if (!cur) return;
    const { owner, repo, number } = cur.summary;
    const token = ++latestPrRequest;
    // In-place refresh: do NOT null currentPr/diff or reset selectedFile, so
    // the user stays on the file they were reviewing. refreshingPr (not
    // loadingPr) drives a button spinner, not the full-view skeleton.
    set({ refreshingPr: true, prError: null });
    // Same concurrent-with-force shape as openPr — see the comment there.
    const detailP = api.getPr(owner, repo, number, true);
    const diffP = api.getPrDiff(owner, repo, number, true);
    const threadsP = api.getPrThreads(owner, repo, number, true);
    [detailP, diffP, threadsP].forEach(ignoreRejection);
    try {
      const fresh = await detailP;
      if (token !== latestPrRequest) return;
      set({ currentPr: fresh });
      const [diff, threads, viewedList] = await Promise.all([
        diffP,
        threadsP,
        api.listViewedFiles(fresh.summary.id),
      ]);
      if (token !== latestPrRequest) return;
      const prev = get().selectedFile;
      const selectedFile = prev && diff.some(f => f.path === prev)
        ? prev
        : (diff[0]?.path ?? null);
      set({ diff, threads, selectedFile, viewedFiles: new Set(viewedList) });
    } catch (e) {
      if (token !== latestPrRequest) return;
      set({ prError: e });
      if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
      else useUiStore.getState().pushToast("error", userMessage(e));
    } finally {
      if (token === latestPrRequest) set({ refreshingPr: false });
    }
  },

  setCiStatus: (headSha, status) => {
    const cur = get().currentPr;
    // Drop the update if the PR changed under us (poll resolved after a
    // switch) or if nothing actually changed — avoids pointless re-renders.
    if (!cur || cur.head_sha !== headSha || cur.summary.ci_status === status) return;
    const id = cur.summary.id;
    const patch = (p: PrSummary) => p.id === id ? { ...p, ci_status: status } : p;
    set({
      currentPr: { ...cur, summary: { ...cur.summary, ci_status: status } },
      // Keep the list row / rail dot in sync without a list refetch.
      mine: get().mine.map(patch),
      reviewRequested: get().reviewRequested.map(patch),
    });
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
