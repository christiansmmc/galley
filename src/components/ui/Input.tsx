import { forwardRef, type CSSProperties, type InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean;
  mono?: boolean;
  size?: "sm" | "md";
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { invalid, mono, size = "md", style, ...rest },
  ref,
) {
  const merged: CSSProperties = {
    width: "100%",
    height: size === "sm" ? "var(--control-h-sm)" : "var(--control-h-md)",
    padding: size === "sm" ? "0 var(--space-4)" : "0 var(--space-5)",
    borderRadius: "var(--radius-md)",
    border: `1px solid ${invalid ? "var(--c-danger)" : "var(--c-surface1)"}`,
    background: "var(--c-base)",
    color: "var(--c-text)",
    fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
    fontSize: "var(--text-md)",
    outline: "none",
    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
    ...style,
  };
  return <input ref={ref} className="prr-input" style={merged} {...rest} />;
});
