import { Modal } from "../common/Modal";
import { ReposSection } from "./ReposSection";
import { FiltersSection } from "./FiltersSection";
import { PatSection } from "./PatSection";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeChoice } from "../../ipc/types";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { choice, setChoice } = useTheme();

  return (
    <Modal title="Configurações" open={open} onClose={onClose}>
      <ReposSection />
      <FiltersSection />
      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 8px" }}>Tema</h4>
        <div style={{ display: "flex", gap: 6 }}>
          {(["system", "light", "dark"] as ThemeChoice[]).map(t => (
            <button
              key={t}
              onClick={() => setChoice(t)}
              style={{
                flex: 1, padding: 8, borderRadius: 4,
                border: "1px solid var(--c-surface1)",
                background: choice === t ? "var(--c-surface0)" : "transparent",
                color: "var(--c-text)", cursor: "pointer", fontSize: 12,
              }}
            >{t}</button>
          ))}
        </div>
      </section>
      <section>
        <h4 style={{ margin: "0 0 8px" }}>Token</h4>
        <PatSection />
      </section>
    </Modal>
  );
}
