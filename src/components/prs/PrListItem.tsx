import type { PrSummary } from "../../ipc/types";

interface Props { pr: PrSummary; selected: boolean; onClick: () => void; }

export function PrListItem({ pr, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "8px 12px", border: 0,
        background: selected ? "var(--c-surface0)" : "transparent",
        color: "var(--c-text)", cursor: "pointer",
        borderBottom: "1px solid var(--c-mantle)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{pr.title}</div>
      <div style={{ fontSize: 11, color: "var(--c-subtext)" }}>
        {pr.owner}/{pr.repo}#{pr.number} · {pr.author}
      </div>
    </button>
  );
}
