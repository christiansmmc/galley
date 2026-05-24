import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  align?: "center" | "left";
}

export function EmptyState({ title, description, action, align = "center" }: Props) {
  const left = align === "left";
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: left ? "flex-start" : "center",
      justifyContent: left ? "flex-start" : "center",
      textAlign: left ? "left" : "center",
      padding: left ? "var(--space-9) var(--space-9)" : "var(--space-10) var(--space-7)",
      color: "var(--c-subtext)",
      gap: "var(--space-4)",
      maxWidth: left ? 480 : undefined,
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
