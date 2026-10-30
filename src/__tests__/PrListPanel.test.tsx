import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PrListPanel } from "../components/prs/PrListPanel";
import { usePrsStore } from "../state/prsStore";
import { useSettingsStore } from "../state/settingsStore";

vi.mock("../ipc/client", () => ({
  api: {
    listPrs: vi.fn().mockResolvedValue([]),
    setSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  usePrsStore.setState({
    mine: [
      { id: 1, owner: "x", repo: "y", number: 1, title: "Mine 1", author: "me", state: "open", updated_at: "", html_url: "", is_mine: true, review_requested: false, changed_files: 3, ci_status: "passing" },
    ],
    reviewRequested: [
      { id: 2, owner: "x", repo: "y", number: 2, title: "RR 2", author: "other", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 5, ci_status: "pending" },
    ],
    loadingLists: false, listError: null,
    refreshLists: vi.fn().mockResolvedValue(undefined),
    openPr: vi.fn(),
    currentPr: null,
  } as never);
  useSettingsStore.setState({
    settings: {
      ui: { theme: "system", sidebar_collapsed: false, filetree_collapsed: false, sidebar_width: 300, filetree_width: 240, pr_list_tab: "review_requested" },
      repos: [{ owner: "x", name: "y" }],
      path_filters: [],
    },
  } as never);
});

/** The store action is stubbed in beforeEach; this reads it back as a spy. */
const refreshListsSpy = () =>
  usePrsStore.getState().refreshLists as unknown as ReturnType<typeof vi.fn>;

describe("PrListPanel", () => {
  it("kicks off exactly one non-forced list load on mount", () => {
    render(<PrListPanel />);
    // Non-forced on purpose: prsStore decides whether the lists are still
    // fresh, so a remount (collapse/expand) costs nothing.
    expect(refreshListsSpy()).toHaveBeenCalledTimes(1);
    expect(refreshListsSpy()).toHaveBeenCalledWith();
  });

  it("re-mounting does not issue a second forced load", () => {
    const first = render(<PrListPanel />);
    first.unmount();
    render(<PrListPanel />);
    expect(refreshListsSpy()).toHaveBeenCalledTimes(2);
    // Neither mount bypasses the freshness guard.
    expect(refreshListsSpy().mock.calls.every((c: unknown[]) => c.length === 0)).toBe(true);
  });

  it("refresh button always forces a refetch", () => {
    render(<PrListPanel />);
    fireEvent.click(screen.getByLabelText("Atualizar"));
    expect(refreshListsSpy()).toHaveBeenCalledWith(true);
  });

  it("switches between tabs and shows counts", () => {
    render(<PrListPanel />);
    expect(screen.getByText("RR 2")).toBeInTheDocument();
    expect(screen.getByText(/Pra revisar \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Meus \(1\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Meus/));
    expect(screen.getByText("Mine 1")).toBeInTheDocument();
  });

  it("shows the PR number before the title", () => {
    usePrsStore.setState({
      reviewRequested: [
        { id: 2, owner: "x", repo: "y", number: 371, title: "RR 2", author: "other", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 5, ci_status: "pending" },
      ],
    } as never);
    render(<PrListPanel />);
    expect(screen.getByRole("button", { name: /#371 RR 2/ })).toBeInTheDocument();
  });

  // Layout remounts the panel when a PR opens or closes, so unmount + render
  // is what leaving a PR does to it.
  it("comes back to the tab the last PR was opened from", async () => {
    const first = render(<PrListPanel />);
    fireEvent.click(screen.getByText(/Meus/));
    fireEvent.click(screen.getByText("Mine 1"));
    expect(usePrsStore.getState().openPr).toHaveBeenCalledWith("x", "y", 1);
    await waitFor(() => expect(useSettingsStore.getState().settings?.ui.pr_list_tab).toBe("mine"));

    first.unmount();
    render(<PrListPanel />);
    expect(screen.getByText("Mine 1")).toBeInTheDocument();
    expect(screen.queryByText("RR 2")).not.toBeInTheDocument();
  });

  it("does not remember a tab that was only browsed", () => {
    const first = render(<PrListPanel />);
    fireEvent.click(screen.getByText(/Meus/));
    expect(screen.getByText("Mine 1")).toBeInTheDocument();

    first.unmount();
    render(<PrListPanel />);
    expect(screen.getByText("RR 2")).toBeInTheDocument();
    expect(screen.queryByText("Mine 1")).not.toBeInTheDocument();
  });

  it("switches to the saved tab when settings finish loading after mount", () => {
    const settings = useSettingsStore.getState().settings!;
    useSettingsStore.setState({ settings: null } as never);
    render(<PrListPanel />);
    expect(screen.getByText("RR 2")).toBeInTheDocument();

    act(() => {
      useSettingsStore.setState({ settings: { ...settings, ui: { ...settings.ui, pr_list_tab: "mine" } } } as never);
    });
    expect(screen.getByText("Mine 1")).toBeInTheDocument();
    expect(screen.queryByText("RR 2")).not.toBeInTheDocument();
  });

  it("filters by search query across title, author, number", () => {
    render(<PrListPanel />);
    const input = screen.getByLabelText("Buscar PRs") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "RR" } });
    expect(screen.getByText("RR 2")).toBeInTheDocument();
    expect(screen.getByText(/Pra revisar \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Meus \(0\)/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "me" } });
    // Tab is review_requested, "me" is the Mine PR's author — won't show here, but Meus count = 1.
    expect(screen.queryByText("RR 2")).not.toBeInTheDocument();
    expect(screen.getByText(/Meus \(1\)/)).toBeInTheDocument();
  });

  it("Ctrl+P focuses search input", () => {
    render(<PrListPanel />);
    const input = screen.getByLabelText("Buscar PRs") as HTMLInputElement;
    expect(document.activeElement).not.toBe(input);
    fireEvent.keyDown(window, { key: "p", ctrlKey: true });
    expect(document.activeElement).toBe(input);
  });

  it("shows empty state when search has no match", () => {
    render(<PrListPanel />);
    const input = screen.getByLabelText("Buscar PRs") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "zzz_no_match" } });
    expect(screen.getByText("Nada encontrado.")).toBeInTheDocument();
  });
});
