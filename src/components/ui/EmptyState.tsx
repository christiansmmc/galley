import type { ReactNode } from "react";

interface Props {
  /**
   * Etapa 3 S3: kept for backwards compatibility with existing call sites,
   * but no longer rendered. The new shape (per `design/etapa3-workshop`)
   * is "no icon, no pill" — a serif-italic line + optional mono sub-line.
   * Will be removed entirely in S9 once every call site stops passing it.
   */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function EmptyState({ icon: _icon, title, description, action, compact }: Props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: compact ? "var(--space-7) var(--space-6)" : "var(--space-10) var(--space-7)",
      color: "var(--c-subtext)",
      gap: "var(--space-4)",
    }}>
      <div style={{
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: 15.5,
        fontWeight: 400,
        color: "var(--c-subtext)",
      }}>{title}</div>
      {description && (
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--c-overlay)",
          maxWidth: 320,
          lineHeight: "var(--lh-normal)",
        }}>{description}</div>
      )}
      {action && <div style={{ marginTop: "var(--space-3)" }}>{action}</div>}
    </div>
  );
}
