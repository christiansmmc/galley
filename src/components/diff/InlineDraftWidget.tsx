import type { CommentDraft } from "../../ipc/types";
import { useDraftsStore } from "../../state/draftsStore";
import { inlineWidgetShell } from "./inlineWidgetStyle";

interface Props {
  draft: CommentDraft;
}

/** Saved-draft preview rendered inline as a Monaco view zone. */
export function InlineDraftWidget({ draft }: Props) {
  const remove = useDraftsStore(s => s.remove);
  const isRange = draft.start_line != null && draft.start_line !== draft.line;

  return (
    <div
      style={{
        ...inlineWidgetShell,
        border: "1px solid var(--c-warn)",
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        fontSize: "var(--text-sm)",
        color: "var(--c-warn)",
        marginBottom: "var(--space-2)",
        fontFamily: "var(--font-mono)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>
          {isRange
            ? `Rascunho · L${draft.start_line}–${draft.line} · ${draft.side === "RIGHT" ? "Depois" : "Antes"}`
            : `Rascunho · L${draft.line} · ${draft.side === "RIGHT" ? "Depois" : "Antes"}`}
        </span>
        <button
          onClick={() => remove(draft.id)}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--c-danger)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            padding: 0,
          }}
        >Apagar</button>
      </div>
      <div style={{ fontSize: "var(--text-md)", color: "var(--c-text)", whiteSpace: "pre-wrap" }}>{draft.body}</div>
    </div>
  );
}
