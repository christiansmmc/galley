import { useState } from "react";
import { Modal } from "../common/Modal";
import { useDraftsStore } from "../../state/draftsStore";
import { usePrsStore } from "../../state/prsStore";

interface Props { open: boolean; onClose: () => void; path: string; }

export function CommentLineModal({ open, onClose, path }: Props) {
  const add = useDraftsStore(s => s.add);
  const currentPr = usePrsStore(s => s.currentPr);
  const [line, setLine] = useState("");
  const [body, setBody] = useState("");
  const [side, setSide] = useState<"RIGHT" | "LEFT">("RIGHT");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!currentPr || !line || !body.trim()) return;
    setBusy(true);
    try {
      await add(currentPr.summary.id, path, parseInt(line, 10), side, body.trim());
      setLine(""); setBody("");
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <Modal title="Novo comentário" open={open} onClose={onClose} footer={
      <>
        <button onClick={onClose} disabled={busy} style={ghost()}>Cancelar</button>
        <button onClick={submit} disabled={busy || !line || !body.trim()} style={primary()}>{busy ? "Salvando…" : "Salvar rascunho"}</button>
      </>
    }>
      <div style={{ fontSize: 12, color: "var(--c-subtext)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>{path}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="number"
          placeholder="Linha"
          value={line}
          onChange={e => setLine(e.target.value)}
          style={input()}
        />
        <select value={side} onChange={e => setSide(e.target.value as "RIGHT" | "LEFT")} style={input()}>
          <option value="RIGHT">Depois</option>
          <option value="LEFT">Antes</option>
        </select>
      </div>
      <textarea
        rows={4}
        placeholder="Comentário"
        value={body}
        onChange={e => setBody(e.target.value)}
        style={{ ...input(), width: "100%", resize: "vertical" }}
      />
    </Modal>
  );
}

function input(): React.CSSProperties {
  return {
    padding: 8, borderRadius: 5,
    border: "1px solid var(--c-surface1)",
    background: "var(--c-mantle)", color: "var(--c-text)",
    fontFamily: "var(--font-ui)", fontSize: 13,
  };
}
function ghost(): React.CSSProperties {
  return { padding: "8px 12px", borderRadius: 5, border: "1px solid var(--c-surface1)", background: "transparent", color: "var(--c-subtext)", cursor: "pointer" };
}
function primary(): React.CSSProperties {
  return { padding: "8px 14px", borderRadius: 5, border: 0, background: "var(--c-accent)", color: "white", cursor: "pointer" };
}
