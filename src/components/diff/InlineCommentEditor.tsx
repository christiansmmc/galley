import { useState } from "react";
import { Button, Textarea } from "../ui";

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
 */
export function InlineCommentEditor({ line, side, startLine, onSave, onCancel }: Props) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const isRange = typeof startLine === "number" && startLine !== line;

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
      style={{
        padding: "var(--space-5)",
        margin: "var(--space-2) var(--space-9)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--c-surface1)",
        background: "var(--c-mantle)",
        color: "var(--c-text)",
        fontFamily: "var(--font-ui)",
        boxShadow: "var(--shadow-md)",
        position: "relative",
        zIndex: "var(--z-base)" as unknown as number,
        pointerEvents: "auto",
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        fontSize: "var(--text-sm)",
        color: "var(--c-subtext)",
        marginBottom: "var(--space-3)",
        fontFamily: "var(--font-mono)",
      }}>
        {isRange ? `Rascunho · L${startLine}–${line} · ${side === "RIGHT" ? "Depois" : "Antes"}` : `Rascunho · L${line} · ${side === "RIGHT" ? "Depois" : "Antes"}`}
      </div>
      <Textarea
        autoFocus
        rows={3}
        placeholder="Comentário (Markdown)…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
        }}
      />
      <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "flex-end", marginTop: "var(--space-3)" }}>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button variant="primary" size="sm" onClick={submit} disabled={busy || !body.trim()}>
          {busy ? "Salvando…" : "Salvar rascunho"}
        </Button>
      </div>
    </div>
  );
}
