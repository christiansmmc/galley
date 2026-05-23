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
          border: "1px solid var(--c-surface1)",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
          pointerEvents: "auto",
        }}
      >
        <div style={{
          padding: "var(--space-6) var(--space-7)",
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
        <div style={{ padding: "var(--space-7)" }}>{children}</div>
        {footer && (
          <div style={{
            padding: "var(--space-5) var(--space-7)",
            borderTop: "1px solid var(--c-surface0)",
            display: "flex", justifyContent: "flex-end", gap: "var(--space-4)",
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
