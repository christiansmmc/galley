import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
}

/** Lightweight tooltip — uses native `title` for accessibility plus a styled
 * floating label on hover/focus. Avoids portal/popper dependency. */
export function Tooltip({ label, children, side = "top" }: Props) {
  const [hover, setHover] = useState(false);
  if (!isValidElement(children)) return <>{children}</>;

  const cloned = cloneElement(children as ReactElement<{
    title?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
  }>, {
    title: label,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  });

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      {cloned}
      {hover && (
        <span style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          [side === "top" ? "bottom" : "top"]: "calc(100% + 4px)",
          padding: "var(--space-2) var(--space-5)",
          borderRadius: "var(--radius-sm)",
          background: "var(--c-crust)",
          color: "var(--c-text)",
          fontSize: "var(--text-sm)",
          whiteSpace: "nowrap",
          boxShadow: "var(--shadow-md)",
          pointerEvents: "none",
          zIndex: "var(--z-floating)" as unknown as number,
        }}>{label}</span>
      )}
    </span>
  );
}
