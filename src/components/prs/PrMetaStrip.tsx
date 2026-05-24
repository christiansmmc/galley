import { useState } from "react";
import type { CiStatus, PrDetail } from "../../ipc/types";
import { formatAge } from "../../util/time";

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

interface Props { pr: PrDetail; }

export function PrMetaStrip({ pr }: Props) {
  const [bodyOpen, setBodyOpen] = useState(false);
  const s = pr.summary;
  const age = formatAge(s.updated_at);
  const hasBody = !!(pr.body && pr.body.trim().length > 0);

  const openGithub = () => {
    if (s.html_url) window.open(s.html_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{
      borderBottom: "1px solid var(--c-line-soft)",
      background: "var(--c-base)",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "end",
        gap: 20,
        padding: "14px 24px 12px",
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-2)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--c-subtext)",
            marginBottom: 6,
          }}>
            <MetaItem><b style={{ color: "var(--c-text)", fontWeight: 500 }}>{s.author}</b></MetaItem>
            <Sep />
            <MetaItem>{age}</MetaItem>
            <Sep />
            <MetaItem>{s.changed_files} arq</MetaItem>
            <Sep />
            <MetaItem>
              <span style={{ color: "var(--c-success)" }}>+{pr.additions}</span>
              <span style={{ margin: "0 var(--space-1)" }}> </span>
              <span style={{ color: "var(--c-danger)" }}>−{pr.deletions}</span>
            </MetaItem>
            <Sep />
            <MetaItem title={CI_LABEL[s.ci_status]}>
              <span style={{
                display: "inline-block",
                width: 6, height: 6,
                borderRadius: "var(--radius-pill)",
                background: CI_COLOR[s.ci_status],
                marginRight: "var(--space-2)",
                verticalAlign: "middle",
              }} />
              <span style={{ color: s.ci_status === "passing" ? "var(--c-success)" : "var(--c-subtext)" }}>
                {CI_LABEL[s.ci_status]}
              </span>
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
          <div style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--c-text)",
            letterSpacing: "-0.005em",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }} title={s.title}>
            {s.title}
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--c-subtext)",
          flexShrink: 0,
        }}>
          {hasBody && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={() => setBodyOpen(v => !v)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBodyOpen(v => !v); } }}
                aria-expanded={bodyOpen}
                style={{ cursor: "pointer" }}
              >
                {bodyOpen ? "esconder descrição" : "mostrar descrição"}
              </span>
              <span aria-hidden style={{ color: "var(--c-overlay)" }}>·</span>
            </>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={openGithub}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGithub(); } }}
            style={{ cursor: "pointer" }}
          >
            abrir no github ↗
          </span>
        </div>
      </div>

      {bodyOpen && hasBody && (
        <div style={{ padding: "0 24px var(--space-3)" }}>
          <pre style={{
            margin: 0,
            padding: "var(--space-4) var(--space-5)",
            background: "var(--c-mantle)",
            border: "1px solid var(--c-line-soft)",
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
