import { Modal } from "../ui";
import { ReposSection } from "./ReposSection";
import { FiltersSection } from "./FiltersSection";
import { DiffSection } from "./DiffSection";
import { AparenciaSection } from "./AparenciaSection";
import { PatSection } from "./PatSection";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal title="Configurações" open={open} onClose={onClose}>
      <ReposSection />
      <FiltersSection />
      <DiffSection />
      <AparenciaSection />
      <section>
        <h4 style={{ margin: "0 0 var(--space-4)" }}>Token</h4>
        <PatSection />
      </section>
    </Modal>
  );
}
