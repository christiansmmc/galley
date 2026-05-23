import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PrListPanel } from "../components/prs/PrListPanel";
import { usePrsStore } from "../state/prsStore";

vi.mock("../ipc/client", () => ({
  api: { listPrs: vi.fn().mockResolvedValue([]) },
}));

beforeEach(() => {
  usePrsStore.setState({
    mine: [
      { id: 1, owner: "x", repo: "y", number: 1, title: "Mine 1", author: "me", state: "open", updated_at: "", html_url: "", is_mine: true, review_requested: false },
    ],
    reviewRequested: [
      { id: 2, owner: "x", repo: "y", number: 2, title: "RR 2", author: "other", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true },
    ],
    loadingLists: false, listError: null,
    refreshLists: vi.fn().mockResolvedValue(undefined),
    openPr: vi.fn(),
    currentPr: null,
  } as never);
});

describe("PrListPanel", () => {
  it("switches between tabs", () => {
    render(<PrListPanel />);
    expect(screen.getByText("RR 2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Meus"));
    expect(screen.getByText("Mine 1")).toBeInTheDocument();
  });
});
