import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact }: Props) {
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
      {icon && (
        <span style={{
          color: "var(--c-overlay)",
          display: "inline-flex",
          padding: "var(--space-5)",
          background: "var(--c-surface0)",
          borderRadius: "var(--radius-pill)",
        }}>{icon}</span>
      )}
      <div style={{
        fontSize: compact ? "var(--text-md)" : "var(--text-lg)",
        fontWeight: "var(--weight-semibold)" as unknown as number,
        color: "var(--c-text)",
      }}>{title}</div>
      {description && (
        <div style={{
          fontSize: "var(--text-base)",
          lineHeight: "var(--lh-normal)",
          maxWidth: 320,
        }}>{description}</div>
      )}
      {action && <div style={{ marginTop: "var(--space-3)" }}>{action}</div>}
    </div>
  );
}
