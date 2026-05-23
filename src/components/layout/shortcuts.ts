import { useEffect } from "react";
import { useUiStore } from "../../state/uiStore";

interface Opts {
  /** Called when the user hits Ctrl/Cmd+K to summon the command palette. */
  onOpenPalette?: () => void;
}

/**
 * Global keyboard shortcuts:
 * - Ctrl/Cmd+1 → toggle PR list panel
 * - Ctrl/Cmd+2 → toggle file tree drawer
 * - Ctrl/Cmd+K → open command palette
 */
export function useGlobalShortcuts(opts: Opts = {}) {
  const togglePrList = useUiStore(s => s.togglePrList);
  const toggleFileTree = useUiStore(s => s.toggleFileTree);
  const { onOpenPalette } = opts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "1") { e.preventDefault(); togglePrList(); }
      else if (e.key === "2") { e.preventDefault(); toggleFileTree(); }
      else if (e.key.toLowerCase() === "k") { e.preventDefault(); onOpenPalette?.(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePrList, toggleFileTree, onOpenPalette]);
}
