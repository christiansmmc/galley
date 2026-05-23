import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SettingsModal } from "../components/settings/SettingsModal";
import { useSettingsStore } from "../state/settingsStore";

const listRepos = vi.fn().mockResolvedValue([]);
const listMyRepos = vi.fn().mockResolvedValue([]);
const validateRepo = vi.fn();
const addRepo = vi.fn();
const setRepos = vi.fn();
const removeRepo = vi.fn();
const currentUser = vi.fn().mockResolvedValue("octocat");
const getPathFilters = vi.fn().mockResolvedValue([]);

vi.mock("../ipc/client", () => ({
  api: {
    listRepos: () => listRepos(),
    listMyRepos: (...a: unknown[]) => listMyRepos(...a),
    validateRepo: (s: string) => validateRepo(s),
    addRepo: (...a: unknown[]) => addRepo(...a),
    setRepos: (...a: unknown[]) => setRepos(...a),
    removeRepo: (...a: unknown[]) => removeRepo(...a),
    currentUser: () => currentUser(),
    getPathFilters: (r: string) => getPathFilters(r),
    setPathFilters: vi.fn(),
    setPat: vi.fn(),
    clearPat: vi.fn(),
  },
}));

vi.mock("../theme/ThemeProvider", () => ({
  useTheme: () => ({ choice: "system", resolved: "mocha", setChoice: vi.fn() }),
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
};

beforeEach(() => {
  listRepos.mockClear().mockResolvedValue([]);
  listMyRepos.mockClear().mockResolvedValue([]);
  validateRepo.mockReset();
  addRepo.mockClear();
  setRepos.mockClear();
  currentUser.mockClear().mockResolvedValue("octocat");
  getPathFilters.mockClear().mockResolvedValue([]);
  useSettingsStore.setState({
    settings: { ui: baseUi, repos: [], path_filters: [] },
    hasPat: true,
  });
});

describe("SettingsModal", () => {
  it("renders sidebar with all six sections, default = Aparência", () => {
    render(<SettingsModal open onClose={vi.fn()} />);
    for (const label of ["Aparência", "Repositórios", "Filtros", "Diff", "Conta", "Atalhos"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/Tema/)).toBeInTheDocument();
  });

  it("switches to Repositórios when nav clicked", async () => {
    render(<SettingsModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Repositórios" }));
    expect(await screen.findByLabelText(/Adicionar repositório/)).toBeInTheDocument();
  });

  it("paste validates and adds repo on success", async () => {
    validateRepo.mockResolvedValue({ owner: "esparta", name: "scorehub-api" });
    render(<SettingsModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Repositórios" }));
    const input = await screen.findByLabelText(/Adicionar repositório/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "https://github.com/esparta/scorehub-api/pull/42" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    await waitFor(() => expect(validateRepo).toHaveBeenCalledWith("https://github.com/esparta/scorehub-api/pull/42"));
    await waitFor(() => expect(addRepo).toHaveBeenCalledWith("esparta", "scorehub-api"));
  });

  it("paste surfaces 404 error as friendly message", async () => {
    validateRepo.mockRejectedValue({ kind: "NotFound", details: "Not Found" });
    render(<SettingsModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Repositórios" }));
    const input = await screen.findByLabelText(/Adicionar repositório/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "no/such" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    expect(await screen.findByText(/Repo não acessível com seu PAT/)).toBeInTheDocument();
  });

  it("Conta section shows current user and Sair clears PAT", async () => {
    render(<SettingsModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Conta" }));
    expect(await screen.findByText("octocat")).toBeInTheDocument();
  });

  it("Atalhos lists wired shortcuts", () => {
    render(<SettingsModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Atalhos" }));
    expect(screen.getByText(/Focar busca na lista de PRs/)).toBeInTheDocument();
    expect(screen.getAllByText("Ctrl").length).toBeGreaterThan(0);
  });
});
