import { useState } from "react";
import { Button, Textarea } from "../ui";
import { inlineWidgetShell } from "./inlineWidgetStyle";

interface Props {
  line: number;
  side: "RIGHT" | "LEFT";
  /** Multi-line range start (inclusive). Undefined for single-line. */
  startLine?: number | null;
  onSave: (body: string) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Inline draft editor mounted inside a Monaco view zone via createRoot.
 * This is the only path for creating a new draft comment — the modal
 * fallback was removed once the inline flow stabilised.
 *
 * Etapa 3 · S6 visual: proto-rascunho — same dashed warn left rule as
 * a saved draft, RASCUNHO tag, link-style actions. Primary action is
 * "salvar rascunho" with tone="accent".
 */
export function InlineCommentEditor({ line, side, startLine, onSave, onCancel }: Props) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const isRange = typeof startLine === "number" && startLine !== line;
  const sideLabel = side === "RIGHT" ? "direita" : "esquerda";
  const lineLabel = isRange ? `L${startLine}–${line}` : `L${line}`;

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSave(trimmed);
    } finally {
      setBusy(false);
    }
  };

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
        <span>{`${lineLabel} · ${sideLabel} · novo`}</span>
        <span style={{
          fontSize: 10, letterSpacing: "0.08em", color: "var(--c-warn)",
        }}>RASCUNHO</span>
      </div>

      <Textarea
        autoFocus
        rows={3}
        placeholder="comentário (Markdown)…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
        }}
        style={{ fontSize: 12.5, lineHeight: 1.55 }}
      />

      <div style={{
        display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 10,
      }}>
        <Button variant="link" onClick={onCancel} disabled={busy}>cancelar</Button>
        <Button variant="link" tone="accent" onClick={submit} disabled={busy || !body.trim()}>
          {busy ? "salvando…" : "salvar rascunho"}
        </Button>
      </div>
    </div>
  );
}
