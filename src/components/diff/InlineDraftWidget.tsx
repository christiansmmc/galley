import type { CommentDraft } from "../../ipc/types";
import { useDraftsStore } from "../../state/draftsStore";

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
        margin: "4px 24px",
        padding: 10,
        borderRadius: 6,
        border: "1px solid var(--c-amber)",
        background: "var(--c-mantle)",
        fontFamily: "var(--font-ui)",
        position: "relative",
        zIndex: 1,
        pointerEvents: "auto",
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, color: "var(--c-amber)", marginBottom: 4, fontFamily: "var(--font-mono)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          {isRange
            ? `Rascunho · L${draft.start_line}–${draft.line} · ${draft.side === "RIGHT" ? "Depois" : "Antes"}`
            : `Rascunho · L${draft.line} · ${draft.side === "RIGHT" ? "Depois" : "Antes"}`}
        </span>
        <button
          onClick={() => remove(draft.id)}
          style={{
            background: "transparent", border: 0, color: "var(--c-red)",
            cursor: "pointer", fontSize: 11, padding: 0,
          }}
        >Apagar</button>
      </div>
      <div style={{ fontSize: 13, color: "var(--c-text)", whiteSpace: "pre-wrap" }}>{draft.body}</div>
    </div>
  );
}
