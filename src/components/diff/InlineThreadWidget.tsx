import { useState } from "react";
import type { ReviewThread } from "../../ipc/types";
import { api } from "../../ipc/client";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { userMessage } from "../../ipc/errors";
import { Button, Textarea } from "../ui";
import { inlineWidgetShell } from "./inlineWidgetStyle";
import { formatAge } from "../../util/time";

interface Props {
  thread: ReviewThread;
}

/**
 * Read-only thread renderer with a reply textarea below the conversation.
 * Submits via api.replyToThread; on success calls refreshThreads to
 * re-pull the conversation so the new reply renders.
 *
 * Etapa 3 · S6 visual: 2px left rule + state tag carry the open/resolved
 * signal. No avatar, no badge, no filled buttons. Actions are hairline
 * text links (Button variant="link"); "resolver" is tone="accent",
 * "responder" is tone="neutral".
 */
export function InlineThreadWidget({ thread }: Props) {
  const currentPr = usePrsStore(s => s.currentPr);
  const refreshThreads = usePrsStore(s => s.refreshThreads);
  const pushToast = useUiStore(s => s.pushToast);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [focused, setFocused] = useState(false);

  const lastComment = thread.comments[thread.comments.length - 1];
  const lastCommentId = lastComment?.id ?? thread.id;
  const lastAuthor = lastComment?.author ?? "—";
  const age = formatAge(lastComment?.created_at ?? "");
  const isRange = thread.start_line != null && thread.start_line !== thread.line;
  const sideLabel = thread.side === "RIGHT" ? "direita" : "esquerda";
  const lineLabel = isRange
    ? `L${thread.start_line}–${thread.line ?? "?"}`
    : `L${thread.line ?? "?"}`;
  const isResolved = thread.resolved;

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

  const ruleColor = isResolved ? "var(--c-overlay)" : "var(--c-accent)";
  const tagColor = isResolved ? "var(--c-overlay)" : "var(--c-accent)";
  const tagLabel = isResolved ? "RESOLVIDO" : "ABERTO";

  return (
    <div
      className="prr-inline-widget"
      style={{
        ...inlineWidgetShell,
        borderLeft: `2px solid ${ruleColor}`,
        paddingLeft: 14,
        opacity: isResolved ? 0.7 : 1,
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-subtext)",
        marginBottom: 10,
      }}>
        <span>{`${lineLabel} · ${sideLabel} · ${lastAuthor} · ${age}`}</span>
        <span style={{
          fontSize: 10, letterSpacing: "0.08em", color: tagColor,
        }}>{tagLabel}</span>
      </div>

      {thread.comments.map((c, i) => (
        <div
          key={c.id}
          style={{
            paddingTop: i === 0 ? 0 : 8,
            marginTop: i === 0 ? 0 : 8,
            borderTop: i === 0 ? "none" : "1px solid var(--c-line-soft)",
          }}
        >
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-subtext)",
            marginBottom: 2,
          }}>{c.author}</div>
          <div style={{
            fontSize: 12.5, lineHeight: 1.55, color: "var(--c-text)",
            whiteSpace: "pre-wrap",
          }}>{c.body}</div>
        </div>
      ))}

      {!isResolved && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--c-line-soft)" }}>
          <Textarea
            rows={focused || reply.length > 0 ? 4 : 2}
            placeholder="responder…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitReply(); }
            }}
          />
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 8,
          }}>
            {thread.node_id && (
              <Button
                variant="link"
                tone="accent"
                onClick={resolve}
                disabled={resolving}
                title="Marcar thread como resolvida"
              >
                {resolving ? "resolvendo…" : "resolver"}
              </Button>
            )}
            <Button variant="link" onClick={submitReply} disabled={busy || !reply.trim()}>
              {busy ? "enviando…" : "responder"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
