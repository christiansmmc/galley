import { useEffect, useState } from "react";
import { Layout } from "./components/layout/Layout";
import { TitleBar } from "./components/layout/TitleBar";
import { ResizeHandles } from "./components/layout/ResizeHandles";
import { StatusLine } from "./components/layout/StatusLine";
import { useGlobalShortcuts } from "./components/layout/shortcuts";
import { CommandPalette } from "./components/layout/CommandPalette";
import { PatSection } from "./components/settings/PatSection";
import { SettingsModal } from "./components/settings/SettingsModal";
import { PrListPanel } from "./components/prs/PrListPanel";
import { FileTreePanel } from "./components/files/FileTreePanel";
import { DiffPanel } from "./components/diff/DiffPanel";
import { ReviewSubmitPanel } from "./components/review/ReviewSubmitPanel";
import { MergePanel } from "./components/review/MergePanel";
import { ErrorBlock } from "./components/ui";
import { ToastStack } from "./components/common/Toast";
import { useSettingsStore } from "./state/settingsStore";
import { usePrsStore } from "./state/prsStore";
import { useDraftsStore } from "./state/draftsStore";
import { useUiStore } from "./state/uiStore";
import { UiGallery } from "./components/ui/UiGallery";
import { useCiAutoRefresh } from "./hooks/useCiAutoRefresh";
import { useT } from "./i18n";

export default function App() {
  const t = useT();
  const { hasPat, checkPat, load } = useSettingsStore();
  const currentPr = usePrsStore(s => s.currentPr);
  const loadDrafts = useDraftsStore(s => s.load);
  const clearDrafts = useDraftsStore(s => s.clear);
  const { authBanner, setAuthBanner } = useUiStore();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useGlobalShortcuts({ onOpenPalette: () => setPaletteOpen(true) });
  useCiAutoRefresh();

  const density = useSettingsStore(s => s.settings?.ui.density ?? "comfortable");
  const accent = useSettingsStore(s => s.settings?.ui.accent_color ?? "sage");
  const ftCollapsed = useSettingsStore(s => s.settings?.ui.filetree_collapsed);

  useEffect(() => { checkPat(); load(); }, [checkPat, load]);
  useEffect(() => {
    if (ftCollapsed !== undefined) useUiStore.setState({ fileTreeCollapsed: ftCollapsed });
  }, [ftCollapsed]);
  useEffect(() => {
    if (currentPr) loadDrafts(currentPr.summary.id);
    else clearDrafts();
  }, [currentPr, loadDrafts, clearDrafts]);
  useEffect(() => { document.body.dataset.density = density; }, [density]);
  useEffect(() => { document.body.dataset.accent = accent; }, [accent]);
  useEffect(() => {
    const handler = () => setSubmitOpen(true);
    window.addEventListener("prr:open-submit", handler);
    return () => window.removeEventListener("prr:open-submit", handler);
  }, []);

  if (typeof window !== "undefined" && window.location.hash === "#/__ui") {
    return <UiGallery />;
  }

  if (!hasPat) return <PatSection onDone={checkPat} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {authBanner && (
        <ErrorBlock
          source={t("auth.source_github")}
          message={t("auth.unauthorized")}
          action={{
            label: t("auth.reauth"),
            onClick: () => { setSettingsOpen(true); setAuthBanner(false); },
          }}
        />
      )}
      <TitleBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSubmit={() => setSubmitOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenMerge={() => setMergeOpen(true)}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <Layout
          prList={<PrListPanel />}
          fileTree={<FileTreePanel />}
          diff={<DiffPanel />}
        />
      </div>
      <ReviewSubmitPanel open={submitOpen} onClose={() => setSubmitOpen(false)} />
      <MergePanel open={mergeOpen} onClose={() => setMergeOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSubmit={() => setSubmitOpen(true)}
      />
      <ToastStack />
      <ResizeHandles />
      <StatusLine />
    </div>
  );
}
