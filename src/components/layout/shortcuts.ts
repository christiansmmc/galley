import { useEffect } from "react";
import { useUiStore } from "../../state/uiStore";

/**
 * Global keyboard shortcuts:
 * - Ctrl/Cmd+1 → toggle PR list panel
 * - Ctrl/Cmd+2 → toggle file tree drawer
 */
export function useGlobalShortcuts() {
  const togglePrList = useUiStore(s => s.togglePrList);
  const toggleFileTree = useUiStore(s => s.toggleFileTree);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "1") { e.preventDefault(); togglePrList(); }
      else if (e.key === "2") { e.preventDefault(); toggleFileTree(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePrList, toggleFileTree]);
}
