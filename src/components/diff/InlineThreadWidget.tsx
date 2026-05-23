import { useState } from "react";
import type { ReviewThread } from "../../ipc/types";
import { api } from "../../ipc/client";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { userMessage } from "../../ipc/errors";
import { Avatar, Button, Textarea } from "../ui";

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
  const [resolving, setResolving] = useState(false);
  const [focused, setFocused] = useState(false);

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

  const resolve = async () => {
    if (!currentPr || !thread.node_id) return;
    setResolving(true);
    try {
      await api.resolveThread(
        currentPr.summary.owner,
        currentPr.summary.repo,
        currentPr.summary.number,
        thread.node_id,
      );
      await refreshThreads();
      pushToast("info", "Thread resolvida.");
    } catch (e) {
      pushToast("error", userMessage(e));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div
      style={{
        margin: "var(--space-2) var(--space-9)",
        padding: "var(--space-5)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--c-surface1)",
        background: "var(--c-mantle)",
        fontFamily: "var(--font-ui)",
        position: "relative",
        zIndex: "var(--z-base)" as unknown as number,
        pointerEvents: "auto",
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        fontSize: "var(--text-sm)",
        color: "var(--c-subtext)",
        marginBottom: "var(--space-3)",
        fontFamily: "var(--font-mono)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
      }}>
        <span>
          {thread.start_line != null && thread.start_line !== thread.line
            ? `Thread · L${thread.start_line}–${thread.line ?? "?"} · ${thread.side}`
            : `Thread · L${thread.line ?? "?"} · ${thread.side}`}
        </span>
        {thread.node_id && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resolve}
            disabled={resolving}
            title="Marcar thread como resolvida"
          >
            {resolving ? "Resolvendo…" : "Resolver"}
          </Button>
        )}
      </div>
      {thread.comments.map((c, i) => (
        <div
          key={c.id}
          style={{
            paddingTop: i === 0 ? 0 : "var(--space-3)",
            marginTop: i === 0 ? 0 : "var(--space-3)",
            borderTop: i === 0 ? "none" : "1px solid var(--c-surface0)",
            display: "flex",
            gap: "var(--space-4)",
            alignItems: "flex-start",
          }}
        >
          <Avatar login={c.author} size={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" as unknown as number, color: "var(--c-subtext)" }}>{c.author}</div>
            <div style={{ fontSize: "var(--text-md)", color: "var(--c-text)", whiteSpace: "pre-wrap", marginTop: "var(--space-1)" }}>{c.body}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--c-surface0)" }}>
        <Textarea
          rows={focused || reply.length > 0 ? 4 : 2}
          placeholder="Responder…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitReply(); }
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
          <Button variant="primary" size="sm" onClick={submitReply} disabled={busy || !reply.trim()}>
            {busy ? "Enviando…" : "Responder"}
          </Button>
        </div>
      </div>
    </div>
  );
}
