import { useState } from "react";
import { Modal } from "../ui";
import { ReposSection } from "./ReposSection";
import { FiltersSection } from "./FiltersSection";
import { DiffSection } from "./DiffSection";
import { AparenciaSection } from "./AparenciaSection";
import { ContaSection } from "./ContaSection";
import { AtalhosSection } from "./AtalhosSection";
import { PaletteSection } from "./PaletteSection";

type SectionId = "aparencia" | "repos" | "filtros" | "diff" | "palette" | "conta" | "atalhos";

interface NavItem { id: SectionId; label: string; }

const NAV: NavItem[] = [
  { id: "aparencia", label: "Aparência" },
  { id: "repos", label: "Repositórios" },
  { id: "filtros", label: "Filtros" },
  { id: "diff", label: "Diff" },
  { id: "palette", label: "Paleta" },
  { id: "conta", label: "Conta" },
  { id: "atalhos", label: "Atalhos" },
];

function renderSection(id: SectionId) {
  switch (id) {
    case "aparencia": return <AparenciaSection />;
    case "repos":     return <ReposSection />;
    case "filtros":   return <FiltersSection />;
    case "diff":      return <DiffSection />;
    case "palette":   return <PaletteSection />;
    case "conta":     return <ContaSection />;
    case "atalhos":   return <AtalhosSection />;
  }
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<SectionId>("aparencia");

  return (
    <Modal title="Configurações" open={open} onClose={onClose} minWidth={760} maxWidth={760}>
      <div style={{ display: "flex", minHeight: 480, margin: "calc(-1 * var(--space-7))" }}>
        <nav
          aria-label="Seções"
          style={{
            width: 200, flex: "0 0 auto",
            display: "flex", flexDirection: "column",
            background: "var(--c-mantle)",
            borderRight: "1px solid var(--c-line)",
            padding: "16px 0",
          }}
        >
          {NAV.map(item => {
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 20px",
                  border: 0,
                  borderLeft: selected ? "2px solid var(--c-accent)" : "2px solid transparent",
                  background: selected ? "var(--c-base)" : "transparent",
                  color: selected ? "var(--c-text)" : "var(--c-subtext)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  fontWeight: 400,
                  cursor: "pointer",
                  transition: "color var(--transition-fast), background var(--transition-fast)",
                }}
                aria-current={selected ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1, minWidth: 0, padding: "24px 32px", overflow: "auto" }}>
          {renderSection(active)}
        </div>
      </div>
    </Modal>
  );
}
