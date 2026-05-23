import { useEffect } from "react";

interface Cfg {
  togglePrList: () => void;
  toggleFileTree: () => void;
}

export function useShortcuts({ togglePrList, toggleFileTree }: Cfg) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      if (e.key === "1") { e.preventDefault(); togglePrList(); }
      else if (e.key === "2") { e.preventDefault(); toggleFileTree(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePrList, toggleFileTree]);
}
