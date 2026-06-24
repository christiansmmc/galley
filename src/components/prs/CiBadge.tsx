import type { CiStatus } from "../../ipc/types";
import { useT } from "../../i18n";

export const CI_LABEL_KEY: Record<CiStatus, string> = {
  passing: "pr_meta.ci_passing",
  pending: "pr_meta.ci_pending",
  failing: "pr_meta.ci_failing",
  none: "pr_meta.ci_none",
};

export const CI_COLOR: Record<CiStatus, string> = {
  passing: "var(--c-success)",
  pending: "var(--c-warn)",
  failing: "var(--c-danger)",
  none: "var(--c-overlay)",
};

interface Props {
  status: CiStatus;
  /** When provided, the badge renders as a button (e.g. open CI in browser). */
  onClick?: () => void;
  /** Show the auto-refresh hint next to the label while CI is pending. */
  autoRefresh?: boolean;
  /** When true, the hint reads "updating…" (a refresh is in flight). */
  refreshing?: boolean;
}

export function CiBadge({ status, onClick, autoRefresh, refreshing }: Props) {
  const t = useT();
  const dot = (
    <span style={{
      display: "inline-block",
      width: 6, height: 6,
      borderRadius: "var(--radius-pill)",
      background: CI_COLOR[status],
      marginRight: "var(--space-2)",
      verticalAlign: "middle",
    }} />
  );
  const label = (
    <span style={{ color: status === "passing" ? "var(--c-success)" : "var(--c-subtext)" }}>
      {t(CI_LABEL_KEY[status])}
    </span>
  );

  const badge = onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={t(CI_LABEL_KEY[status])}
      style={{
        display: "inline-flex", alignItems: "center",
        background: "none", border: 0, padding: 0,
        cursor: "pointer",
        fontFamily: "var(--font-mono)", fontSize: 11,
        textDecoration: "underline", textUnderlineOffset: 2,
      }}
    >
      {dot}{label}
    </button>
  ) : (
    <span title={t(CI_LABEL_KEY[status])}>{dot}{label}</span>
  );

  // Auto-refresh hint: only while CI is still pending and polling is enabled.
  const showHint = autoRefresh && status === "pending";
  if (!showHint) return badge;

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {badge}
      <span style={{
        marginLeft: "var(--space-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: refreshing ? "var(--c-subtext)" : "var(--c-overlay)",
      }}>
        {refreshing ? t("pr_meta.ci_updating") : t("pr_meta.ci_auto")}
      </span>
    </span>
  );
}
