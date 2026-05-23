import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowseReposModal } from "../components/settings/BrowseReposModal";
import type { RemoteRepo } from "../ipc/types";

const listMyRepos = vi.fn();

vi.mock("../ipc/client", () => ({
  api: {
    listMyRepos: (...a: unknown[]) => listMyRepos(...a),
  },
}));

function makeRepo(overrides: Partial<RemoteRepo>): RemoteRepo {
  return {
    owner: "foo", name: "bar", full_name: "foo/bar",
    description: null, fork: false, archived: false, private: false,
    owner_type: "user", updated_at: "", stargazers_count: 0,
    ...overrides,
  };
}

beforeEach(() => {
  listMyRepos.mockReset();
});

describe("BrowseReposModal", () => {
  it("lists remote repos and saves selection diff", async () => {
    listMyRepos.mockResolvedValue([
      makeRepo({ owner: "esparta", name: "scorehub-api", full_name: "esparta/scorehub-api" }),
      makeRepo({ owner: "foo", name: "bar", full_name: "foo/bar" }),
    ]);
    const onSaved = vi.fn();
    render(
      <BrowseReposModal
        open
        onClose={vi.fn()}
        configured={[{ owner: "foo", name: "bar" }]}
        onSaved={onSaved}
      />,
    );
    await screen.findByText("esparta/scorehub-api");
    // foo/bar pre-checked; esparta/scorehub-api unchecked.
    const espartaCheckbox = screen.getByLabelText("esparta/scorehub-api") as HTMLInputElement;
    expect(espartaCheckbox.checked).toBe(false);
    fireEvent.click(espartaCheckbox);
    fireEvent.click(screen.getByRole("button", { name: /Salvar/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const next = onSaved.mock.calls[0][0];
    expect(next).toEqual(expect.arrayContaining([
      { owner: "foo", name: "bar" },
      { owner: "esparta", name: "scorehub-api" },
    ]));
  });

  it("toggling Forks pill resets pagination and refetches", async () => {
    listMyRepos.mockResolvedValue([]);
    render(
      <BrowseReposModal open onClose={vi.fn()} configured={[]} onSaved={vi.fn()} />,
    );
    await waitFor(() => expect(listMyRepos).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Forks/ }));
    await waitFor(() => expect(listMyRepos).toHaveBeenCalledTimes(2));
    const lastCall = listMyRepos.mock.calls[1];
    expect(lastCall[0]).toBe(1);
    expect(lastCall[1].include_forks).toBe(true);
  });
});
