import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Anchor side. Only "right" is implemented; left/bottom can land later. */
  side?: "right";
  /** Width of the panel in CSS px. */
  width?: number;
}

/**
 * Slide-in side panel. Used in place of a centered Modal when the panel is
 * narrow, content stays scrollable behind it, and a dimmed backdrop would
 * feel heavy. Esc closes; clicking the backdrop closes.
 */
export function SlidePanel({ title, open, onClose, children, footer, side = "right", width = 420 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const anchorStyle = side === "right"
    ? { right: 0, top: 0, bottom: 0, borderLeft: "1px solid var(--c-surface1)" }
    : {};

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.25)",
        zIndex: "var(--z-modal)" as unknown as number,
      }}
    >
      <div
        role="dialog"
        aria-label={title}
        onMouseDownCapture={e => e.stopPropagation()}
        onMouseUpCapture={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          position: "absolute",
          width,
          maxWidth: "92vw",
          background: "var(--c-base)", color: "var(--c-text)",
          display: "flex", flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
          ...anchorStyle,
        }}
      >
        <div style={{
          padding: "var(--space-5) var(--space-6)",
          borderBottom: "1px solid var(--c-surface0)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <strong style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" as unknown as number }}>{title}</strong>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent", border: 0, color: "var(--c-subtext)",
              cursor: "pointer", padding: "var(--space-2)",
            }}
          ><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>{children}</div>
        {footer && (
          <div style={{
            padding: "var(--space-5) var(--space-6)",
            borderTop: "1px solid var(--c-surface0)",
            display: "flex", justifyContent: "flex-end", gap: "var(--space-4)",
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
