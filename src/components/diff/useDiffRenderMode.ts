import { useEffect, useState } from "react";
import type { DiffRenderMode } from "../../ipc/types";

/**
 * Resolves the active diff render mode given the user pref and the current
 * viewport width. `auto` switches to inline below 1100 px.
 */
export const AUTO_INLINE_BELOW_PX = 1100;

export function useDiffRenderMode(pref: DiffRenderMode | undefined): boolean {
  // Default to side-by-side when pref hasn't loaded yet, matches pre-2.4 behavior.
  const [sideBySide, setSideBySide] = useState<boolean>(() => resolve(pref ?? "auto"));

  useEffect(() => {
    const compute = () => setSideBySide(resolve(pref ?? "auto"));
    compute();
    if ((pref ?? "auto") !== "auto") return;
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [pref]);

  return sideBySide;
}

function resolve(mode: DiffRenderMode): boolean {
  if (mode === "side-by-side") return true;
  if (mode === "inline") return false;
  return typeof window !== "undefined" && window.innerWidth >= AUTO_INLINE_BELOW_PX;
}
