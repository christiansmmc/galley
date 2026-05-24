import type { CommentDraft } from "../../ipc/types";
import { useDraftsStore } from "../../state/draftsStore";
import { Button } from "../ui";
import { inlineWidgetShell } from "./inlineWidgetStyle";
import { formatAge } from "../../util/time";
import { useT } from "../../i18n";

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
  const t = useT();
  const remove = useDraftsStore(s => s.remove);
  const isRange = draft.start_line != null && draft.start_line !== draft.line;
  const sideLabel = draft.side === "RIGHT" ? t("comment.side_right") : t("comment.side_left");
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
          {` · ${sideLabel} · ${t("comment.draft_state")} · ${age}`}
        </span>
        <span style={{
          fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-warn)",
        }}>{t("comment.draft_state_upper")}</span>
      </div>

      <div style={{
        fontSize: 12.5, lineHeight: 1.55, color: "var(--c-subtext)",
        fontStyle: "italic", whiteSpace: "pre-wrap",
      }}>{draft.body}</div>

      <div style={{
        display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 10,
      }}>
        <Button variant="link" onClick={() => remove(draft.id)}>{t("comment.discard")}</Button>
        <Button
          variant="link"
          tone="accent"
          onClick={() => window.dispatchEvent(new CustomEvent("prr:open-submit"))}
        >{t("comment.include_in_review")}</Button>
      </div>
    </div>
  );
}
