import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui";

interface Props {
  title: string;
  onCollapse?: () => void;
  side: "left" | "right";
}

export function PanelHeader({ title, onCollapse, side }: Props) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "var(--space-3) var(--space-6)",
      borderBottom: "1px solid var(--c-surface0)",
      background: "var(--c-mantle)",
    }}>
      <span style={{ fontWeight: "var(--weight-semibold)" as unknown as number, fontSize: "var(--text-md)" }}>{title}</span>
      {onCollapse && (
        <Button
          variant="icon"
          size="sm"
          onClick={onCollapse}
          aria-label="Recolher painel"
        >
          <Icon size={14} />
        </Button>
      )}
    </div>
  );
}
