import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { InlineThreadWidget } from "../components/diff/InlineThreadWidget";
import { usePrsStore } from "../state/prsStore";
import type { ReviewThread } from "../ipc/types";

const resolveThread = vi.fn().mockResolvedValue(undefined);

vi.mock("../ipc/client", () => ({
  api: {
    replyToThread: vi.fn(),
    resolveThread: (...args: unknown[]) => resolveThread(...args),
  },
}));

const refreshThreads = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  resolveThread.mockClear();
  refreshThreads.mockClear();
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 42, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
      body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
      additions: 0, deletions: 0, reviewers_count: 0,
    },
    diff: [], threads: [], selectedFile: null, viewedFiles: new Set(),
    refreshThreads,
  } as never);
});

describe("InlineThreadWidget resolve", () => {
  it("renders Resolver button when node_id is present and calls resolveThread", async () => {
    const thread: ReviewThread = {
      id: 100, path: "src/foo.ts", line: 12, side: "RIGHT",
      start_line: null, start_side: null,
      node_id: "PRT_node_abc", resolved: false,
      comments: [{ id: 100, author: "alice", body: "nit", created_at: "", in_reply_to_id: null }],
    };
    render(<InlineThreadWidget thread={thread} />);
    fireEvent.click(screen.getByText("Resolver"));
    await waitFor(() => expect(resolveThread).toHaveBeenCalled());
    expect(resolveThread).toHaveBeenCalledWith("x", "y", 42, "PRT_node_abc");
    await waitFor(() => expect(refreshThreads).toHaveBeenCalled());
  });

  it("hides Resolver button when node_id is null", () => {
    const thread: ReviewThread = {
      id: 100, path: "src/foo.ts", line: 12, side: "RIGHT",
      start_line: null, start_side: null,
      node_id: null, resolved: false,
      comments: [{ id: 100, author: "alice", body: "nit", created_at: "", in_reply_to_id: null }],
    };
    render(<InlineThreadWidget thread={thread} />);
    expect(screen.queryByText("Resolver")).toBeNull();
  });
});
