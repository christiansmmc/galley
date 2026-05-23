import { useEffect, useState } from "react";
import { Layout } from "./components/layout/Layout";
import { TitleBar } from "./components/layout/TitleBar";
import { useGlobalShortcuts } from "./components/layout/shortcuts";
import { CommandPalette } from "./components/layout/CommandPalette";
import { PatSection } from "./components/settings/PatSection";
import { SettingsModal } from "./components/settings/SettingsModal";
import { PrListPanel } from "./components/prs/PrListPanel";
import { PrMetaStrip } from "./components/prs/PrMetaStrip";
import { FileTreePanel } from "./components/files/FileTreePanel";
import { DiffPanel } from "./components/diff/DiffPanel";
import { ReviewSubmitPanel } from "./components/review/ReviewSubmitPanel";
import { Banner } from "./components/common/Banner";
import { ToastStack } from "./components/common/Toast";
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
  const { authBanner, setAuthBanner } = useUiStore();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useGlobalShortcuts({ onOpenPalette: () => setPaletteOpen(true) });

  const density = useSettingsStore(s => s.settings?.ui.density ?? "comfortable");

  useEffect(() => { checkPat(); load(); }, [checkPat, load]);
  useEffect(() => {
    if (currentPr) loadDrafts(currentPr.summary.id);
    else clearDrafts();
  }, [currentPr, loadDrafts, clearDrafts]);
  useEffect(() => { document.body.dataset.density = density; }, [density]);

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
      <TitleBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSubmit={() => setSubmitOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      {currentPr && <PrMetaStrip pr={currentPr} />}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Layout
          prList={<PrListPanel />}
          fileTree={<FileTreePanel />}
          diff={<DiffPanel />}
        />
      </div>
      <ReviewSubmitPanel open={submitOpen} onClose={() => setSubmitOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSubmit={() => setSubmitOpen(true)}
      />
      <ToastStack />
    </div>
  );
}
