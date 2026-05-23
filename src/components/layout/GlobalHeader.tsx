import { ArrowLeft, ChevronRight, Send, Settings, Files } from "lucide-react";
import { Button } from "../ui";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { useDraftsStore } from "../../state/draftsStore";

interface Props {
  onOpenSettings: () => void;
  onOpenSubmit: () => void;
}

export function GlobalHeader({ onOpenSettings, onOpenSubmit }: Props) {
  const currentPr = usePrsStore(s => s.currentPr);
  const prListCollapsed = useUiStore(s => s.prListCollapsed);
  const setPrListCollapsed = useUiStore(s => s.setPrListCollapsed);
  const toggleFileTree = useUiStore(s => s.toggleFileTree);
  const fileTreeCollapsed = useUiStore(s => s.fileTreeCollapsed);
  const draftCount = useDraftsStore(s => s.drafts.length);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-5)",
      borderBottom: "1px solid var(--c-surface0)",
      background: "var(--c-mantle)",
      minHeight: 44,
    }}>
      {currentPr && prListCollapsed && (
        <Button
          variant="icon"
          size="sm"
          onClick={() => setPrListCollapsed(false)}
          title="Voltar para a lista (Ctrl+1)"
          aria-label="Voltar para a lista"
        >
          <ArrowLeft size={16} />
        </Button>
      )}

      {currentPr ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          minWidth: 0,
          flex: 1,
          fontSize: "var(--text-md)",
        }}>
          <span style={{ color: "var(--c-subtext)" }}>
            {currentPr.summary.owner}/{currentPr.summary.repo}
          </span>
          <ChevronRight size={14} style={{ color: "var(--c-overlay)", flex: "0 0 auto" }} />
          <span style={{ color: "var(--c-subtext)", flex: "0 0 auto" }}>
            #{currentPr.summary.number}
          </span>
          <span
            title={currentPr.summary.title}
            style={{
              color: "var(--c-text)",
              fontWeight: "var(--weight-medium)" as unknown as number,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {currentPr.summary.title}
          </span>
        </div>
      ) : (
        <span style={{
          fontSize: "var(--text-md)",
          fontWeight: "var(--weight-semibold)" as unknown as number,
          flex: 1,
        }}>
          Pull Requests
        </span>
      )}

      {currentPr && (
        <Button
          variant="icon"
          size="sm"
          onClick={toggleFileTree}
          title="Arquivos (Ctrl+2)"
          aria-label="Arquivos"
          aria-pressed={!fileTreeCollapsed}
        >
          <Files size={16} />
        </Button>
      )}

      {currentPr && (
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenSubmit}
          title="Enviar review"
        >
          <Send size={14} style={{ marginRight: "var(--space-2)" }} />
          Revisar{draftCount > 0 ? ` (${draftCount})` : ""}
        </Button>
      )}

      <Button
        variant="icon"
        size="sm"
        onClick={onOpenSettings}
        title="Configurações"
        aria-label="Configurações"
      >
        <Settings size={16} />
      </Button>
    </div>
  );
}
