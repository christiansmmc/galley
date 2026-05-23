import { useUiStore } from "../../state/uiStore";

export function ToastStack() {
  const { toasts, dismissToast } = useUiStore();
  return (
    <div style={{ position: "fixed", bottom: 80, right: 16, display: "flex", flexDirection: "column", gap: 6, zIndex: 200 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => dismissToast(t.id)} style={{
          padding: "8px 12px", borderRadius: 5,
          background: t.kind === "error" ? "var(--c-red)" : "var(--c-surface0)",
          color: t.kind === "error" ? "white" : "var(--c-text)",
          cursor: "pointer", fontSize: 12, maxWidth: 320,
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}>{t.message}</div>
      ))}
    </div>
  );
}
