import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "danger" | "subtle" | "icon" | "link";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonTone = "neutral" | "accent";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Tone modifier — currently only meaningful when `variant="link"`.
   * `"accent"` paints the link in `--c-accent` (use for the registering
   * action inside a block, e.g. "salvar rascunho"). `"neutral"` (default)
   * paints it in `--c-subtext`.
   */
  tone?: ButtonTone;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const sizeStyle: Record<ButtonSize, CSSProperties> = {
  sm: {
    height: "var(--control-h-sm)",
    padding: "0 var(--space-5)",
    fontSize: "var(--text-base)",
    borderRadius: "var(--radius-sm)",
    gap: "var(--space-2)",
  },
  md: {
    height: "var(--control-h-md)",
    padding: "0 var(--space-6)",
    fontSize: "var(--text-md)",
    borderRadius: "var(--radius-md)",
    gap: "var(--space-3)",
  },
  lg: {
    height: "var(--control-h-lg)",
    padding: "0 var(--space-7)",
    fontSize: "var(--text-md)",
    borderRadius: "var(--radius-md)",
    gap: "var(--space-3)",
  },
};

const variantStyle: Record<ButtonVariant, CSSProperties> = {
  // Etapa 3 S3: primary is no longer a filled accent. It's the
  // hairline-accent button reserved for "Revisar" in the TitleBar —
  // 1px accent border + accent-soft bg + text color.
  primary: {
    background: "var(--c-accent-soft)",
    color: "var(--c-text)",
    border: "1px solid var(--c-accent)",
  },
  ghost: {
    background: "transparent",
    color: "var(--c-text)",
    border: "1px solid var(--c-surface1)",
  },
  danger: {
    background: "var(--c-danger)",
    color: "white",
    border: "1px solid var(--c-danger)",
  },
  subtle: {
    background: "var(--c-surface0)",
    color: "var(--c-text)",
    border: "1px solid transparent",
  },
  icon: {
    background: "transparent",
    color: "var(--c-subtext)",
    border: "1px solid transparent",
    padding: "var(--space-2)",
    width: "var(--control-h-md)",
    height: "var(--control-h-md)",
  },
  // Etapa 3 S3: text-link variant. Semantic <button> but visually a
  // hairline text link — no fixed control height, no border, mono 11.
  // Hover gets a 1px underline in --c-line.
  link: {
    background: "transparent",
    color: "var(--c-subtext)",
    border: 0,
    padding: 0,
    height: "auto",
    borderRadius: 0,
  },
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "ghost", size = "md", tone = "neutral", leadingIcon, trailingIcon, fullWidth, style, disabled, children, ...rest },
  ref,
) {
  const isLink = variant === "link";

  const merged: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: isLink ? "var(--font-mono)" : "var(--font-ui)",
    fontWeight: "var(--weight-medium)" as unknown as number,
    lineHeight: 1,
    transition: "background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast)",
    opacity: disabled ? 0.55 : 1,
    width: fullWidth ? "100%" : undefined,
    whiteSpace: "nowrap",
    ...sizeStyle[size],
    ...variantStyle[variant],
    ...(variant === "icon" ? sizeStyle[size] : {}),
    ...style,
  };

  if (variant === "icon") {
    merged.padding = 0;
    merged.width = sizeStyle[size].height;
  }

  if (isLink) {
    // Link variant ignores size-based height/padding/radius.
    merged.height = "auto";
    merged.padding = 0;
    merged.borderRadius = 0;
    merged.gap = "var(--space-2)";
    merged.fontSize = 11;
    merged.fontWeight = 400;
    merged.color = tone === "accent" ? "var(--c-accent)" : "var(--c-subtext)";
    merged.borderBottom = "1px solid transparent";
  }

  return (
    <button
      ref={ref}
      className={isLink ? "prr-btn prr-btn--link" : "prr-btn"}
      data-variant={variant}
      data-tone={tone}
      disabled={disabled}
      style={merged}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
