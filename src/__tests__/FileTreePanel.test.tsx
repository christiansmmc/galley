import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { FileTreePanel } from "../components/files/FileTreePanel";
import { usePrsStore } from "../state/prsStore";

vi.mock("../ipc/client", () => ({
  api: {
    getPathFilters: vi.fn().mockResolvedValue([
      { repo: "x/y", pattern: "src/test/**", label: "Testes", default_hidden: true },
    ]),
  },
}));

beforeEach(() => {
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 1, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
      body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
    },
    diff: [
      { path: "src/main.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
      { path: "src/test/foo.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
    ],
    threads: [],
    selectedFile: null,
  });
});

describe("FileTreePanel", () => {
  it("groups filtered paths into a collapsed group", async () => {
    render(<FileTreePanel />);
    expect(await screen.findByText(/Testes \(1\)/)).toBeInTheDocument();
    expect(screen.getByText("main.rs")).toBeInTheDocument();
    expect(screen.queryByText("foo.rs")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Testes \(1\)/));
    expect(screen.getByText("foo.rs")).toBeInTheDocument();
  });
});
