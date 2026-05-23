export function Banner({ children, kind = "warn", onAction }: {
  children: React.ReactNode;
  kind?: "warn" | "error";
  onAction?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      padding: "8px 12px",
      background: kind === "error" ? "var(--c-red)" : "var(--c-amber)",
      color: "var(--c-base)", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onAction && (
        <button onClick={onAction.onClick} style={{
          background: "transparent", border: "1px solid currentColor",
          color: "inherit", borderRadius: 4, padding: "2px 8px",
          cursor: "pointer", fontSize: 11,
        }}>
          {onAction.label}
        </button>
      )}
    </div>
  );
}
