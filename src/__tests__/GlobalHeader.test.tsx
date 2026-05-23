import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { GlobalHeader } from "../components/layout/GlobalHeader";
import { usePrsStore } from "../state/prsStore";
import { useUiStore } from "../state/uiStore";
import { useDraftsStore } from "../state/draftsStore";

beforeEach(() => {
  usePrsStore.setState({ currentPr: null, diff: [], threads: [], selectedFile: null });
  useUiStore.setState({ prListCollapsed: false, fileTreeCollapsed: false });
  useDraftsStore.setState({ drafts: [] } as never);
});

describe("GlobalHeader", () => {
  it("shows 'Pull Requests' when no PR is open", () => {
    render(<GlobalHeader onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voltar para a lista" })).not.toBeInTheDocument();
  });

  it("shows breadcrumb + Revisar + file toggle when PR open", () => {
    usePrsStore.setState({
      currentPr: {
        summary: { id: 1, owner: "esparta", repo: "scorehub-api", number: 42, title: "Fix login bug", author: "alice", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 2, ci_status: "passing" },
        body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
        additions: 0, deletions: 0, reviewers_count: 0,
      },
    } as never);

    render(<GlobalHeader onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.getByText("esparta/scorehub-api")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revisar/ })).toBeInTheDocument();
  });

  it("back arrow closes PR and re-expands list", () => {
    usePrsStore.setState({
      currentPr: {
        summary: { id: 1, owner: "x", repo: "y", number: 1, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
        body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
        additions: 0, deletions: 0, reviewers_count: 0,
      },
    } as never);
    useUiStore.setState({ prListCollapsed: true });

    render(<GlobalHeader onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Voltar para a lista" }));
    expect(usePrsStore.getState().currentPr).toBeNull();
    expect(useUiStore.getState().prListCollapsed).toBe(false);
  });

  it("draft count appears in Revisar button label", () => {
    usePrsStore.setState({
      currentPr: {
        summary: { id: 1, owner: "x", repo: "y", number: 1, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true, changed_files: 0, ci_status: "none" },
        body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
        additions: 0, deletions: 0, reviewers_count: 0,
      },
    } as never);
    useDraftsStore.setState({ drafts: [{ id: 1 }, { id: 2 }, { id: 3 }] } as never);

    render(<GlobalHeader onOpenSettings={vi.fn()} onOpenSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Revisar \(3\)/ })).toBeInTheDocument();
  });
});
