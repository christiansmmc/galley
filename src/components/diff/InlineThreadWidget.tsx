import { useState } from "react";
import type { ReviewThread } from "../../ipc/types";
import { api } from "../../ipc/client";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { userMessage } from "../../ipc/errors";

interface Props {
  thread: ReviewThread;
}

/**
 * Read-only thread renderer with a reply textarea below the conversation.
 * Submits via api.replyToThread; on success calls refreshThreads to
 * re-pull the conversation so the new reply renders.
 */
export function InlineThreadWidget({ thread }: Props) {
  const currentPr = usePrsStore(s => s.currentPr);
  const refreshThreads = usePrsStore(s => s.refreshThreads);
  const pushToast = useUiStore(s => s.pushToast);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const lastCommentId = thread.comments[thread.comments.length - 1]?.id ?? thread.id;

  const submitReply = async () => {
    if (!currentPr) return;
    const body = reply.trim();
    if (!body) return;
    setBusy(true);
    try {
      await api.replyToThread(
        currentPr.summary.owner,
        currentPr.summary.repo,
        currentPr.summary.number,
        lastCommentId,
        body,
      );
      setReply("");
      await refreshThreads();
      pushToast("info", "Resposta enviada.");
    } catch (e) {
      pushToast("error", userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        margin: "4px 24px",
        padding: 10,
        borderRadius: 6,
        border: "1px solid var(--c-surface1)",
        background: "var(--c-mantle)",
        fontFamily: "var(--font-ui)",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, color: "var(--c-subtext)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
        Thread · L{thread.line ?? "?"} · {thread.side}
      </div>
      {thread.comments.map((c, i) => (
        <div
          key={c.id}
          style={{
            paddingTop: i === 0 ? 0 : 6,
            marginTop: i === 0 ? 0 : 6,
            borderTop: i === 0 ? "none" : "1px solid var(--c-surface0)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-subtext)" }}>{c.author}</div>
          <div style={{ fontSize: 13, color: "var(--c-text)", whiteSpace: "pre-wrap", marginTop: 2 }}>{c.body}</div>
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--c-surface0)" }}>
        <textarea
          rows={2}
          placeholder="Responder…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitReply(); }
          }}
          style={{
            width: "100%",
            padding: 6,
            borderRadius: 5,
            border: "1px solid var(--c-surface1)",
            background: "var(--c-base)",
            color: "var(--c-text)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button
            onClick={submitReply}
            disabled={busy || !reply.trim()}
            style={{
              padding: "4px 10px", borderRadius: 5, border: 0,
              background: "var(--c-accent)", color: "white",
              cursor: busy || !reply.trim() ? "default" : "pointer",
              fontSize: 12, opacity: busy || !reply.trim() ? 0.6 : 1,
            }}
          >{busy ? "Enviando…" : "Responder"}</button>
        </div>
      </div>
    </div>
  );
}
