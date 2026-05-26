import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PatSection } from "../components/settings/PatSection";

const startDeviceLogin = vi.fn();
const pollDeviceLogin = vi.fn();
const hasPat = vi.fn().mockResolvedValue(true);
const setPat = vi.fn().mockResolvedValue(undefined);

vi.mock("../ipc/client", () => ({
  api: {
    startDeviceLogin: () => startDeviceLogin(),
    pollDeviceLogin: () => pollDeviceLogin(),
    hasPat: () => hasPat(),
    setPat: (t: string) => setPat(t),
    openExternalUrl: vi.fn(),
  },
}));

beforeEach(() => {
  startDeviceLogin.mockReset();
  pollDeviceLogin.mockReset();
  hasPat.mockClear().mockResolvedValue(true);
  setPat.mockClear().mockResolvedValue(undefined);
});

describe("PatSection device login", () => {
  it("renders the primary GitHub login button", () => {
    render(<PatSection />);
    expect(screen.getByRole("button", { name: /Entrar com o GitHub/ })).toBeInTheDocument();
  });

  it("clicking login starts device flow, shows the user code, then polls", async () => {
    startDeviceLogin.mockResolvedValue({
      user_code: "WXYZ-1234",
      verification_uri: "https://github.com/login/device",
    });
    let resolvePoll: () => void = () => {};
    pollDeviceLogin.mockImplementation(
      () => new Promise<void>((res) => { resolvePoll = res; }),
    );
    const onDone = vi.fn();
    render(<PatSection onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: /Entrar com o GitHub/ }));

    // Step 1 invoked; code displayed prominently.
    await waitFor(() => expect(startDeviceLogin).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("WXYZ-1234")).toBeInTheDocument();
    expect(screen.getByText(/aguardando autorização/)).toBeInTheDocument();
    expect(pollDeviceLogin).toHaveBeenCalledTimes(1);

    // Step 2 resolves -> checkPat + onDone fire.
    resolvePoll();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(hasPat).toHaveBeenCalled();
  });

  it("surfaces an error when device login fails", async () => {
    startDeviceLogin.mockRejectedValue({ kind: "Internal", details: "boom" });
    render(<PatSection />);
    fireEvent.click(screen.getByRole("button", { name: /Entrar com o GitHub/ }));
    expect(await screen.findByText(/Erro interno/)).toBeInTheDocument();
  });
});
