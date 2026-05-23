import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TitleBar } from "../components/layout/TitleBar";
import { usePrsStore } from "../state/prsStore";
import { useUiStore } from "../state/uiStore";
import { useDraftsStore } from "../state/draftsStore";

vi.mock("../util/window", () => ({
  minimizeWindow: vi.fn(),
  toggleMaximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  isWindowMaximized: vi.fn(async () => false),
  subscribeWindowResized: vi.fn(async () => () => {}),
}));

const stubPr = {
  summary: {
    id: 1, owner: "esparta", repo: "scorehub-api", number: 42, title: "Fix login bug",
    author: "alice", state: "open", updated_at: "", html_url: "",
    is_mine: false, review_requested: true, changed_files: 2, ci_status: "passing",
  },
  body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
  additions: 0, deletions: 0, reviewers_count: 0,
};

beforeEach(() => {
  usePrsStore.setState({ currentPr: null, diff: [], threads: [], selectedFile: null });
  useUiStore.setState({ prListCollapsed: false, fileTreeCollapsed: false });
  useDraftsStore.setState({ drafts: [] } as never);
});

describe("TitleBar", () => {
  it("shows 'Pull Requests' when no PR is open", () => {
    render(<TitleBar onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} onOpenPalette={vi.fn()} />);
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voltar para a lista" })).not.toBeInTheDocument();
  });

  it("shows breadcrumb + Revisar + palette button when PR open", () => {
    usePrsStore.setState({ currentPr: stubPr } as never);

    render(<TitleBar onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} onOpenPalette={vi.fn()} />);
    expect(screen.getByText("esparta/scorehub-api")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revisar/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paleta de comandos" })).toBeInTheDocument();
  });

  it("back arrow closes PR and re-expands list", () => {
    usePrsStore.setState({ currentPr: stubPr } as never);
    useUiStore.setState({ prListCollapsed: true });

    render(<TitleBar onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} onOpenPalette={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Voltar para a lista" }));
    expect(usePrsStore.getState().currentPr).toBeNull();
    expect(useUiStore.getState().prListCollapsed).toBe(false);
  });

  it("draft count appears in Revisar label", () => {
    usePrsStore.setState({ currentPr: stubPr } as never);
    useDraftsStore.setState({ drafts: [{ id: 1 }, { id: 2 }, { id: 3 }] } as never);

    render(<TitleBar onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} onOpenPalette={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Revisar \(3\)/ })).toBeInTheDocument();
  });

  it("window controls render and dispatch", async () => {
    const winMod = await import("../util/window");
    render(<TitleBar onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} onOpenPalette={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Minimizar" }));
    expect(winMod.minimizeWindow).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Maximizar" }));
    expect(winMod.toggleMaximizeWindow).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(winMod.closeWindow).toHaveBeenCalled();
  });

  it("palette button invokes onOpenPalette", () => {
    const onOpenPalette = vi.fn();
    render(<TitleBar onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} onOpenPalette={onOpenPalette} />);
    fireEvent.click(screen.getByRole("button", { name: "Paleta de comandos" }));
    expect(onOpenPalette).toHaveBeenCalled();
  });
});
