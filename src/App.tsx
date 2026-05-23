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
import { useSettingsStore } from "./state/settingsStore";
import { usePrsStore } from "./state/prsStore";
import { useDraftsStore } from "./state/draftsStore";
import { useUiStore } from "./state/uiStore";

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
        padding: "6px 12px", borderBottom: "1px solid var(--c-surface0)",
        background: "var(--c-mantle)",
      }}>
        <button onClick={() => setSettingsOpen(true)} title="Configurações" style={{
          background: "transparent", border: 0, color: "var(--c-subtext)", cursor: "pointer",
        }}>
          <Settings size={16} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Layout prList={<PrListPanel />} fileTree={<FileTreePanel />} diff={<DiffPanel />} />
      </div>
      {currentPr && (
        <button
          onClick={() => setSubmitOpen(true)}
          style={{
            position: "fixed", bottom: 16, right: 16, padding: "10px 16px",
            borderRadius: 999, border: 0, background: "var(--c-accent)",
            color: "white", cursor: "pointer", fontWeight: 500,
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            zIndex: 50,
          }}
        >
          Enviar review{draftCount > 0 ? ` (${draftCount})` : ""}
        </button>
      )}
      <ReviewSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ToastStack />
    </div>
  );
}
