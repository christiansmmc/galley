import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { FileTreePanel } from "../components/files/FileTreePanel";
import { usePrsStore } from "../state/prsStore";
import { useSettingsStore } from "../state/settingsStore";

vi.mock("../ipc/client", () => ({
  api: {
    getPathFilters: vi.fn().mockResolvedValue([
      { repo: "x/y", pattern: "src/test/**", label: "Testes", default_hidden: true },
    ]),
  },
}));

const baseUi = {
  theme: "dark" as const,
  sidebar_collapsed: false,
  filetree_collapsed: false,
  sidebar_width: 280,
  filetree_width: 320,
  diff_render_mode: "auto" as const,
  compact_paths: true,
  density: "comfortable" as const,
  diff_font: { size: 13, family: "JetBrains Mono" },
  palette_sources: { prs: true, files: true, repos: true, commands: true },
  accent_color: "sage" as const,
  language: "auto" as const,
  creed: "reading",
};

beforeEach(() => {
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 1, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
      body: null, head_sha: "", base_sha: "", head_ref: "", base_ref: "", draft: false, mergeable: null, mergeable_state: null,
      additions: 0, deletions: 0, reviewers_count: 0,
    },
    diff: [
      { path: "src/main.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
      { path: "src/test/foo.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
    ],
    threads: [],
    selectedFile: null,
    viewedFiles: new Set(),
  });
  useSettingsStore.setState({
    settings: { ui: baseUi, repos: [], path_filters: [] },
    hasPat: false,
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

  it("filters files by search query", async () => {
    render(<FileTreePanel />);
    await screen.findByText("main.rs");
    const search = screen.getByLabelText("Filtrar arquivos") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "main" } });
    expect(screen.getByText("main.rs")).toBeInTheDocument();
    expect(screen.queryByText(/Testes/)).not.toBeInTheDocument();
  });

  it("renders flat view with dir column when toggled", async () => {
    render(<FileTreePanel />);
    await screen.findByText("main.rs");
    fireEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByText("foo.rs")).toBeInTheDocument();
    expect(screen.getByText("src/test")).toBeInTheDocument();
    expect(screen.queryByText(/Testes \(1\)/)).not.toBeInTheDocument();
  });
});
