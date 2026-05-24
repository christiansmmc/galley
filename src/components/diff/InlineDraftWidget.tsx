import type { CommentDraft } from "../../ipc/types";
import { useDraftsStore } from "../../state/draftsStore";
import { Button } from "../ui";
import { inlineWidgetShell } from "./inlineWidgetStyle";
import { formatAge } from "../../util/time";

interface Props {
  draft: CommentDraft;
}

/**
 * Saved-draft preview rendered inline as a Monaco view zone.
 *
 * Etapa 3 · S6 visual: dashed warn left rule + RASCUNHO tag carry the
 * pending state. "incluir no review" opens the global review submit
 * panel via a window event (App owns the modal state).
 */
export function InlineDraftWidget({ draft }: Props) {
  const remove = useDraftsStore(s => s.remove);
  const isRange = draft.start_line != null && draft.start_line !== draft.line;
  const sideLabel = draft.side === "RIGHT" ? "direita" : "esquerda";
  const lineLabel = isRange
    ? `L${draft.start_line}–${draft.line}`
    : `L${draft.line}`;
  const age = formatAge(draft.created_at);

  return (
    <div
      className="prr-inline-widget"
      style={{
        ...inlineWidgetShell,
        borderLeft: "2px dashed var(--c-warn)",
        paddingLeft: 14,
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-subtext)",
        marginBottom: 10,
      }}>
        <span>
          <b style={{ color: "var(--c-text)", fontWeight: 500 }}>{lineLabel}</b>
          {` · ${sideLabel} · rascunho · ${age}`}
        </span>
        <span style={{
          fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-warn)",
        }}>RASCUNHO</span>
      </div>

      <div style={{
        fontSize: 12.5, lineHeight: 1.55, color: "var(--c-subtext)",
        fontStyle: "italic", whiteSpace: "pre-wrap",
      }}>{draft.body}</div>

      <div style={{
        display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 10,
      }}>
        <Button variant="link" onClick={() => remove(draft.id)}>descartar</Button>
        <Button
          variant="link"
          tone="accent"
          onClick={() => window.dispatchEvent(new CustomEvent("prr:open-submit"))}
        >incluir no review</Button>
      </div>
    </div>
  );
}
