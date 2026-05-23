import { useState } from "react";

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
 * Styling intentionally mirrors `CommentLineModal` so the two paths feel
 * the same; CommentLineModal will be removed in sub-phase 2.4.
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
        padding: 10,
        margin: "4px 24px",
        borderRadius: 6,
        border: "1px solid var(--c-surface1)",
        background: "var(--c-mantle)",
        color: "var(--c-text)",
        fontFamily: "var(--font-ui)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        position: "relative",
        zIndex: 1,
        pointerEvents: "auto",
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, color: "var(--c-subtext)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
        {isRange ? `Rascunho · L${startLine}–${line} · ${side === "RIGHT" ? "Depois" : "Antes"}` : `Rascunho · L${line} · ${side === "RIGHT" ? "Depois" : "Antes"}`}
      </div>
      <textarea
        autoFocus
        rows={3}
        placeholder="Comentário (Markdown)…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
        }}
        style={{
          width: "100%",
          padding: 8,
          borderRadius: 5,
          border: "1px solid var(--c-surface1)",
          background: "var(--c-base)",
          color: "var(--c-text)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: "6px 10px", borderRadius: 5,
            border: "1px solid var(--c-surface1)",
            background: "transparent", color: "var(--c-subtext)",
            cursor: "pointer", fontSize: 12,
          }}
        >Cancelar</button>
        <button
          onClick={submit}
          disabled={busy || !body.trim()}
          style={{
            padding: "6px 12px", borderRadius: 5, border: 0,
            background: "var(--c-accent)", color: "white",
            cursor: busy || !body.trim() ? "default" : "pointer",
            fontSize: 12, opacity: busy || !body.trim() ? 0.6 : 1,
          }}
        >{busy ? "Salvando…" : "Salvar rascunho"}</button>
      </div>
    </div>
  );
}
