import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../ipc/client", () => ({
  api: {
    listPrs: vi.fn(),
    getPr: vi.fn(),
    getPrDiff: vi.fn(),
    getPrThreads: vi.fn(),
    listViewedFiles: vi.fn(),
    getCiStatus: vi.fn(),
  },
}));

import { usePrsStore, LIST_FRESH_MS } from "../state/prsStore";
import { useSettingsStore } from "../state/settingsStore";
import { api } from "../ipc/client";
import type { PrDetail, PrSummary, FileDiff } from "../ipc/types";

const mockApi = api as unknown as {
  listPrs: ReturnType<typeof vi.fn>;
  getPr: ReturnType<typeof vi.fn>;
  getPrDiff: ReturnType<typeof vi.fn>;
  getPrThreads: ReturnType<typeof vi.fn>;
  listViewedFiles: ReturnType<typeof vi.fn>;
  getCiStatus: ReturnType<typeof vi.fn>;
};

function pr(over: Partial<PrDetail["summary"]> = {}, detail: Partial<PrDetail> = {}): PrDetail {
  return {
    summary: {
      id: 1, owner: "o", repo: "r", number: 7, title: "t", author: "a",
      state: "open", updated_at: "", html_url: "", is_mine: false,
      review_requested: true, changed_files: 2, ci_status: "passing", ...over,
    },
    body: null, head_sha: "h", base_sha: "b", draft: false,
    mergeable: null, additions: 1, deletions: 0, reviewers_count: 1,
    ...detail,
  } as PrDetail;
}
const file = (path: string): FileDiff => ({ path } as FileDiff);
const summary = (over: Partial<PrSummary> = {}): PrSummary => pr(over).summary;

/** A promise whose settlement the test drives, for interleaving assertions. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations, but every call site must still return
  // a promise, so re-arm the happy path defaults each time.
  mockApi.listPrs.mockResolvedValue([]);
  mockApi.getPr.mockResolvedValue(pr());
  mockApi.getPrDiff.mockResolvedValue([file("a.ts")]);
  mockApi.getPrThreads.mockResolvedValue([]);
  mockApi.listViewedFiles.mockResolvedValue([]);
  mockApi.getCiStatus.mockResolvedValue("passing");
  usePrsStore.setState({
    mine: [], reviewRequested: [], loadingLists: false, listError: null,
    recentlyMerged: new Set(), listsFetchedAt: null, listsFetchedKey: null,
    currentPr: null, diff: [], threads: [], selectedFile: null,
    loadingPr: false, refreshingPr: false, pendingPr: null,
    prError: null, viewedFiles: new Set(),
  } as never);
  useSettingsStore.setState({ settings: null } as never);
});

describe("openPr", () => {
  it("fires detail, diff and threads concurrently with force", async () => {
    const detail = deferred<PrDetail>();
    mockApi.getPr.mockReturnValue(detail.promise);

    const done = usePrsStore.getState().openPr("o", "r", 7);
    // All three are in flight before the detail resolves — they no longer
    // wait on it.
    expect(mockApi.getPr).toHaveBeenCalledWith("o", "r", 7, true);
    expect(mockApi.getPrDiff).toHaveBeenCalledWith("o", "r", 7, true);
    expect(mockApi.getPrThreads).toHaveBeenCalledWith("o", "r", 7, true);

    detail.resolve(pr());
    await done;
    expect(usePrsStore.getState().diff).toHaveLength(1);
    expect(usePrsStore.getState().selectedFile).toBe("a.ts");
    expect(usePrsStore.getState().loadingPr).toBe(false);
    expect(usePrsStore.getState().pendingPr).toBeNull();
  });

  it("paints the PR detail before the diff arrives", async () => {
    const diff = deferred<FileDiff[]>();
    mockApi.getPrDiff.mockReturnValue(diff.promise);

    const done = usePrsStore.getState().openPr("o", "r", 7);
    await vi.waitFor(() => expect(usePrsStore.getState().currentPr).not.toBeNull());
    // Header/meta strip can paint; the diff view is still on its skeleton.
    expect(usePrsStore.getState().diff).toHaveLength(0);
    expect(usePrsStore.getState().loadingPr).toBe(true);

    diff.resolve([file("a.ts"), file("b.ts")]);
    await done;
    expect(usePrsStore.getState().diff).toHaveLength(2);
    expect(usePrsStore.getState().loadingPr).toBe(false);
  });

  it("drops late responses from a PR the user already navigated away from", async () => {
    const slowDetail = deferred<PrDetail>();
    const slowDiff = deferred<FileDiff[]>();
    mockApi.getPr.mockReturnValueOnce(slowDetail.promise);
    mockApi.getPrDiff.mockReturnValueOnce(slowDiff.promise);
    mockApi.getPrThreads.mockReturnValueOnce(Promise.resolve([]));

    const first = usePrsStore.getState().openPr("o", "r", 1);

    // User clicks PR #2 while #1 is still loading.
    mockApi.getPr.mockResolvedValue(pr({ id: 2, number: 2 }));
    mockApi.getPrDiff.mockResolvedValue([file("second.ts")]);
    await usePrsStore.getState().openPr("o", "r", 2);
    expect(usePrsStore.getState().currentPr?.summary.number).toBe(2);

    // #1's responses finally land — they must not clobber #2.
    slowDetail.resolve(pr({ id: 1, number: 1 }));
    slowDiff.resolve([file("first.ts")]);
    await first;

    expect(usePrsStore.getState().currentPr?.summary.number).toBe(2);
    expect(usePrsStore.getState().diff.map(f => f.path)).toEqual(["second.ts"]);
    expect(usePrsStore.getState().selectedFile).toBe("second.ts");
    expect(usePrsStore.getState().loadingPr).toBe(false);
    expect(usePrsStore.getState().pendingPr).toBeNull();
  });

  it("keeps the loading flags of the newer request when an older one fails", async () => {
    const slowDetail = deferred<PrDetail>();
    mockApi.getPr.mockReturnValueOnce(slowDetail.promise);
    const first = usePrsStore.getState().openPr("o", "r", 1);

    const pendingDetail = deferred<PrDetail>();
    mockApi.getPr.mockReturnValueOnce(pendingDetail.promise);
    const second = usePrsStore.getState().openPr("o", "r", 2);

    slowDetail.reject(new Error("boom"));
    await first;
    // The superseded failure must not raise an error for, or stop the
    // spinner of, the PR that is still loading.
    expect(usePrsStore.getState().prError).toBeNull();
    expect(usePrsStore.getState().loadingPr).toBe(true);
    expect(usePrsStore.getState().pendingPr?.number).toBe(2);

    pendingDetail.resolve(pr({ id: 2, number: 2 }));
    await second;
    expect(usePrsStore.getState().loadingPr).toBe(false);
  });

  it("records the error and stops loading when the detail fetch fails", async () => {
    mockApi.getPr.mockRejectedValue(new Error("boom"));
    mockApi.getPrDiff.mockRejectedValue(new Error("boom too"));
    await usePrsStore.getState().openPr("o", "r", 7);
    expect(usePrsStore.getState().currentPr).toBeNull();
    expect(usePrsStore.getState().prError).toBeTruthy();
    expect(usePrsStore.getState().loadingPr).toBe(false);
    expect(usePrsStore.getState().pendingPr).toBeNull();
  });
});

describe("refreshCurrentPr", () => {
  it("is a no-op when no PR is open", async () => {
    await usePrsStore.getState().refreshCurrentPr();
    expect(mockApi.getPr).not.toHaveBeenCalled();
  });

  it("keeps selectedFile when its path survives the new diff", async () => {
    usePrsStore.setState({ currentPr: pr(), selectedFile: "b.ts" } as never);
    mockApi.getPr.mockResolvedValue(pr());
    mockApi.getPrDiff.mockResolvedValue([file("a.ts"), file("b.ts")]);
    mockApi.getPrThreads.mockResolvedValue([{ id: "T1" }] as never);
    await usePrsStore.getState().refreshCurrentPr();
    expect(usePrsStore.getState().selectedFile).toBe("b.ts");
    expect(usePrsStore.getState().refreshingPr).toBe(false);
    expect(usePrsStore.getState().diff).toHaveLength(2);
    expect(usePrsStore.getState().threads).toHaveLength(1);
  });

  it("falls back to first file when selected path is gone", async () => {
    usePrsStore.setState({ currentPr: pr(), selectedFile: "gone.ts" } as never);
    await usePrsStore.getState().refreshCurrentPr();
    expect(usePrsStore.getState().selectedFile).toBe("a.ts");
    expect(usePrsStore.getState().currentPr).not.toBeNull();
    expect(usePrsStore.getState().diff).toHaveLength(1);
  });

  it("keeps existing content on fetch error", async () => {
    usePrsStore.setState({
      currentPr: pr(), diff: [file("a.ts")], selectedFile: "a.ts",
    } as never);
    mockApi.getPr.mockRejectedValue(new Error("boom"));
    await usePrsStore.getState().refreshCurrentPr();
    expect(usePrsStore.getState().currentPr).not.toBeNull();
    expect(usePrsStore.getState().diff).toHaveLength(1);
    expect(usePrsStore.getState().refreshingPr).toBe(false);
    expect(usePrsStore.getState().prError).toBeTruthy();
    expect(usePrsStore.getState().selectedFile).toBe("a.ts");
  });

  it("does not clobber a PR opened while it was in flight", async () => {
    usePrsStore.setState({ currentPr: pr({ id: 1, number: 1 }), selectedFile: "a.ts" } as never);
    const slowDetail = deferred<PrDetail>();
    mockApi.getPr.mockReturnValueOnce(slowDetail.promise);
    const refreshing = usePrsStore.getState().refreshCurrentPr();

    mockApi.getPr.mockResolvedValue(pr({ id: 2, number: 2 }));
    mockApi.getPrDiff.mockResolvedValue([file("second.ts")]);
    await usePrsStore.getState().openPr("o", "r", 2);

    slowDetail.resolve(pr({ id: 1, number: 1 }));
    await refreshing;
    expect(usePrsStore.getState().currentPr?.summary.number).toBe(2);
    expect(usePrsStore.getState().diff.map(f => f.path)).toEqual(["second.ts"]);
  });
});

describe("refreshLists freshness", () => {
  it("fetches on the first call and skips while still fresh", async () => {
    await usePrsStore.getState().refreshLists();
    expect(mockApi.listPrs).toHaveBeenCalledTimes(2); // mine + review_requested
    expect(mockApi.listPrs).toHaveBeenCalledWith("mine", false);

    // PrListPanel remounting (collapse/expand) must not refetch.
    await usePrsStore.getState().refreshLists();
    expect(mockApi.listPrs).toHaveBeenCalledTimes(2);
  });

  it("always refetches on an explicit refresh, fresh or not", async () => {
    await usePrsStore.getState().refreshLists();
    await usePrsStore.getState().refreshLists(true);
    expect(mockApi.listPrs).toHaveBeenCalledTimes(4);
    expect(mockApi.listPrs).toHaveBeenCalledWith("mine", true);
    expect(mockApi.listPrs).toHaveBeenCalledWith("review_requested", true);
  });

  it("refetches once the freshness window has elapsed", async () => {
    await usePrsStore.getState().refreshLists();
    usePrsStore.setState({ listsFetchedAt: Date.now() - LIST_FRESH_MS - 1 });
    await usePrsStore.getState().refreshLists();
    expect(mockApi.listPrs).toHaveBeenCalledTimes(4);
  });

  it("refetches when the configured repo set changed", async () => {
    useSettingsStore.setState({ settings: { repos: [{ owner: "x", name: "y" }] } } as never);
    await usePrsStore.getState().refreshLists();
    expect(mockApi.listPrs).toHaveBeenCalledTimes(2);

    // A repo added in Settings makes the lists stale regardless of the TTL.
    useSettingsStore.setState({
      settings: { repos: [{ owner: "x", name: "y" }, { owner: "x", name: "z" }] },
    } as never);
    await usePrsStore.getState().refreshLists();
    expect(mockApi.listPrs).toHaveBeenCalledTimes(4);
  });

  it("de-dupes concurrent non-forced calls into one round-trip", async () => {
    const lists = deferred<PrSummary[]>();
    mockApi.listPrs.mockReturnValue(lists.promise);
    const a = usePrsStore.getState().refreshLists();
    const b = usePrsStore.getState().refreshLists();
    lists.resolve([]);
    await Promise.all([a, b]);
    expect(mockApi.listPrs).toHaveBeenCalledTimes(2);
  });

  it("does not mark the lists fresh when the fetch failed", async () => {
    mockApi.listPrs.mockRejectedValue(new Error("boom"));
    await usePrsStore.getState().refreshLists();
    expect(usePrsStore.getState().listsFetchedAt).toBeNull();
    expect(usePrsStore.getState().listError).toBeTruthy();

    mockApi.listPrs.mockResolvedValue([]);
    await usePrsStore.getState().refreshLists();
    expect(mockApi.listPrs).toHaveBeenCalledTimes(4);
  });
});

describe("setCiStatus", () => {
  it("patches only the CI status of the open PR and its list rows", async () => {
    usePrsStore.setState({
      currentPr: pr({ ci_status: "pending" }),
      diff: [file("a.ts")],
      selectedFile: "a.ts",
      mine: [summary({ id: 1, ci_status: "pending" })],
      reviewRequested: [summary({ id: 99, number: 99, ci_status: "pending" })],
    } as never);

    usePrsStore.getState().setCiStatus("h", "passing");
    const s = usePrsStore.getState();
    expect(s.currentPr?.summary.ci_status).toBe("passing");
    expect(s.mine[0].ci_status).toBe("passing");
    // Other PRs are untouched.
    expect(s.reviewRequested[0].ci_status).toBe("pending");
    // Nothing else was refetched or dropped.
    expect(s.diff).toHaveLength(1);
    expect(s.selectedFile).toBe("a.ts");
    expect(mockApi.getPrDiff).not.toHaveBeenCalled();
  });

  it("ignores a poll that resolved after the user switched PRs", () => {
    usePrsStore.setState({ currentPr: pr({ ci_status: "pending" }, { head_sha: "new" }) } as never);
    usePrsStore.getState().setCiStatus("stale", "failing");
    expect(usePrsStore.getState().currentPr?.summary.ci_status).toBe("pending");
  });

  it("is a no-op with no PR open", () => {
    usePrsStore.getState().setCiStatus("h", "failing");
    expect(usePrsStore.getState().currentPr).toBeNull();
  });
});
