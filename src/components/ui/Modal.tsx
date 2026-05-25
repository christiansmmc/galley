import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Defaults to `var(--modal-min-w)`. */
  minWidth?: number | string;
  /** Defaults to `var(--modal-max-w)`. */
  maxWidth?: number | string;
}

export function Modal({ title, open, onClose, children, footer, minWidth, maxWidth }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: "var(--z-modal)" as unknown as number,
      }}
    >
      <div
        onMouseDownCapture={e => e.stopPropagation()}
        onMouseUpCapture={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--c-base)", color: "var(--c-text)",
          borderRadius: "var(--radius-lg)",
          minWidth: minWidth ?? "var(--modal-min-w)",
          maxWidth: maxWidth ?? "var(--modal-max-w)",
          border: "1px solid var(--c-line)",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
          pointerEvents: "auto",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{
          flex: "0 0 auto",
          padding: "var(--space-6) var(--space-7)",
          borderBottom: "1px solid var(--c-line)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <strong style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: "-0.005em",
            color: "var(--c-text)",
          }}>{title}</strong>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "1px solid var(--c-line)",
              borderRadius: "var(--radius-sm)",
              color: "var(--c-subtext)",
              cursor: "pointer",
              padding: "var(--space-2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 0,
            }}
          ><X size={14} /></button>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", padding: "var(--space-7)" }}>{children}</div>
        {footer && (
          <div style={{
            flex: "0 0 auto",
            padding: "var(--space-5) var(--space-7)",
            borderTop: "1px solid var(--c-line)",
            display: "flex", justifyContent: "flex-end", gap: "var(--space-4)",
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
