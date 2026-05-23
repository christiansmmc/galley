import { useUiStore } from "../../state/uiStore";

export function ToastStack() {
  const { toasts, dismissToast } = useUiStore();
  return (
    <div style={{
      position: "fixed",
      bottom: 80,
      right: "var(--space-7)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      zIndex: "var(--z-toast)" as unknown as number,
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderRadius: "var(--radius-md)",
            background: t.kind === "error" ? "var(--c-red)" : "var(--c-surface0)",
            color: t.kind === "error" ? "white" : "var(--c-text)",
            cursor: "pointer",
            fontSize: "var(--text-base)",
            maxWidth: 320,
            boxShadow: "var(--shadow-md)",
          }}
        >{t.message}</div>
      ))}
    </div>
  );
}
