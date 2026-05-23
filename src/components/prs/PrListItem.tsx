import type { CiStatus, PrSummary } from "../../ipc/types";
import { formatAge } from "../../util/time";

interface Props { pr: PrSummary; selected: boolean; loading?: boolean; onClick: () => void; }

const CI_LABEL: Record<CiStatus, string> = {
  passing: "CI passou",
  pending: "CI rodando",
  failing: "CI falhou",
  none: "Sem checks",
};

const CI_COLOR: Record<CiStatus, string> = {
  passing: "var(--c-success)",
  pending: "var(--c-warn)",
  failing: "var(--c-danger)",
  none: "var(--c-overlay)",
};

function CiDot({ status }: { status: CiStatus }) {
  return (
    <span
      title={CI_LABEL[status]}
      aria-label={CI_LABEL[status]}
      style={{
        width: 7,
        height: 7,
        borderRadius: "var(--radius-pill)",
        background: CI_COLOR[status],
        alignSelf: "center",
      }}
    />
  );
}

export function PrListItem({ pr, selected, loading, onClick }: Props) {
  const age = formatAge(pr.updated_at);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="prr-row"
      data-kind="pr"
      data-selected={selected}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "14px 1fr auto",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "var(--density-row-pad-y) var(--space-7)",
        border: 0,
        color: "var(--c-text)",
        cursor: loading ? "progress" : "pointer",
        transition: "background var(--transition-fast)",
        opacity: loading ? 0.75 : 1,
      }}
    >
      <span style={{ display: "inline-flex", justifyContent: "center" }}>
        <CiDot status={pr.ci_status} />
      </span>
      <span
        title={pr.title}
        style={{
          fontSize: 12.5,
          fontWeight: 400,
          lineHeight: 1.3,
          color: "var(--c-text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {pr.title}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          fontWeight: 400,
          color: "var(--c-subtext)",
          whiteSpace: "nowrap",
        }}
      >
        {pr.changed_files}f <span style={{ color: "var(--c-overlay)" }}>·</span> {age}
      </span>
    </button>
  );
}
