import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useDiffRenderMode, AUTO_INLINE_BELOW_PX } from "../components/diff/useDiffRenderMode";

function setWindowWidth(px: number) {
  (window as { innerWidth: number }).innerWidth = px;
  window.dispatchEvent(new Event("resize"));
}

function mockContainer(initialWidth: number): HTMLElement {
  const el = document.createElement("div");
  let w = initialWidth;
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ width: w, height: 0, x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => "" }),
  });
  (el as unknown as { __setWidth: (n: number) => void }).__setWidth = (n: number) => { w = n; };
  return el;
}

describe("useDiffRenderMode", () => {
  beforeEach(() => setWindowWidth(1400));

  it("returns true for side-by-side regardless of width", () => {
    const el = mockContainer(400);
    const { result } = renderHook(() => useDiffRenderMode("side-by-side", el));
    expect(result.current).toBe(true);
  });

  it("returns false for inline regardless of width", () => {
    const el = mockContainer(2000);
    const { result } = renderHook(() => useDiffRenderMode("inline", el));
    expect(result.current).toBe(false);
  });

  it("auto: side-by-side above threshold, inline below — measures container", () => {
    const el = mockContainer(AUTO_INLINE_BELOW_PX + 100);
    const { result, rerender } = renderHook(({ container }) => useDiffRenderMode("auto", container), {
      initialProps: { container: el as HTMLElement | null },
    });
    expect(result.current).toBe(true);

    // Shrink the container to below threshold and trigger a resize observer
    // notification by re-mounting via a fresh element (jsdom has no RO so the
    // hook falls back to window resize listening on null containers).
    (el as unknown as { __setWidth: (n: number) => void }).__setWidth(AUTO_INLINE_BELOW_PX - 100);
    act(() => {
      // Re-pass the same container; the effect re-runs on dep change so use
      // a sibling element to force a fresh measurement.
      const shrunk = mockContainer(AUTO_INLINE_BELOW_PX - 100);
      rerender({ container: shrunk });
    });
    expect(result.current).toBe(false);
  });

  it("auto: with no container yet, falls back to window width", () => {
    setWindowWidth(AUTO_INLINE_BELOW_PX - 100);
    const { result } = renderHook(() => useDiffRenderMode("auto", null));
    expect(result.current).toBe(false);
    act(() => setWindowWidth(AUTO_INLINE_BELOW_PX + 100));
    expect(result.current).toBe(true);
  });
});
