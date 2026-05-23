import { useState } from "react";
import { Modal } from "../common/Modal";
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
          <button onClick={onClose} disabled={busy} style={ghost()}>Cancelar</button>
          <button onClick={submit} disabled={busy} style={primary()}>{busy ? "Enviando…" : "Enviar"}</button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["APPROVE", "COMMENT", "REQUEST_CHANGES"] as ReviewEvent[]).map(ev => (
          <label key={ev} style={{
            flex: 1, padding: 10, border: "1px solid var(--c-surface1)",
            borderRadius: 5, cursor: "pointer", fontSize: 13, textAlign: "center",
            background: event === ev ? "var(--c-surface0)" : "transparent",
          }}>
            <input type="radio" name="event" checked={event === ev} onChange={() => setEvent(ev)} style={{ display: "none" }} />
            {ev === "APPROVE" ? "Aprovar" : ev === "COMMENT" ? "Comentar" : "Pedir mudanças"}
          </label>
        ))}
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        placeholder="Resumo (opcional)"
        style={{
          width: "100%", padding: 8, borderRadius: 5,
          border: "1px solid var(--c-surface1)",
          background: "var(--c-mantle)", color: "var(--c-text)",
          fontFamily: "var(--font-ui)", fontSize: 13, resize: "vertical",
        }}
      />
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--c-subtext)" }}>
        {drafts.length} rascunho{drafts.length === 1 ? "" : "s"} inline.
      </div>
      {err && <div style={{ color: "var(--c-red)", marginTop: 8, fontSize: 12 }}>{err}</div>}
    </Modal>
  );
}

function ghost(): React.CSSProperties {
  return { padding: "8px 12px", borderRadius: 5, border: "1px solid var(--c-surface1)", background: "transparent", color: "var(--c-subtext)", cursor: "pointer" };
}
function primary(): React.CSSProperties {
  return { padding: "8px 14px", borderRadius: 5, border: 0, background: "var(--c-accent)", color: "white", cursor: "pointer" };
}
