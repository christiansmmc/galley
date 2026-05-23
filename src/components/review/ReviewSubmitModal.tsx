import { useState } from "react";
import { Modal, Button, Textarea } from "../ui";
import { api } from "../../ipc/client";
import { userMessage } from "../../ipc/errors";
import { useDraftsStore } from "../../state/draftsStore";
import { usePrsStore } from "../../state/prsStore";
import type { ReviewEvent } from "../../ipc/types";

interface Props { open: boolean; onClose: () => void; }

export function ReviewSubmitModal({ open, onClose }: Props) {
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
    <Modal
      title="Enviar review"
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>{busy ? "Enviando…" : "Enviar"}</Button>
        </>
      }
    >
      <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {(["APPROVE", "COMMENT", "REQUEST_CHANGES"] as ReviewEvent[]).map(ev => (
          <label
            key={ev}
            style={{
              flex: 1,
              padding: "var(--space-5)",
              border: "1px solid var(--c-surface1)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "var(--text-md)",
              textAlign: "center",
              background: event === ev ? "var(--c-surface0)" : "transparent",
              transition: "background var(--transition-fast)",
            }}
          >
            <input type="radio" name="event" checked={event === ev} onChange={() => setEvent(ev)} style={{ display: "none" }} />
            {ev === "APPROVE" ? "Aprovar" : ev === "COMMENT" ? "Comentar" : "Pedir mudanças"}
          </label>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        placeholder="Resumo (opcional)"
      />
      <div style={{ marginTop: "var(--space-6)", fontSize: "var(--text-base)", color: "var(--c-subtext)" }}>
        {drafts.length} rascunho{drafts.length === 1 ? "" : "s"} inline.
      </div>
      {err && <div style={{ color: "var(--c-red)", marginTop: "var(--space-4)", fontSize: "var(--text-base)" }}>{err}</div>}
    </Modal>
  );
}
