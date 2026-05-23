import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CiStatus, PrDetail } from "../../ipc/types";
import { formatAge } from "../../util/time";

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

interface Props { pr: PrDetail; }

export function PrMetaStrip({ pr }: Props) {
  const [bodyOpen, setBodyOpen] = useState(false);
  const s = pr.summary;
  const age = formatAge(s.updated_at);
  const hasBody = !!(pr.body && pr.body.trim().length > 0);

  return (
    <div style={{
      borderBottom: "1px solid var(--c-surface0)",
      background: "var(--c-base)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-5)",
        fontSize: "var(--text-sm)",
        color: "var(--c-subtext)",
      }}>
        <MetaItem>{s.author}</MetaItem>
        <Sep />
        <MetaItem>{age}</MetaItem>
        <Sep />
        <MetaItem>{s.changed_files} files</MetaItem>
        <Sep />
        <MetaItem>
          <span style={{ color: "var(--c-green)" }}>+{pr.additions}</span>
          <span style={{ margin: "0 var(--space-1)" }}> </span>
          <span style={{ color: "var(--c-red)" }}>−{pr.deletions}</span>
        </MetaItem>
        <Sep />
        <MetaItem title={CI_LABEL[s.ci_status]}>
          <span style={{
            display: "inline-block",
            width: 8, height: 8,
            borderRadius: "var(--radius-pill)",
            background: CI_COLOR[s.ci_status],
            marginRight: "var(--space-2)",
            verticalAlign: "middle",
          }} />
          {CI_LABEL[s.ci_status]}
        </MetaItem>
        <Sep />
        <MetaItem>
          {pr.reviewers_count} reviewer{pr.reviewers_count === 1 ? "" : "s"}
        </MetaItem>
        {pr.draft && (<>
          <Sep />
          <MetaItem>
            <span style={{
              padding: "0 var(--space-2)",
              borderRadius: "var(--radius-sm)",
              background: "var(--c-surface0)",
              color: "var(--c-subtext)",
              fontSize: "var(--text-xs)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}>
              Draft
            </span>
          </MetaItem>
        </>)}
      </div>

      {hasBody && (
        <div style={{
          padding: "0 var(--space-5) var(--space-3)",
        }}>
          <button
            onClick={() => setBodyOpen(v => !v)}
            className="prr-btn"
            data-variant="subtle"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              border: 0,
              background: "transparent",
              color: "var(--c-subtext)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
            }}
            aria-expanded={bodyOpen}
          >
            {bodyOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {bodyOpen ? "Esconder descrição" : "Mostrar descrição"}
          </button>
          {bodyOpen && (
            <pre style={{
              margin: "var(--space-3) 0 0",
              padding: "var(--space-4) var(--space-5)",
              background: "var(--c-mantle)",
              border: "1px solid var(--c-surface0)",
              borderRadius: "var(--radius-md)",
              color: "var(--c-text)",
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-ui)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 240,
              overflowY: "auto",
              lineHeight: "var(--lh-normal)" as unknown as number,
            }}>
              {pr.body}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function MetaItem({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center" }}>
      {children}
    </span>
  );
}

function Sep() {
  return <span aria-hidden style={{ color: "var(--c-overlay)" }}>·</span>;
}
