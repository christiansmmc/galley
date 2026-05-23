import { X } from "lucide-react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ title, open, onClose, children, footer }: Props) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }} onClick={onClose}>
      <div
        onMouseDownCapture={e => e.stopPropagation()}
        onMouseUpCapture={e => e.stopPropagation()}
        onClickCapture={e => e.stopPropagation()}
        style={{
          background: "var(--c-base)", color: "var(--c-text)",
          borderRadius: 6, minWidth: 480, maxWidth: 720,
          border: "1px solid var(--c-surface1)",
          position: "relative", zIndex: 1, pointerEvents: "auto",
        }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--c-surface0)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <strong>{title}</strong>
          <button onClick={onClose} style={{
            background: "transparent", border: 0, color: "var(--c-subtext)", cursor: "pointer",
          }}><X size={16} /></button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        {footer && (
          <div style={{
            padding: "10px 16px", borderTop: "1px solid var(--c-surface0)",
            display: "flex", justifyContent: "flex-end", gap: 8,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
