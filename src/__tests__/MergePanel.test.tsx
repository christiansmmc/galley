import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MergePanel } from "../components/review/MergePanel";
import { usePrsStore } from "../state/prsStore";

const mergePr = vi.fn().mockResolvedValue({ merged: true, sha: "abc", message: "Merged" });
const openExternalUrl = vi.fn().mockResolvedValue(undefined);

vi.mock("../ipc/client", () => ({
  api: {
    mergePr: (...args: unknown[]) => mergePr(...args),
    openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
  },
}));

function setPr(overrides: Record<string, unknown> = {}) {
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 42, title: "t", author: "a", state: "open", updated_at: "", html_url: "https://github.com/x/y/pull/42", is_mine: true, review_requested: false, changed_files: 1, ci_status: "passing" },
      body: null, head_sha: "HEADSHA", base_sha: "", head_ref: "feat/x", base_ref: "main", draft: false, mergeable: true, mergeable_state: "clean",
      additions: 0, deletions: 0, reviewers_count: 0,
      ...overrides,
    },
    refreshCurrentPr: vi.fn().mockResolvedValue(undefined),
  } as never);
}

beforeEach(() => {
  mergePr.mockClear();
  openExternalUrl.mockClear();
  setPr();
});

describe("MergePanel", () => {
  it("merges with the selected method and head sha", async () => {
    const onClose = vi.fn();
    render(<MergePanel open onClose={onClose} />);
    fireEvent.click(screen.getByText("Squash e merge"));
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(mergePr).toHaveBeenCalled());
    expect(mergePr).toHaveBeenCalledWith("x", "y", 42, "squash", "HEADSHA");
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the PR checks tab when the CI badge is clicked", () => {
    render(<MergePanel open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "CI passou" }));
    expect(openExternalUrl).toHaveBeenCalledWith("https://github.com/x/y/pull/42/checks");
  });

  it("shows the bypass warning when mergeable_state is not clean", () => {
    setPr({ mergeable_state: "blocked" });
    render(<MergePanel open onClose={vi.fn()} />);
    expect(screen.getByText(/burla isso como admin/i)).toBeTruthy();
    expect(screen.getByText("Merge mesmo assim")).toBeTruthy();
  });

  it("shows the source and target branch", () => {
    render(<MergePanel open onClose={vi.fn()} />);
    expect(screen.getByText("feat/x")).toBeTruthy();
    expect(screen.getByText("main")).toBeTruthy();
  });
});
