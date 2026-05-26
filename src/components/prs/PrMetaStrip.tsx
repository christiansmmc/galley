import { useState } from "react";
import type { PrDetail } from "../../ipc/types";
import { formatAge } from "../../util/time";
import { api } from "../../ipc/client";
import { useT } from "../../i18n";
import { RefreshCw } from "lucide-react";
import { Button, Spinner } from "../ui";
import { usePrsStore } from "../../state/prsStore";
import { CiBadge } from "./CiBadge";

interface Props { pr: PrDetail; }

export function PrMetaStrip({ pr }: Props) {
  const t = useT();
  const refreshCurrentPr = usePrsStore(s => s.refreshCurrentPr);
  const refreshingPr = usePrsStore(s => s.refreshingPr);
  const [bodyOpen, setBodyOpen] = useState(false);
  const s = pr.summary;
  const age = formatAge(s.updated_at);
  const hasBody = !!(pr.body && pr.body.trim().length > 0);

  const openGithub = () => {
    if (s.html_url) void api.openExternalUrl(s.html_url);
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
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--c-subtext)",
            marginBottom: 6,
          }}>
            <MetaItem><b style={{ color: "var(--c-text)", fontWeight: 500 }}>{s.author}</b></MetaItem>
            <Sep />
            <MetaItem>{age}</MetaItem>
            <Sep />
            <MetaItem>{t("pr_meta.files_count", { count: s.changed_files })}</MetaItem>
            <Sep />
            <MetaItem>
              <span style={{ color: "var(--c-success)" }}>+{pr.additions}</span>
              <span style={{ margin: "0 var(--space-1)" }}> </span>
              <span style={{ color: "var(--c-danger)" }}>−{pr.deletions}</span>
            </MetaItem>
            <Sep />
            <MetaItem>
              <CiBadge status={s.ci_status} />
            </MetaItem>
            <Sep />
            <MetaItem>
              {t("pr_meta.reviewer", { count: pr.reviewers_count })}
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
                  {t("pr_meta.draft")}
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
                {bodyOpen ? t("pr_meta.hide_description") : t("pr_meta.show_description")}
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
            {t("pr_meta.open_in_github")}
          </span>
          <span aria-hidden style={{ color: "var(--c-overlay)" }}>·</span>
          <Button
            variant="icon"
            size="md"
            onClick={() => refreshCurrentPr()}
            disabled={refreshingPr}
            title={t("pr_meta.refresh")}
            aria-label={t("pr_meta.refresh")}
          >
            {refreshingPr ? <Spinner size={14} /> : <RefreshCw size={14} />}
          </Button>
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
