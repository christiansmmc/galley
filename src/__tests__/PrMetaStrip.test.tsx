import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { PrMetaStrip } from "../components/prs/PrMetaStrip";
import type { PrDetail } from "../ipc/types";
import { usePrsStore } from "../state/prsStore";

function makePr(overrides: Partial<PrDetail> = {}): PrDetail {
  return {
    summary: {
      id: 1, owner: "x", repo: "y", number: 42, title: "t", author: "alice",
      state: "open", updated_at: new Date(Date.now() - 3600_000).toISOString(),
      html_url: "", is_mine: false, review_requested: true,
      changed_files: 5, ci_status: "passing",
    },
    body: null,
    head_sha: "abc",
    base_sha: "def",
    draft: false,
    mergeable: null,
    additions: 100,
    deletions: 20,
    reviewers_count: 2,
    ...overrides,
  };
}

describe("PrMetaStrip", () => {
  it("renders author, files, +/-, CI label, reviewer count", () => {
    render(<PrMetaStrip pr={makePr()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("5 arq")).toBeInTheDocument();
    expect(screen.getByText("+100")).toBeInTheDocument();
    expect(screen.getByText("−20")).toBeInTheDocument();
    expect(screen.getAllByText(/CI passou/).length).toBeGreaterThan(0);
    expect(screen.getByText("2 reviewers")).toBeInTheDocument();
  });

  it("singularizes reviewer count when 1", () => {
    render(<PrMetaStrip pr={makePr({ reviewers_count: 1 })} />);
    expect(screen.getByText("1 reviewer")).toBeInTheDocument();
  });

  it("does not show description toggle when body is empty", () => {
    render(<PrMetaStrip pr={makePr({ body: null })} />);
    expect(screen.queryByText(/mostrar descrição/)).not.toBeInTheDocument();
  });

  it("toggles body open and closed", () => {
    render(<PrMetaStrip pr={makePr({ body: "Some PR description here." })} />);
    const btn = screen.getByRole("button", { name: /mostrar descrição/ });
    expect(screen.queryByText("Some PR description here.")).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByText("Some PR description here.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /esconder descrição/ }));
    expect(screen.queryByText("Some PR description here.")).not.toBeInTheDocument();
  });

  it("renders Draft badge when draft=true", () => {
    render(<PrMetaStrip pr={makePr({ draft: true })} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("calls refreshCurrentPr when the refresh button is clicked", () => {
    const spy = vi.fn();
    usePrsStore.setState({ refreshingPr: false, refreshCurrentPr: spy } as never);
    render(<PrMetaStrip pr={makePr()} />);
    fireEvent.click(screen.getByRole("button", { name: /Atualizar PR/ }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("disables the refresh button while refreshing", () => {
    usePrsStore.setState({ refreshingPr: true, refreshCurrentPr: vi.fn() } as never);
    render(<PrMetaStrip pr={makePr()} />);
    expect(screen.getByRole("button", { name: /Atualizar PR/ })).toBeDisabled();
  });
});
