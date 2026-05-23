import type { CSSProperties, ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "green" | "amber" | "red" | "blue";

interface Props {
  tone?: BadgeTone;
  children: ReactNode;
  style?: CSSProperties;
}

const toneStyle: Record<BadgeTone, CSSProperties> = {
  neutral: { background: "var(--c-surface0)", color: "var(--c-text)" },
  accent: { background: "var(--c-accent)", color: "white" },
  green: { background: "var(--c-success)", color: "white" },
  amber: { background: "var(--c-warn)", color: "var(--c-crust)" },
  red: { background: "var(--c-danger)", color: "white" },
  blue: { background: "var(--c-info)", color: "white" },
};

export function Badge({ tone = "neutral", children, style }: Props) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "0 var(--space-4)",
      height: "var(--control-h-sm)",
      borderRadius: "var(--radius-pill)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)" as unknown as number,
      lineHeight: 1,
      ...toneStyle[tone],
      ...style,
    }}>{children}</span>
  );
}
