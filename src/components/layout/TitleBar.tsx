import { useEffect, useState } from "react";
import { ArrowLeft, Minimize2, Minus, Send, Settings, Square, X } from "lucide-react";
import { Button } from "../ui";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { useDraftsStore } from "../../state/draftsStore";
import { closeWindow, isWindowMaximized, minimizeWindow, subscribeWindowResized, toggleMaximizeWindow } from "../../util/window";

interface Props {
  onOpenSettings: () => void;
  onOpenSubmit: () => void;
  onOpenPalette: () => void;
}

/**
 * Graphite-style integrated titlebar — replaces native window chrome and the
 * old `<GlobalHeader>`. The middle slot doubles as the OS drag region (via
 * `data-tauri-drag-region`) so the user can grab the breadcrumb to move the
 * window. Interactive children carry `data-tauri-drag-region="false"` so they
 * still receive clicks.
 */
export function TitleBar({ onOpenSettings, onOpenSubmit, onOpenPalette }: Props) {
  const currentPr = usePrsStore(s => s.currentPr);
  const closePr = usePrsStore(s => s.closePr);
  const setPrListCollapsed = useUiStore(s => s.setPrListCollapsed);
  const draftCount = useDraftsStore(s => s.drafts.length);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    isWindowMaximized().then(setMaximized);
    subscribeWindowResized(() => { isWindowMaximized().then(setMaximized); })
      .then(u => { unlisten = u; });
    return () => { unlisten?.(); };
  }, []);

  const noDrag = { "data-tauri-drag-region": "false" } as Record<string, string>;

  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "0 var(--space-3) 0 var(--space-5)",
        borderBottom: "1px solid var(--c-line)",
        background: "var(--c-mantle)",
        height: 36,
        flex: "0 0 36px",
        userSelect: "none",
      }}
    >
      {currentPr && (
        <span {...noDrag} style={{ display: "inline-flex" }}>
          <Button
            variant="icon"
            size="sm"
            onClick={() => { closePr(); setPrListCollapsed(false); }}
            title="Voltar para a lista"
            aria-label="Voltar para a lista"
          >
            <ArrowLeft size={14} />
          </Button>
        </span>
      )}

      {currentPr ? (
        <div
          data-tauri-drag-region
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Breadcrumb — mono 12. Slashes in overlay, leaf (repo) weight 500. */}
          <span
            data-tauri-drag-region
            aria-label={`${currentPr.summary.owner}/${currentPr.summary.repo}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 400,
              color: "var(--c-subtext)",
              flex: "0 0 auto",
            }}
          >
            <span data-tauri-drag-region>{currentPr.summary.owner}</span>
            <span data-tauri-drag-region style={{ color: "var(--c-overlay)" }}>/</span>
            <span
              data-tauri-drag-region
              style={{ color: "var(--c-text)", fontWeight: 500 }}
            >
              {currentPr.summary.repo}
            </span>
          </span>

          {/* PR number — mono 11 overlay. */}
          <span
            data-tauri-drag-region
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 400,
              color: "var(--c-overlay)",
              flex: "0 0 auto",
              marginLeft: "var(--space-2)",
            }}
          >
            #{currentPr.summary.number}
          </span>

          {/* PR title — sans 13/500, the only sans element this bold in the app. */}
          <span
            data-tauri-drag-region
            title={currentPr.summary.title}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              color: "var(--c-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              marginLeft: "var(--space-3)",
            }}
          >
            {currentPr.summary.title}
          </span>
        </div>
      ) : (
        <span
          data-tauri-drag-region
          style={{
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-semibold)" as unknown as number,
            flex: 1,
          }}
        >
          Pull Requests
        </span>
      )}

      <span {...noDrag} style={{ display: "inline-flex", gap: "var(--space-2)", alignItems: "center" }}>
        <Button
          variant="icon"
          size="sm"
          onClick={onOpenPalette}
          title="Abrir paleta de comandos (Ctrl+K)"
          aria-label="Paleta de comandos"
        >
          <kbd style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--c-line)",
            color: "var(--c-subtext)",
            fontFamily: "inherit",
          }}>⌘K</kbd>
        </Button>

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
          <Settings size={14} />
        </Button>
      </span>

      <span {...noDrag} style={{
        display: "inline-flex",
        gap: 2,
        alignItems: "center",
        marginLeft: "var(--space-2)",
        borderLeft: "1px solid var(--c-line)",
        paddingLeft: "var(--space-2)",
      }}>
        <WindowButton onClick={minimizeWindow} title="Minimizar" aria-label="Minimizar">
          <Minus size={14} />
        </WindowButton>
        <WindowButton
          onClick={toggleMaximizeWindow}
          title={maximized ? "Restaurar" : "Maximizar"}
          aria-label={maximized ? "Restaurar" : "Maximizar"}
        >
          {maximized ? <Minimize2 size={12} /> : <Square size={12} />}
        </WindowButton>
        <WindowButton onClick={closeWindow} title="Fechar" aria-label="Fechar" danger>
          <X size={14} />
        </WindowButton>
      </span>
    </div>
  );
}

function WindowButton({
  onClick, title, children, danger, ...rest
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={rest["aria-label"]}
      style={{
        width: 30,
        height: 26,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: "var(--c-subtext)",
        border: 0,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? "var(--c-danger, #e57373)" : "var(--c-surface0)";
        e.currentTarget.style.color = danger ? "#fff" : "var(--c-text)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--c-subtext)";
      }}
    >
      {children}
    </button>
  );
}
