import { useEffect, useState } from "react";
import type { DiffRenderMode } from "../../ipc/types";

/**
 * Threshold (px) below which `auto` mode falls back to inline view.
 * Measured against the diff panel's own width (not the window), so the
 * side panels squeezing the diff is correctly accounted for. 1100 px is
 * roughly two columns of ~80 chars at the default JetBrains Mono 13 px
 * plus gutters.
 */
export const AUTO_INLINE_BELOW_PX = 1100;

/**
 * Resolves the active diff render mode. When `pref === "auto"`, observes
 * the container's width via ResizeObserver and flips to inline below
 * AUTO_INLINE_BELOW_PX.
 */
export function useDiffRenderMode(
  pref: DiffRenderMode | undefined,
  container: HTMLElement | null,
): boolean {
  const [sideBySide, setSideBySide] = useState<boolean>(() => initial(pref));

  useEffect(() => {
    const mode = pref ?? "auto";
    if (mode === "side-by-side") { setSideBySide(true); return; }
    if (mode === "inline") { setSideBySide(false); return; }

    const measure = () => {
      const w = container?.getBoundingClientRect().width
        ?? (typeof window !== "undefined" ? window.innerWidth : 0);
      setSideBySide(w >= AUTO_INLINE_BELOW_PX);
    };
    measure();

    if (!container) {
      // Container not mounted yet — fall back to window width and listen on resize.
      if (typeof window === "undefined") return;
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    if (typeof ResizeObserver === "undefined") {
      // jsdom / very old browser — degrade to window resize listening.
      if (typeof window === "undefined") return;
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [pref, container]);

  return sideBySide;
}

function initial(pref: DiffRenderMode | undefined): boolean {
  const mode = pref ?? "auto";
  if (mode === "side-by-side") return true;
  if (mode === "inline") return false;
  // Default to side-by-side pre-measurement; the effect corrects it.
  return true;
}
