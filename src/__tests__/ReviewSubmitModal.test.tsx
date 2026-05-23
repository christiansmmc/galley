import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ReviewSubmitModal } from "../components/review/ReviewSubmitModal";
import { useDraftsStore } from "../state/draftsStore";
import { usePrsStore } from "../state/prsStore";

const submitReview = vi.fn().mockResolvedValue({ review_id: 1, state: "submitted", html_url: "" });

vi.mock("../ipc/client", () => ({
  api: {
    submitReview: (...args: unknown[]) => submitReview(...args),
  },
}));

beforeEach(() => {
  submitReview.mockClear();
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 42, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
      body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
      additions: 0, deletions: 0, reviewers_count: 0,
    },
    diff: [], threads: [], selectedFile: null,
    refreshThreads: vi.fn().mockResolvedValue(undefined),
  } as never);
  useDraftsStore.setState({
    drafts: [{ id: 9, pr_id: 1, path: "a", line: 1, side: "RIGHT", body: "hi", created_at: "" }],
    clear: vi.fn(),
  } as never);
});

describe("ReviewSubmitModal", () => {
  it("submits with selected event and draft ids", async () => {
    const onClose = vi.fn();
    render(<ReviewSubmitModal open onClose={onClose} />);
    fireEvent.click(screen.getByText("Aprovar"));
    fireEvent.click(screen.getByText("Enviar"));
    await waitFor(() => expect(submitReview).toHaveBeenCalled());
    expect(submitReview).toHaveBeenCalledWith("x", "y", 42, "APPROVE", null, 1, [9]);
    expect(onClose).toHaveBeenCalled();
  });
});
