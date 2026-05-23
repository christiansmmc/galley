import { Button } from "../ui";

export function Banner({ children, kind = "warn", onAction }: {
  children: React.ReactNode;
  kind?: "warn" | "error";
  onAction?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      padding: "var(--space-4) var(--space-6)",
      background: kind === "error" ? "var(--c-danger)" : "var(--c-warn)",
      color: "var(--c-base)",
      fontSize: "var(--text-base)",
      display: "flex", alignItems: "center", gap: "var(--space-4)",
    }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onAction && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction.onClick}
          style={{ borderColor: "currentColor", color: "inherit", background: "transparent" }}
        >
          {onAction.label}
        </Button>
      )}
    </div>
  );
}
