import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "danger" | "subtle" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  primary: {
    background: "var(--c-accent)",
    color: "white",
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
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "ghost", size = "md", leadingIcon, trailingIcon, fullWidth, style, disabled, children, ...rest },
  ref,
) {
  const merged: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-ui)",
    fontWeight: "var(--weight-medium)" as unknown as number,
    lineHeight: 1,
    transition: "background var(--transition-fast), border-color var(--transition-fast), opacity var(--transition-fast)",
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

  return (
    <button
      ref={ref}
      className="prr-btn"
      data-variant={variant}
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
