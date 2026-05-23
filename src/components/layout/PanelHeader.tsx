import { ChevronLeft, ChevronRight } from "lucide-react";

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
      padding: "var(--pad)", borderBottom: "1px solid var(--c-surface0)",
      background: "var(--c-mantle)",
    }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
      {onCollapse && (
        <button onClick={onCollapse} style={{
          background: "transparent", border: 0, color: "var(--c-subtext)",
          cursor: "pointer", padding: 4, borderRadius: 4,
        }}>
          <Icon size={16} />
        </button>
      )}
    </div>
  );
}
