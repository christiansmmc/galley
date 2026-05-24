import type { ReactNode } from "react";

interface Props {
  /** Source identifier (e.g. "github.com", "tauri ipc"). Rendered as overlay prefix. */
  source?: string;
  /** Main error message in mono. */
  message: string;
  /** Optional action label rendered as accent text link with `→`. */
  action?: { label: string; onClick: () => void };
  /** Additional content (e.g. raw payload) rendered as muted mono below. */
  detail?: ReactNode;
}

/**
 * Compiler-style error block. One line, mono, no icon.
 * Format: `error: <source> <message> · → <action>`
 */
export function ErrorBlock({ source, message, action, detail }: Props) {
  return (
    <div style={{
      padding: "var(--space-4) var(--space-6)",
      background: "transparent",
      borderTop: "1px solid var(--c-danger)",
      borderBottom: "1px solid var(--c-line-soft)",
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      color: "var(--c-text)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      flexWrap: "wrap",
    }}>
      <span style={{ color: "var(--c-danger)" }}>error:</span>
      {source && <span style={{ color: "var(--c-overlay)" }}>{source}</span>}
      <span>{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            marginLeft: "auto",
            font: "inherit",
            color: "var(--c-accent)",
            cursor: "pointer",
            borderBottom: "1px solid transparent",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = "var(--c-accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = "transparent"; }}
        >
          → {action.label}
        </button>
      )}
      {detail && (
        <div style={{
          width: "100%",
          color: "var(--c-overlay)",
          fontSize: 11,
          marginTop: "var(--space-2)",
          whiteSpace: "pre-wrap",
        }}>{detail}</div>
      )}
    </div>
  );
}
