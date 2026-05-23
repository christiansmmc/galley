import type { CiStatus, PrSummary } from "../../ipc/types";
import { formatAge } from "../../util/time";

interface Props { pr: PrSummary; selected: boolean; onClick: () => void; }

const CI_LABEL: Record<CiStatus, string> = {
  passing: "CI passou",
  pending: "CI rodando",
  failing: "CI falhou",
  none: "Sem checks",
};

const CI_COLOR: Record<CiStatus, string> = {
  passing: "var(--c-green)",
  pending: "var(--c-amber)",
  failing: "var(--c-red)",
  none: "var(--c-overlay)",
};

function CiDot({ status }: { status: CiStatus }) {
  return (
    <span
      title={CI_LABEL[status]}
      aria-label={CI_LABEL[status]}
      style={{
        flex: "0 0 auto",
        width: 8,
        height: 8,
        borderRadius: "var(--radius-pill)",
        background: CI_COLOR[status],
        marginTop: 6,
      }}
    />
  );
}

export function PrListItem({ pr, selected, onClick }: Props) {
  const age = formatAge(pr.updated_at);
  const changed = `${pr.changed_files} changed`;
  return (
    <button
      onClick={onClick}
      className="prr-row"
      data-selected={selected}
      style={{
        display: "flex",
        gap: "var(--space-3)",
        width: "100%",
        textAlign: "left",
        padding: "var(--density-row-pad-y) var(--density-row-pad-x)",
        border: 0,
        color: "var(--c-text)",
        cursor: "pointer",
        borderBottom: "1px solid var(--c-mantle)",
        transition: "background var(--transition-fast)",
      }}
    >
      <CiDot status={pr.ci_status} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          title={pr.title}
          style={{
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-medium)" as unknown as number,
            marginBottom: "var(--space-1)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {pr.title}
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
          {pr.author} · {age} · {changed}
        </div>
      </div>
    </button>
  );
}
