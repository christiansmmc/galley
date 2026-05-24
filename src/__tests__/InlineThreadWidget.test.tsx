import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { InlineThreadWidget } from "../components/diff/InlineThreadWidget";
import { usePrsStore } from "../state/prsStore";
import type { ReviewThread } from "../ipc/types";

const replyToThread = vi.fn().mockResolvedValue(undefined);

vi.mock("../ipc/client", () => ({
  api: {
    replyToThread: (...args: unknown[]) => replyToThread(...args),
  },
}));

const refreshThreads = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  replyToThread.mockClear();
  refreshThreads.mockClear();
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 42, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
      body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
      additions: 0, deletions: 0, reviewers_count: 0,
    },
    diff: [], threads: [], selectedFile: null,
    refreshThreads,
  } as never);
});

describe("InlineThreadWidget", () => {
  it("sends a reply via api.replyToThread targeting the last comment's id", async () => {
    const thread: ReviewThread = {
      id: 100,
      path: "src/foo.ts",
      line: 12,
      side: "RIGHT",
      start_line: null,
      start_side: null,
      node_id: null,
      resolved: false,
      comments: [
        { id: 100, author: "alice", body: "first", created_at: "", in_reply_to_id: null },
        { id: 101, author: "bob", body: "follow up", created_at: "", in_reply_to_id: 100 },
      ],
    };
    render(<InlineThreadWidget thread={thread} />);

    const textarea = screen.getByPlaceholderText("responder…") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "thanks" } });
    fireEvent.click(screen.getByText("responder"));

    await waitFor(() => expect(replyToThread).toHaveBeenCalled());
    // Reply targets the LAST comment in the thread, not the root, so GitHub
    // threads them in chronological order.
    expect(replyToThread).toHaveBeenCalledWith("x", "y", 42, 101, "thanks");
    await waitFor(() => expect(refreshThreads).toHaveBeenCalled());
  });

  it("does not submit when the textarea is empty", () => {
    const thread: ReviewThread = {
      id: 100, path: "src/foo.ts", line: 12, side: "RIGHT",
      start_line: null, start_side: null,
      node_id: null, resolved: false,
      comments: [{ id: 100, author: "alice", body: "first", created_at: "", in_reply_to_id: null }],
    };
    render(<InlineThreadWidget thread={thread} />);
    const button = screen.getByText("responder") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
