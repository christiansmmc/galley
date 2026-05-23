import type { PrSummary } from "../../ipc/types";

interface Props { pr: PrSummary; selected: boolean; onClick: () => void; }

export function PrListItem({ pr, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="prr-row"
      data-selected={selected}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "var(--space-4) var(--space-6)",
        border: 0,
        color: "var(--c-text)",
        cursor: "pointer",
        borderBottom: "1px solid var(--c-mantle)",
        transition: "background var(--transition-fast)",
      }}
    >
      <div style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-medium)" as unknown as number, marginBottom: "var(--space-1)" }}>{pr.title}</div>
      <div style={{ fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
        {pr.owner}/{pr.repo}#{pr.number} · {pr.author}
      </div>
    </button>
  );
}
