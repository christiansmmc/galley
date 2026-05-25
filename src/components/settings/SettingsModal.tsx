import { useCallback, useRef, useState } from "react";
import { Modal } from "../ui";
import { ReposSection } from "./ReposSection";
import { FiltersSection } from "./FiltersSection";
import { DiffSection } from "./DiffSection";
import { AparenciaSection } from "./AparenciaSection";
import { ContaSection } from "./ContaSection";
import { AtalhosSection } from "./AtalhosSection";
import { PaletteSection } from "./PaletteSection";
import { useT } from "../../i18n";
import { usePrsStore } from "../../state/prsStore";

type SectionId = "aparencia" | "repos" | "filtros" | "diff" | "palette" | "conta" | "atalhos";

interface NavItem { id: SectionId; labelKey: string; }

const NAV: NavItem[] = [
  { id: "aparencia", labelKey: "settings.nav.appearance" },
  { id: "repos", labelKey: "settings.nav.repos" },
  { id: "filtros", labelKey: "settings.nav.filters" },
  { id: "diff", labelKey: "settings.nav.diff" },
  { id: "palette", labelKey: "settings.nav.palette" },
  { id: "conta", labelKey: "settings.nav.account" },
  { id: "atalhos", labelKey: "settings.nav.shortcuts" },
];

function renderSection(id: SectionId, onReposChanged: () => void) {
  switch (id) {
    case "aparencia": return <AparenciaSection />;
    case "repos":     return <ReposSection onReposChanged={onReposChanged} />;
    case "filtros":   return <FiltersSection />;
    case "diff":      return <DiffSection />;
    case "palette":   return <PaletteSection />;
    case "conta":     return <ContaSection />;
    case "atalhos":   return <AtalhosSection />;
  }
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [active, setActive] = useState<SectionId>("aparencia");
  const reposDirty = useRef(false);
  const refreshLists = usePrsStore(s => s.refreshLists);

  const handleClose = useCallback(() => {
    if (reposDirty.current) {
      reposDirty.current = false;
      void refreshLists();
    }
    onClose();
  }, [onClose, refreshLists]);

  const markReposDirty = useCallback(() => { reposDirty.current = true; }, []);

  return (
    <Modal title={t("settings.title")} open={open} onClose={handleClose} minWidth={760} maxWidth={760}>
      <div style={{ display: "flex", flex: "1 1 auto", minHeight: 480, margin: "calc(-1 * var(--space-7))" }}>
        <nav
          aria-label={t("settings.sections_aria")}
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
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: "24px 32px", overflow: "auto", display: "flex", flexDirection: "column" }}>
          {renderSection(active, markReposDirty)}
        </div>
      </div>
    </Modal>
  );
}
