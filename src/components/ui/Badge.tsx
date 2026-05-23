import type { CSSProperties, ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "green" | "amber" | "red" | "blue" | "hairline";

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
  // Etapa 3 S3: hairline badge — 1px border, no fill, mono uppercase 10
  // with 0.08em tracking. Used for state tags like "ABERTO" / "RESOLVIDO".
  hairline: { background: "transparent", color: "var(--c-subtext)" },
};

export function Badge({ tone = "neutral", children, style }: Props) {
  const isHairline = tone === "hairline";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: isHairline ? "1px var(--space-3)" : "0 var(--space-4)",
      height: isHairline ? "auto" : "var(--control-h-sm)",
      borderRadius: isHairline ? 0 : "var(--radius-pill)",
      border: isHairline ? "1px solid var(--c-line)" : "0 solid transparent",
      fontFamily: isHairline ? "var(--font-mono)" : undefined,
      fontSize: isHairline ? 10 : "var(--text-sm)",
      fontWeight: isHairline ? 400 : ("var(--weight-medium)" as unknown as number),
      letterSpacing: isHairline ? "0.08em" : undefined,
      textTransform: isHairline ? "uppercase" : undefined,
      lineHeight: 1,
      ...toneStyle[tone],
      ...style,
    }}>{children}</span>
  );
}
