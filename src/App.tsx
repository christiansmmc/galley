import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Layout } from "./components/layout/Layout";
import { PatSection } from "./components/settings/PatSection";
import { SettingsModal } from "./components/settings/SettingsModal";
import { PrListPanel } from "./components/prs/PrListPanel";
import { FileTreePanel } from "./components/files/FileTreePanel";
import { DiffPanel } from "./components/diff/DiffPanel";
import { ReviewSubmitModal } from "./components/review/ReviewSubmitModal";
import { Banner } from "./components/common/Banner";
import { ToastStack } from "./components/common/Toast";
import { Button } from "./components/ui";
import { useSettingsStore } from "./state/settingsStore";
import { usePrsStore } from "./state/prsStore";
import { useDraftsStore } from "./state/draftsStore";
import { useUiStore } from "./state/uiStore";
import { UiGallery } from "./components/ui/UiGallery";

export default function App() {
  const { hasPat, checkPat, load } = useSettingsStore();
  const currentPr = usePrsStore(s => s.currentPr);
  const loadDrafts = useDraftsStore(s => s.load);
  const clearDrafts = useDraftsStore(s => s.clear);
  const draftCount = useDraftsStore(s => s.drafts.length);
  const { authBanner, setAuthBanner } = useUiStore();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { checkPat(); load(); }, [checkPat, load]);
  useEffect(() => {
    if (currentPr) loadDrafts(currentPr.summary.id);
    else clearDrafts();
  }, [currentPr, loadDrafts, clearDrafts]);

  if (typeof window !== "undefined" && window.location.hash === "#/__ui") {
    return <UiGallery />;
  }

  if (!hasPat) return <PatSection onDone={checkPat} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {authBanner && (
        <Banner kind="error" onAction={{ label: "Configurar", onClick: () => { setSettingsOpen(true); setAuthBanner(false); } }}>
          Token inválido. Reautentique nas configurações.
        </Banner>
      )}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        padding: "var(--space-3) var(--space-6)",
        borderBottom: "1px solid var(--c-surface0)",
        background: "var(--c-mantle)",
      }}>
        <Button
          variant="icon"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          title="Configurações"
          aria-label="Configurações"
        >
          <Settings size={16} />
        </Button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Layout prList={<PrListPanel />} fileTree={<FileTreePanel />} diff={<DiffPanel />} />
      </div>
      {currentPr && (
        <Button
          variant="primary"
          size="lg"
          onClick={() => setSubmitOpen(true)}
          style={{
            position: "fixed",
            bottom: "var(--space-7)",
            right: "var(--space-7)",
            borderRadius: "var(--radius-pill)",
            paddingLeft: "var(--space-7)",
            paddingRight: "var(--space-7)",
            boxShadow: "var(--shadow-md)",
            zIndex: "var(--z-floating)" as unknown as number,
          }}
        >
          Enviar review{draftCount > 0 ? ` (${draftCount})` : ""}
        </Button>
      )}
      <ReviewSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ToastStack />
    </div>
  );
}
