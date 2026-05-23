import { Modal, Button } from "../ui";
import { ReposSection } from "./ReposSection";
import { FiltersSection } from "./FiltersSection";
import { DiffSection } from "./DiffSection";
import { PatSection } from "./PatSection";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeChoice } from "../../ipc/types";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { choice, setChoice } = useTheme();

  return (
    <Modal title="Configurações" open={open} onClose={onClose}>
      <ReposSection />
      <FiltersSection />
      <DiffSection />
      <section style={{ marginBottom: "var(--space-7)" }}>
        <h4 style={{ margin: "0 0 var(--space-4)" }}>Tema</h4>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {(["system", "light", "dark"] as ThemeChoice[]).map(t => (
            <Button
              key={t}
              variant={choice === t ? "subtle" : "ghost"}
              size="sm"
              fullWidth
              onClick={() => setChoice(t)}
            >{t}</Button>
          ))}
        </div>
      </section>
      <section>
        <h4 style={{ margin: "0 0 var(--space-4)" }}>Token</h4>
        <PatSection />
      </section>
    </Modal>
  );
}
