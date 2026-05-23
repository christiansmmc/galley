import { forwardRef, type CSSProperties, type SelectHTMLAttributes } from "react";

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: "sm" | "md";
}

export const Dropdown = forwardRef<HTMLSelectElement, Props>(function Dropdown(
  { size = "md", style, children, ...rest },
  ref,
) {
  const merged: CSSProperties = {
    height: size === "sm" ? "var(--control-h-sm)" : "var(--control-h-md)",
    padding: size === "sm" ? "0 var(--space-4)" : "0 var(--space-5)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--c-surface1)",
    background: "var(--c-base)",
    color: "var(--c-text)",
    fontFamily: "var(--font-ui)",
    fontSize: "var(--text-md)",
    cursor: "pointer",
    outline: "none",
    ...style,
  };
  return <select ref={ref} className="prr-input" style={merged} {...rest}>{children}</select>;
});
