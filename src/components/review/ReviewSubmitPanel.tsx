import { useState } from "react";
import { SlidePanel, Button, Textarea } from "../ui";
import { api } from "../../ipc/client";
import { userMessage } from "../../ipc/errors";
import { useDraftsStore } from "../../state/draftsStore";
import { usePrsStore } from "../../state/prsStore";
import type { ReviewEvent } from "../../ipc/types";
import { useT } from "../../i18n";

interface Props { open: boolean; onClose: () => void; }

export function ReviewSubmitPanel({ open, onClose }: Props) {
  const t = useT();
  const { drafts, clear } = useDraftsStore();
  const { currentPr, refreshThreads } = usePrsStore();
  const [event, setEvent] = useState<ReviewEvent>("COMMENT");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!currentPr) return null;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.submitReview(
        currentPr.summary.owner, currentPr.summary.repo, currentPr.summary.number,
        event, body || null, currentPr.summary.id, drafts.map(d => d.id),
      );
      clear();
      await refreshThreads();
      onClose();
    } catch (e) {
      setErr(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlidePanel
      title={t("review_submit.title")}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t("review_submit.cancel")}</Button>
          <Button variant="subtle" onClick={submit} disabled={busy}>{busy ? t("review_submit.sending") : t("review_submit.send")}</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        {(["APPROVE", "COMMENT", "REQUEST_CHANGES"] as ReviewEvent[]).map(ev => (
          <label
            key={ev}
            style={{
              padding: "var(--space-4) var(--space-5)",
              border: "1px solid var(--c-surface1)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-md)",
              background: event === ev ? "var(--c-surface0)" : "transparent",
              transition: "background var(--transition-fast)",
              display: "flex", alignItems: "center", gap: "var(--space-3)",
            }}
          >
            <input type="radio" name="event" checked={event === ev} onChange={() => setEvent(ev)} style={{ accentColor: "var(--c-accent)" }} />
            <span>{ev === "APPROVE" ? t("review_submit.event_approve") : ev === "COMMENT" ? t("review_submit.event_comment") : t("review_submit.event_request_changes")}</span>
          </label>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={5}
        placeholder={t("review_submit.body_placeholder")}
      />
      <div style={{ marginTop: "var(--space-5)", fontSize: "var(--text-base)", color: "var(--c-subtext)" }}>
        {t("review_submit.drafts_count", { count: drafts.length })}
      </div>
      {err && <div style={{ color: "var(--c-danger)", marginTop: "var(--space-4)", fontSize: "var(--text-base)" }}>{err}</div>}
    </SlidePanel>
  );
}
