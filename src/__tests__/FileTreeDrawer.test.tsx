import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { FileTreeDrawer } from "../components/files/FileTreeDrawer";
import { useUiStore } from "../state/uiStore";
import { usePrsStore } from "../state/prsStore";

vi.mock("../ipc/client", () => ({
  api: { getPathFilters: vi.fn().mockResolvedValue([]) },
}));

beforeEach(() => {
  useUiStore.setState({ fileTreeOpen: false });
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 1, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
      body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
      additions: 0, deletions: 0, reviewers_count: 0,
    },
    diff: [
      { path: "a.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
      { path: "b.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
    ],
    threads: [],
    selectedFile: "a.rs",
  } as never);
});

describe("FileTreeDrawer", () => {
  it("renders nothing when closed", () => {
    render(<FileTreeDrawer />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders drawer when open and closes on Escape", () => {
    useUiStore.setState({ fileTreeOpen: true });
    render(<FileTreeDrawer />);
    expect(screen.getByRole("dialog", { name: "Arquivos do PR" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useUiStore.getState().fileTreeOpen).toBe(false);
  });

  it("closes on close button click", () => {
    useUiStore.setState({ fileTreeOpen: true });
    render(<FileTreeDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(useUiStore.getState().fileTreeOpen).toBe(false);
  });

  it("closes when selectedFile changes", async () => {
    useUiStore.setState({ fileTreeOpen: true });
    render(<FileTreeDrawer />);
    expect(useUiStore.getState().fileTreeOpen).toBe(true);
    usePrsStore.setState({ selectedFile: "b.rs" } as never);
    await new Promise(r => setTimeout(r, 0));
    expect(useUiStore.getState().fileTreeOpen).toBe(false);
  });
});
