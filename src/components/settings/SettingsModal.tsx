import { useState } from "react";
import { Modal } from "../ui";
import { ReposSection } from "./ReposSection";
import { FiltersSection } from "./FiltersSection";
import { DiffSection } from "./DiffSection";
import { AparenciaSection } from "./AparenciaSection";
import { ContaSection } from "./ContaSection";
import { AtalhosSection } from "./AtalhosSection";

type SectionId = "aparencia" | "repos" | "filtros" | "diff" | "conta" | "atalhos";

interface NavItem { id: SectionId; label: string; }

const NAV: NavItem[] = [
  { id: "aparencia", label: "Aparência" },
  { id: "repos", label: "Repositórios" },
  { id: "filtros", label: "Filtros" },
  { id: "diff", label: "Diff" },
  { id: "conta", label: "Conta" },
  { id: "atalhos", label: "Atalhos" },
];

function renderSection(id: SectionId) {
  switch (id) {
    case "aparencia": return <AparenciaSection />;
    case "repos":     return <ReposSection />;
    case "filtros":   return <FiltersSection />;
    case "diff":      return <DiffSection />;
    case "conta":     return <ContaSection />;
    case "atalhos":   return <AtalhosSection />;
  }
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<SectionId>("aparencia");

  return (
    <Modal title="Configurações" open={open} onClose={onClose} minWidth={720} maxWidth={920}>
      <div style={{ display: "flex", gap: "var(--space-7)", minHeight: 480 }}>
        <nav
          aria-label="Seções"
          style={{
            width: 180, flex: "0 0 auto",
            display: "flex", flexDirection: "column", gap: "var(--space-1)",
            borderRight: "1px solid var(--c-surface0)",
            paddingRight: "var(--space-4)",
          }}
        >
          {NAV.map(item => {
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className="prr-row"
                data-selected={selected}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-3) var(--space-4)",
                  border: 0,
                  background: "transparent",
                  color: selected ? "var(--c-text)" : "var(--c-subtext)",
                  fontSize: "var(--text-md)",
                  fontWeight: (selected ? "var(--weight-medium)" : "var(--weight-regular)") as unknown as number,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
                aria-current={selected ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1, minWidth: 0 }}>
          {renderSection(active)}
        </div>
      </div>
    </Modal>
  );
}
