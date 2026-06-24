import { useState } from "react";
import { SlidePanel, Button } from "../ui";
import { api } from "../../ipc/client";
import { userMessage } from "../../ipc/errors";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { CiBadge } from "../prs/CiBadge";
import type { MergeMethod } from "../../ipc/types";
import { useT } from "../../i18n";

interface Props { open: boolean; onClose: () => void; }

const METHODS: MergeMethod[] = ["merge", "squash", "rebase"];
const METHOD_KEY: Record<MergeMethod, string> = {
  merge: "merge.method_merge",
  squash: "merge.method_squash",
  rebase: "merge.method_rebase",
};

export function MergePanel({ open, onClose }: Props) {
  const t = useT();
  const currentPr = usePrsStore(s => s.currentPr);
  const closePr = usePrsStore(s => s.closePr);
  const refreshLists = usePrsStore(s => s.refreshLists);
  const markMerged = usePrsStore(s => s.markMerged);
  const refreshingPr = usePrsStore(s => s.refreshingPr);
  const pushToast = useUiStore(s => s.pushToast);
  const ciCountdown = useUiStore(s => s.ciCountdown);
  const [method, setMethod] = useState<MergeMethod>("squash");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!currentPr) return null;

  const s = currentPr.summary;
  const needsBypass = currentPr.mergeable_state != null && currentPr.mergeable_state !== "clean";

  const openChecks = () => {
    if (s.html_url) void api.openExternalUrl(`${s.html_url}/checks`);
  };

  const merge = async () => {
    setBusy(true); setErr(null);
    try {
      await api.mergePr(s.owner, s.repo, s.number, method, currentPr.head_sha);
      pushToast("success", t("merge.success"));
      onClose();
      // Merge done: drop the PR from the lists now (GitHub's search can still
      // report it as open for a few seconds), return to the home view, and
      // refresh to reconcile.
      markMerged(currentPr.summary.id);
      closePr();
      void refreshLists(true);
    } catch (e) {
      setErr(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlidePanel
      title={t("merge.title")}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t("merge.cancel")}</Button>
          <Button variant="subtle" onClick={merge} disabled={busy}>
            {busy ? t("merge.merging") : needsBypass ? t("merge.confirm_bypass") : t("merge.confirm")}
          </Button>
        </>
      }
    >
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap",
        marginBottom: "var(--space-3)", fontFamily: "var(--font-mono)", fontSize: 11,
      }}>
        <span style={{ color: "var(--c-text)" }}>{currentPr.head_ref}</span>
        <span aria-hidden style={{ color: "var(--c-overlay)" }}>→</span>
        <span style={{ color: "var(--c-text)" }}>{currentPr.base_ref}</span>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        marginBottom: "var(--space-6)", fontFamily: "var(--font-mono)", fontSize: 11,
      }}>
        <span style={{ color: "var(--c-subtext)" }}>{t("merge.ci_label")}</span>
        <CiBadge status={s.ci_status} onClick={openChecks} autoRefresh refreshing={refreshingPr} secondsLeft={ciCountdown} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {METHODS.map(m => (
          <label
            key={m}
            style={{
              padding: "var(--space-4) var(--space-5)",
              border: "1px solid var(--c-surface1)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-md)",
              background: method === m ? "var(--c-surface0)" : "transparent",
              transition: "background var(--transition-fast)",
              display: "flex", alignItems: "center", gap: "var(--space-3)",
            }}
          >
            <input type="radio" name="merge-method" checked={method === m} onChange={() => setMethod(m)} style={{ accentColor: "var(--c-accent)" }} />
            <span>{t(METHOD_KEY[m])}</span>
          </label>
        ))}
      </div>

      {needsBypass && (
        <div style={{
          marginTop: "var(--space-5)",
          padding: "var(--space-4) var(--space-5)",
          border: "1px solid var(--c-warn)",
          borderRadius: "var(--radius-md)",
          color: "var(--c-warn)",
          fontSize: "var(--text-base)",
        }}>
          ⚠ {t("merge.bypass_warning")}
        </div>
      )}

      {err && <div style={{ color: "var(--c-danger)", marginTop: "var(--space-4)", fontSize: "var(--text-base)" }}>{err}</div>}
    </SlidePanel>
  );
}
