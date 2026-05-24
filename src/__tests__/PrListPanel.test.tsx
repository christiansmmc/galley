import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PrListPanel } from "../components/prs/PrListPanel";
import { usePrsStore } from "../state/prsStore";
import { useSettingsStore } from "../state/settingsStore";

vi.mock("../ipc/client", () => ({
  api: { listPrs: vi.fn().mockResolvedValue([]) },
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
      ui: { theme: "system", sidebar_collapsed: false, filetree_collapsed: false, sidebar_width: 300, filetree_width: 240 },
      repos: [{ owner: "x", name: "y" }],
      path_filters: [],
    },
  } as never);
});

describe("PrListPanel", () => {
  it("switches between tabs and shows counts", () => {
    render(<PrListPanel />);
    expect(screen.getByText("RR 2")).toBeInTheDocument();
    expect(screen.getByText(/Pra revisar \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Meus \(1\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Meus/));
    expect(screen.getByText("Mine 1")).toBeInTheDocument();
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
