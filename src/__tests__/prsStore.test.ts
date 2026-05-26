import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../ipc/client", () => ({
  api: {
    refreshPr: vi.fn(),
    getPrDiff: vi.fn(),
    getPrThreads: vi.fn(),
    listViewedFiles: vi.fn(),
  },
}));

import { usePrsStore } from "../state/prsStore";
import { api } from "../ipc/client";
import type { PrDetail, FileDiff } from "../ipc/types";

const mockApi = api as unknown as {
  refreshPr: ReturnType<typeof vi.fn>;
  getPrDiff: ReturnType<typeof vi.fn>;
  getPrThreads: ReturnType<typeof vi.fn>;
  listViewedFiles: ReturnType<typeof vi.fn>;
};

function pr(over: Partial<PrDetail["summary"]> = {}): PrDetail {
  return {
    summary: {
      id: 1, owner: "o", repo: "r", number: 7, title: "t", author: "a",
      state: "open", updated_at: "", html_url: "", is_mine: false,
      review_requested: true, changed_files: 2, ci_status: "passing", ...over,
    },
    body: null, head_sha: "h", base_sha: "b", draft: false,
    mergeable: null, additions: 1, deletions: 0, reviewers_count: 1,
  } as PrDetail;
}
const file = (path: string): FileDiff => ({ path } as FileDiff);

beforeEach(() => {
  vi.clearAllMocks();
  usePrsStore.setState({
    currentPr: null, diff: [], threads: [], selectedFile: null,
    refreshingPr: false, prError: null, viewedFiles: new Set(),
  } as never);
});

describe("refreshCurrentPr", () => {
  it("is a no-op when no PR is open", async () => {
    await usePrsStore.getState().refreshCurrentPr();
    expect(mockApi.refreshPr).not.toHaveBeenCalled();
  });

  it("keeps selectedFile when its path survives the new diff", async () => {
    usePrsStore.setState({ currentPr: pr(), selectedFile: "b.ts" } as never);
    mockApi.refreshPr.mockResolvedValue(pr());
    mockApi.getPrDiff.mockResolvedValue([file("a.ts"), file("b.ts")]);
    mockApi.getPrThreads.mockResolvedValue([{ id: "T1" }] as never);
    mockApi.listViewedFiles.mockResolvedValue([]);
    await usePrsStore.getState().refreshCurrentPr();
    expect(usePrsStore.getState().selectedFile).toBe("b.ts");
    expect(usePrsStore.getState().refreshingPr).toBe(false);
    expect(usePrsStore.getState().diff).toHaveLength(2);
    expect(usePrsStore.getState().threads).toHaveLength(1);
  });

  it("falls back to first file when selected path is gone", async () => {
    usePrsStore.setState({ currentPr: pr(), selectedFile: "gone.ts" } as never);
    mockApi.refreshPr.mockResolvedValue(pr());
    mockApi.getPrDiff.mockResolvedValue([file("a.ts")]);
    mockApi.getPrThreads.mockResolvedValue([]);
    mockApi.listViewedFiles.mockResolvedValue([]);
    await usePrsStore.getState().refreshCurrentPr();
    expect(usePrsStore.getState().selectedFile).toBe("a.ts");
    expect(usePrsStore.getState().currentPr).not.toBeNull();
    expect(usePrsStore.getState().diff).toHaveLength(1);
  });

  it("keeps existing content on fetch error", async () => {
    usePrsStore.setState({
      currentPr: pr(), diff: [file("a.ts")], selectedFile: "a.ts",
    } as never);
    mockApi.refreshPr.mockRejectedValue(new Error("boom"));
    await usePrsStore.getState().refreshCurrentPr();
    expect(usePrsStore.getState().currentPr).not.toBeNull();
    expect(usePrsStore.getState().diff).toHaveLength(1);
    expect(usePrsStore.getState().refreshingPr).toBe(false);
    expect(usePrsStore.getState().prError).toBeTruthy();
    expect(usePrsStore.getState().selectedFile).toBe("a.ts");
  });
});
