import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PrDescription } from "../components/prs/PrDescription";

const openExternalUrl = vi.fn().mockResolvedValue(undefined);

vi.mock("../ipc/client", () => ({
  api: { openExternalUrl: (...args: unknown[]) => openExternalUrl(...args) },
}));

beforeEach(() => openExternalUrl.mockClear());

describe("PrDescription", () => {
  it("renders GitHub's HTML as real elements", () => {
    render(<PrDescription html={"<h2>Why</h2><ul><li><strong>Moves</strong> code</li></ul>"} fallback="## Why" />);
    expect(screen.getByRole("heading", { level: 2, name: "Why" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("Moves code");
    expect(screen.queryByText("## Why")).not.toBeInTheDocument();
  });

  it("strips scripts, inline handlers and javascript: links", () => {
    const { container } = render(
      <PrDescription
        html={`<p>ok</p><script>window.x = 1</script><img src="a.png" onerror="window.x = 1"><a href="javascript:window.x = 1">bad</a>`}
        fallback={null}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("onerror")).toBeNull();
    expect(screen.getByText("bad").getAttribute("href")).toBeNull();
  });

  it("opens http(s) links in the system browser instead of navigating the app", () => {
    render(<PrDescription html={`<a href="https://github.com/x/y/pull/1">PR</a>`} fallback={null} />);
    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.click(screen.getByText("PR"))).toBe(false);
    expect(openExternalUrl).toHaveBeenCalledWith("https://github.com/x/y/pull/1");
  });

  it("opens the link when the click lands on an element inside it", () => {
    render(<PrDescription html={`<a href="https://example.com/a.png"><img src="a.png" alt="shot"></a>`} fallback={null} />);
    fireEvent.click(screen.getByAltText("shot"));
    expect(openExternalUrl).toHaveBeenCalledWith("https://example.com/a.png");
  });

  it("keeps in-page anchors from navigating the app or opening a browser", () => {
    render(<PrDescription html={`<a href="#user-content-why">jump</a>`} fallback={null} />);
    expect(fireEvent.click(screen.getByText("jump"))).toBe(false);
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("shows the raw text, without interpreting it, when there is no rendered HTML", () => {
    const { container } = render(<PrDescription html={null} fallback={"<b>raw</b> **body**"} />);
    expect(screen.getByText("<b>raw</b> **body**")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
  });
});
