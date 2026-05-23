import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { CommandPalette } from "../components/layout/CommandPalette";
import { usePrsStore } from "../state/prsStore";
import { useSettingsStore } from "../state/settingsStore";

vi.mock("../theme/ThemeProvider", () => ({
  useTheme: () => ({ choice: "system", resolved: "mocha", setChoice: vi.fn() }),
}));

const mkPr = (over: Partial<{ id: number; number: number; title: string; owner: string; repo: string }>) => ({
  id: 1, owner: "esparta", repo: "scorehub-api", number: 1, title: "Fix things", author: "alice",
  state: "open", updated_at: "", html_url: "",
  is_mine: false, review_requested: true, changed_files: 1, ci_status: "passing",
  ...over,
});

const baseSettings = (over: Partial<{ repos: Array<{ owner: string; name: string }>; palette_sources: { prs: boolean; files: boolean; repos: boolean; commands: boolean } }> = {}) => ({
  settings: {
    ui: {
      theme: "system", sidebar_collapsed: false, filetree_collapsed: false,
      sidebar_width: 22, filetree_width: 22, diff_render_mode: "auto",
      compact_paths: true, density: "comfortable",
      diff_font: { family: "JetBrains Mono", size: 13 },
      palette_sources: over.palette_sources ?? { prs: true, files: true, repos: true, commands: true },
    },
    repos: over.repos ?? [],
    path_filters: [],
  },
});

beforeEach(() => {
  usePrsStore.setState({
    mine: [],
    reviewRequested: [],
    currentPr: null,
    diff: [],
    selectedFile: null,
  } as never);
  useSettingsStore.setState(baseSettings() as never);
});

describe("CommandPalette", () => {
  it("does not render when closed", () => {
    render(<CommandPalette open={false} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.queryByRole("dialog", { name: "Paleta de comandos" })).not.toBeInTheDocument();
  });

  it("renders PRs from both lists, deduped", () => {
    usePrsStore.setState({
      mine: [mkPr({ id: 1, number: 10, title: "Mine PR" })],
      reviewRequested: [
        mkPr({ id: 1, number: 10, title: "Mine PR" }),   // dup of mine
        mkPr({ id: 2, number: 20, title: "Review PR" }),
      ],
    } as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.getByText("#10 Mine PR")).toBeInTheDocument();
    expect(screen.getByText("#20 Review PR")).toBeInTheDocument();
    expect(screen.getAllByText("#10 Mine PR")).toHaveLength(1);
  });

  it("fuzzy filters PRs by title", () => {
    usePrsStore.setState({
      reviewRequested: [
        mkPr({ id: 1, number: 1, title: "Fix login bug" }),
        mkPr({ id: 2, number: 2, title: "Refactor settings" }),
      ],
    } as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "login" } });
    expect(screen.getByText("#1 Fix login bug")).toBeInTheDocument();
    expect(screen.queryByText("#2 Refactor settings")).not.toBeInTheDocument();
  });

  it("> prefix hides PRs and files, shows commands only", () => {
    usePrsStore.setState({
      reviewRequested: [mkPr({ id: 1, number: 1, title: "Some PR" })],
      currentPr: {
        summary: mkPr({ id: 1 }),
        body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
        additions: 0, deletions: 0, reviewers_count: 0,
      },
      diff: [{ path: "src/a.ts", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null }],
    } as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: ">" } });
    expect(screen.queryByText("#1 Some PR")).not.toBeInTheDocument();
    expect(screen.queryByText("src/a.ts")).not.toBeInTheDocument();
    expect(screen.getByText("Abrir configurações")).toBeInTheDocument();
    expect(screen.getByText("Atualizar lista de PRs")).toBeInTheDocument();
  });

  it("Enter selects file and closes when PR open", () => {
    const selectFile = vi.fn();
    const onClose = vi.fn();
    usePrsStore.setState({
      currentPr: {
        summary: mkPr({ id: 1 }),
        body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
        additions: 0, deletions: 0, reviewers_count: 0,
      },
      diff: [{ path: "src/foo.ts", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null }],
      selectFile,
    } as never);
    render(<CommandPalette open={true} onClose={onClose} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "foo" } });
    fireEvent.keyDown(screen.getByLabelText("Buscar"), { key: "Enter" });
    expect(selectFile).toHaveBeenCalledWith("src/foo.ts");
    expect(onClose).toHaveBeenCalled();
  });

  it("Esc closes palette", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.keyDown(screen.getByLabelText("Buscar"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("'> refresh' surfaces refresh command", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "> refresh" } });
    const cmds = screen.getByText("Atualizar lista de PRs");
    expect(cmds).toBeInTheDocument();
  });

  it("backdrop click closes palette", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Paleta de comandos" });
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("CommandPalette repo scope", () => {
  beforeEach(() => {
    useSettingsStore.setState(baseSettings({
      repos: [
        { owner: "esparta", name: "scorehub-api" },
        { owner: "esparta", name: "scorehub-dashboard" },
      ],
    }) as never);
    usePrsStore.setState({
      reviewRequested: [
        mkPr({ id: 1, number: 1, title: "API one", owner: "esparta", repo: "scorehub-api" }),
        mkPr({ id: 2, number: 2, title: "API two", owner: "esparta", repo: "scorehub-api" }),
        mkPr({ id: 3, number: 3, title: "Dash one", owner: "esparta", repo: "scorehub-dashboard" }),
      ],
    } as never);
  });

  const optionWith = (substr: string) => {
    const hit = screen.getAllByRole("option").find(el => (el.textContent ?? "").includes(substr));
    if (!hit) throw new Error(`No option with text containing "${substr}"`);
    return hit;
  };
  const hasOption = (substr: string) =>
    screen.queryAllByRole("option").some(el => (el.textContent ?? "").includes(substr));

  it("lists configured repos as entries with PR counts", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(optionWith("esparta/scorehub-api2 PRs")).toBeInTheDocument();
    expect(optionWith("esparta/scorehub-dashboard1 PR")).toBeInTheDocument();
  });

  it("typing a repo name fuzzy-matches repo entries", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "dashboard" } });
    expect(optionWith("esparta/scorehub-dashboard1 PR")).toBeInTheDocument();
  });

  it("selecting a repo scopes the list to that repo's PRs", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.click(optionWith("esparta/scorehub-api2 PRs"));
    expect(screen.getByRole("button", { name: /Sair do escopo esparta\/scorehub-api/ })).toBeInTheDocument();
    expect(screen.getByText("#1 API one")).toBeInTheDocument();
    expect(screen.getByText("#2 API two")).toBeInTheDocument();
    expect(screen.queryByText("#3 Dash one")).not.toBeInTheDocument();
    expect(hasOption("scorehub-dashboard")).toBe(false);
  });

  it("Esc on scoped palette exits scope (does not close)", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.click(optionWith("esparta/scorehub-api2 PRs"));
    fireEvent.keyDown(screen.getByLabelText("Buscar"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Sair do escopo/ })).not.toBeInTheDocument();
  });

  it("Backspace on empty scoped query exits scope", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.click(optionWith("esparta/scorehub-api2 PRs"));
    fireEvent.keyDown(screen.getByLabelText("Buscar"), { key: "Backspace" });
    expect(screen.queryByRole("button", { name: /Sair do escopo/ })).not.toBeInTheDocument();
  });
});

// Sanity guard: ensure dedupe didn't accidentally hide non-dup IDs.
describe("CommandPalette dedupe", () => {
  it("keeps distinct ids", () => {
    usePrsStore.setState({
      mine: [mkPr({ id: 1, number: 1, title: "A" })],
      reviewRequested: [mkPr({ id: 2, number: 2, title: "B" })],
    } as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    const list = screen.getByRole("dialog", { name: "Paleta de comandos" });
    expect(within(list).getByText("#1 A")).toBeInTheDocument();
    expect(within(list).getByText("#2 B")).toBeInTheDocument();
  });
});

describe("CommandPalette source toggles", () => {
  beforeEach(() => {
    usePrsStore.setState({
      reviewRequested: [mkPr({ id: 1, number: 1, title: "A PR", owner: "esparta", repo: "scorehub-api" })],
      currentPr: {
        summary: mkPr({ id: 1 }),
        body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
        additions: 0, deletions: 0, reviewers_count: 0,
      },
      diff: [{ path: "src/a.ts", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null }],
    } as never);
  });

  it("hides PRs when sources.prs is false", () => {
    useSettingsStore.setState(baseSettings({
      repos: [{ owner: "esparta", name: "scorehub-api" }],
      palette_sources: { prs: false, files: true, repos: true, commands: true },
    }) as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.queryByText("#1 A PR")).not.toBeInTheDocument();
  });

  it("hides files when sources.files is false", () => {
    useSettingsStore.setState(baseSettings({
      palette_sources: { prs: true, files: false, repos: true, commands: true },
    }) as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.queryByText("src/a.ts")).not.toBeInTheDocument();
  });

  it("hides repo entries when sources.repos is false", () => {
    useSettingsStore.setState(baseSettings({
      repos: [{ owner: "esparta", name: "scorehub-api" }],
      palette_sources: { prs: true, files: true, repos: false, commands: true },
    }) as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    const repoLikeOption = screen.queryAllByRole("option").find(el => (el.textContent ?? "").match(/^esparta\/scorehub-api\d* PRs?$/));
    expect(repoLikeOption).toBeUndefined();
  });

  it("hides commands by default but still shows them in > mode", () => {
    useSettingsStore.setState(baseSettings({
      palette_sources: { prs: true, files: true, repos: true, commands: false },
    }) as never);
    render(<CommandPalette open={true} onClose={vi.fn()} onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.queryByText("Abrir configurações")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: ">" } });
    expect(screen.getByText("Abrir configurações")).toBeInTheDocument();
  });
});
