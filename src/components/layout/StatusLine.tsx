import { usePrsStore } from "../../state/prsStore";
import { useDraftsStore } from "../../state/draftsStore";
import type { CiStatus } from "../../ipc/types";

/**
 * Etapa 3 · S2 — workshop status line.
 *
 * Persistent 28px footer, mantle bg, top hairline. Subscribes to the current
 * PR + draft count and renders a row of "segments" on the left. The right side
 * floats a single italic-serif creed — the app's voice. Segments hide when
 * irrelevant (e.g. no PR open → only the creed shows).
 *
 * Creed is hardcoded here; S7 wires it to `settings.ui.creed`.
 */
const CREED = "lendo. sem resumos.";

function ciDotColor(status: CiStatus | undefined): string {
  switch (status) {
    case "passing": return "var(--c-success)";
    case "pending": return "var(--c-warn)";
    case "failing": return "var(--c-danger)";
    default: return "var(--c-overlay)";
  }
}

export function StatusLine() {
  const currentPr = usePrsStore(s => s.currentPr);
  const draftCount = useDraftsStore(s => s.drafts.length);

  const summary = currentPr?.summary;
  const repoFullName = summary ? `${summary.owner}/${summary.repo}` : null;
  const changedFiles = summary?.changed_files;
  const additions = currentPr?.additions;
  const deletions = currentPr?.deletions;

  return (
    <div
      role="status"
      aria-label="status line"
      style={{
        flex: "0 0 28px",
        height: 28,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 16px",
        background: "var(--c-mantle)",
        borderTop: "1px solid var(--c-line)",
        color: "var(--c-subtext)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        userSelect: "none",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      {currentPr && repoFullName && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: ciDotColor(summary?.ci_status),
              flex: "0 0 7px",
            }}
          />
          <span style={{ color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis" }}>
            {repoFullName}
          </span>
        </span>
      )}

      {currentPr && summary && (
        <span>
          PR <b style={{ color: "var(--c-text)", fontWeight: 500 }}>#{summary.number}</b>
        </span>
      )}

      {currentPr && typeof changedFiles === "number" && typeof additions === "number" && typeof deletions === "number" && (
        <span>
          <b style={{ color: "var(--c-text)", fontWeight: 500 }}>{changedFiles}</b> arq
          {" "}
          <span style={{ color: "var(--c-overlay)" }}>·</span>
          {" "}
          <b style={{ color: "var(--c-success)", fontWeight: 500 }}>+{additions}</b>
          {" "}
          <b style={{ color: "var(--c-danger)", fontWeight: 500 }}>−{deletions}</b>
        </span>
      )}

      {currentPr && draftCount > 0 && (
        <span>
          <span aria-hidden="true">∗</span> <b style={{ color: "var(--c-text)", fontWeight: 500 }}>{draftCount}</b> rascunho
        </span>
      )}

      <span
        style={{
          marginLeft: "auto",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 12.5,
          fontWeight: 400,
          color: "var(--c-subtext)",
        }}
      >
        {CREED}
      </span>
    </div>
  );
}
