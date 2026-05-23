import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useDiffRenderMode, AUTO_INLINE_BELOW_PX } from "../components/diff/useDiffRenderMode";

function setWidth(px: number) {
  (window as { innerWidth: number }).innerWidth = px;
  window.dispatchEvent(new Event("resize"));
}

describe("useDiffRenderMode", () => {
  beforeEach(() => setWidth(1400));

  it("returns true for side-by-side regardless of width", () => {
    setWidth(800);
    const { result } = renderHook(() => useDiffRenderMode("side-by-side"));
    expect(result.current).toBe(true);
  });

  it("returns false for inline regardless of width", () => {
    setWidth(1600);
    const { result } = renderHook(() => useDiffRenderMode("inline"));
    expect(result.current).toBe(false);
  });

  it("auto: side-by-side above threshold, inline below", () => {
    setWidth(AUTO_INLINE_BELOW_PX + 100);
    const { result } = renderHook(() => useDiffRenderMode("auto"));
    expect(result.current).toBe(true);
    act(() => setWidth(AUTO_INLINE_BELOW_PX - 100));
    expect(result.current).toBe(false);
  });
});
