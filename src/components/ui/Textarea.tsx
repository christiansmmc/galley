import { forwardRef, type CSSProperties, type TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { invalid, mono, style, ...rest },
  ref,
) {
  const merged: CSSProperties = {
    width: "100%",
    padding: "var(--space-4) var(--space-5)",
    borderRadius: "var(--radius-md)",
    border: `1px solid ${invalid ? "var(--c-red)" : "var(--c-surface1)"}`,
    background: "var(--c-base)",
    color: "var(--c-text)",
    fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
    fontSize: "var(--text-md)",
    lineHeight: "var(--lh-normal)",
    resize: "vertical",
    outline: "none",
    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
    ...style,
  };
  return <textarea ref={ref} className="prr-input" style={merged} {...rest} />;
});
