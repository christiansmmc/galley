import { ChevronRight } from "lucide-react";
import type { CiStatus, PrSummary } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";

const CI_COLOR: Record<CiStatus, string> = {
  passing: "var(--c-success)",
  pending: "var(--c-warn)",
  failing: "var(--c-danger)",
  none: "var(--c-overlay)",
};

interface Props {
  onExpand: () => void;
}

export function PrListRail({ onExpand }: Props) {
  const reviewRequested = usePrsStore(s => s.reviewRequested);
  const mine = usePrsStore(s => s.mine);
  const currentPr = usePrsStore(s => s.currentPr);
  const openPr = usePrsStore(s => s.openPr);

  const seen = new Set<number>();
  const queue: PrSummary[] = [];
  for (const p of [...reviewRequested, ...mine]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    queue.push(p);
  }

  const total = queue.length;
  const isActive = (p: PrSummary) =>
    currentPr?.summary.owner === p.owner &&
    currentPr?.summary.repo === p.repo &&
    currentPr?.summary.number === p.number;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--c-mantle)",
      }}
    >
      <button
        type="button"
        onClick={onExpand}
        title="Expandir lista (Ctrl+1)"
        aria-label="Expandir lista de PRs"
        style={{
          width: "100%",
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          background: "transparent",
          color: "var(--c-subtext)",
          cursor: "pointer",
        }}
      >
        <ChevronRight size={14} />
      </button>
      <div style={{ height: 1, background: "var(--c-line-soft)" }} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "10px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {queue.map(p => {
          const active = isActive(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => openPr(p.owner, p.repo, p.number)}
              title={`#${p.number} ${p.title}`}
              aria-label={`Abrir #${p.number} ${p.title}`}
              aria-current={active || undefined}
              style={{
                position: "relative",
                width: 28,
                height: 22,
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 2,
                    bottom: 2,
                    width: 2,
                    background: "var(--c-accent)",
                  }}
                />
              )}
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "var(--radius-pill)",
                  background: CI_COLOR[p.ci_status],
                  boxShadow: active
                    ? "0 0 0 2px var(--c-mantle), 0 0 0 3px var(--c-accent)"
                    : undefined,
                }}
              />
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: "8px 0 10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          fontFamily: "var(--font-mono)",
        }}
        title={`${total} PR${total === 1 ? "" : "s"} na fila`}
      >
        <span style={{ fontSize: 11, color: "var(--c-text)" }}>{total}</span>
        <span style={{
          fontSize: 8,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--c-overlay)",
        }}>
          prs
        </span>
      </div>
    </div>
  );
}
