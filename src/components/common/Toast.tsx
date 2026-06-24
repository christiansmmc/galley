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
      {toasts.map(t => {
        const success = t.kind === "success";
        const error = t.kind === "error";
        return (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-4) var(--space-6)",
              borderRadius: "var(--radius-md)",
              border: success ? "1px solid var(--c-success)" : "1px solid transparent",
              background: error ? "var(--c-danger)" : "var(--c-surface0)",
              color: error ? "white" : success ? "var(--c-success)" : "var(--c-text)",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              maxWidth: 320,
              boxShadow: "var(--shadow-md)",
              animation: "prr-toast-in var(--transition-fast) ease-out",
            }}
          >
            {success && (
              <span aria-hidden style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--c-success)",
                color: "white",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
              }}>✓</span>
            )}
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
