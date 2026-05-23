import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeChoice } from "../ipc/types";

type ResolvedTheme = "paper" | "linen";

interface Ctx {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (c: ThemeChoice) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved: ResolvedTheme = useMemo(() => {
    if (choice === "system") return systemDark ? "linen" : "paper";
    return choice === "dark" ? "linen" : "paper";
  }, [choice, systemDark]);

  useEffect(() => {
    document.body.dataset.theme = resolved;
  }, [resolved]);

  return (
    <ThemeCtx.Provider value={{ choice, resolved, setChoice }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
