import { DiffEditor } from "@monaco-editor/react";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import { usePrsStore } from "../../state/prsStore";
import { useDraftsStore } from "../../state/draftsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { monacoLatte, monacoMocha } from "../../theme/monaco-themes";
import { CommentLineModal } from "./CommentLineModal";
import { InlineCommentEditor } from "./InlineCommentEditor";
import { InlineThreadWidget } from "./InlineThreadWidget";
import { InlineDraftWidget } from "./InlineDraftWidget";
import { useDiffViewZones, type ViewZoneSpec } from "./useDiffViewZones";

function parsePatchSides(patch: string | null): { original: string; modified: string } {
  if (!patch) return { original: "", modified: "" };
  const orig: string[] = [];
  const mod: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) { orig.push(""); mod.push(""); continue; }
    if (line.startsWith("+")) mod.push(line.slice(1));
    else if (line.startsWith("-")) orig.push(line.slice(1));
    else { orig.push(line.startsWith(" ") ? line.slice(1) : line); mod.push(line.startsWith(" ") ? line.slice(1) : line); }
  }
  return { original: orig.join("\n"), modified: mod.join("\n") };
}

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", java: "java", kt: "kotlin",
    rb: "ruby", php: "php", c: "c", cpp: "cpp", h: "c", hpp: "cpp",
    json: "json", yml: "yaml", yaml: "yaml", toml: "toml", md: "markdown",
    sh: "shell", sql: "sql", html: "html", css: "css", scss: "scss",
  };
  return map[ext ?? ""] ?? "plaintext";
}

interface PendingDraft {
  line: number;
  side: "RIGHT" | "LEFT";
  startLine?: number;
}

interface RangeSelection {
  startLine: number;
  endLine: number;
  side: "RIGHT" | "LEFT";
  /** Pixel top inside the editor — used to anchor the floating button. */
  topPx: number;
}

export function DiffPanel() {
  const { diff, selectedFile, threads } = usePrsStore();
  const drafts = useDraftsStore(s => s.drafts);
  const addDraft = useDraftsStore(s => s.add);
  const currentPr = usePrsStore(s => s.currentPr);
  const { resolved } = useTheme();

  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [pending, setPending] = useState<PendingDraft | null>(null);
  const [rangeSel, setRangeSel] = useState<RangeSelection | null>(null);

  const file = diff.find(f => f.path === selectedFile);
  const { original, modified } = useMemo(() => parsePatchSides(file?.patch ?? null), [file?.patch]);

  // Clear transient editor state when the file changes — otherwise an inline
  // editor or range button can outlive its file.
  useEffect(() => {
    setPending(null);
    setRangeSel(null);
  }, [selectedFile]);

  // Threads + drafts scoped to the open file.
  const fileThreads = useMemo(() => threads.filter(t => t.path === selectedFile && t.line != null), [threads, selectedFile]);
  const fileDrafts = useMemo(() => drafts.filter(d => d.path === selectedFile), [drafts, selectedFile]);

  // Build the view-zone spec list. Each spec has a stable `key` so the hook
  // diffs cleanly between renders.
  const zoneSpecs: ViewZoneSpec[] = useMemo(() => {
    const specs: ViewZoneSpec[] = [];

    for (const t of fileThreads) {
      if (t.line == null) continue;
      const side = (t.side === "LEFT" ? "LEFT" : "RIGHT") as "LEFT" | "RIGHT";
      // Height is approximate: 1 header + 1 per comment + 2 for reply textarea.
      const heightInLines = Math.max(4, 2 + t.comments.length + 2);
      specs.push({
        key: `thread:${t.id}`,
        side,
        afterLineNumber: t.line,
        heightInLines,
        render: () => <InlineThreadWidget thread={t} />,
      });
    }

    for (const d of fileDrafts) {
      const side = (d.side === "LEFT" ? "LEFT" : "RIGHT") as "LEFT" | "RIGHT";
      const lineCount = Math.max(1, d.body.split("\n").length);
      const heightInLines = Math.max(3, 2 + Math.min(lineCount, 6));
      specs.push({
        key: `draft:${d.id}`,
        side,
        afterLineNumber: d.line,
        heightInLines,
        render: () => <InlineDraftWidget draft={d} />,
      });
    }

    if (pending) {
      specs.push({
        key: `pending:${pending.side}:${pending.startLine ?? "_"}:${pending.line}`,
        side: pending.side,
        afterLineNumber: pending.line,
        heightInLines: 6,
        render: () => (
          <InlineCommentEditor
            line={pending.line}
            side={pending.side}
            startLine={pending.startLine ?? null}
            onCancel={() => setPending(null)}
            onSave={async (body) => {
              if (!currentPr) return;
              await addDraft(
                currentPr.summary.id,
                file?.path ?? "",
                pending.line,
                pending.side,
                body,
                pending.startLine ?? null,
                pending.startLine != null ? pending.side : null,
              );
              setPending(null);
              setRangeSel(null);
            }}
          />
        ),
      });
    }

    return specs;
  }, [fileThreads, fileDrafts, pending, currentPr, addDraft, file?.path]);

  useDiffViewZones(editorRef, ready, zoneSpecs);

  // Monaco theme refresh on theme change.
  useEffect(() => {
    if (!ready) return;
    const monaco = (window as unknown as { monaco?: typeof import("monaco-editor") }).monaco;
    if (!monaco) return;
    monaco.editor.defineTheme("cat-latte", monacoLatte);
    monaco.editor.defineTheme("cat-mocha", monacoMocha);
    monaco.editor.setTheme(resolved === "mocha" ? "cat-mocha" : "cat-latte");
  }, [resolved, ready]);

  // Gutter hover affordance + range selection listener. Bound to the
  // *modified* editor (right side); the original side is treated as
  // read-only context for now.
  useEffect(() => {
    if (!ready) return;
    const diffEditor = editorRef.current;
    if (!diffEditor) return;
    const modified = diffEditor.getModifiedEditor();

    const disposables: Array<{ dispose: () => void }> = [];

    // Gutter `+` decoration follows the hovered line.
    let hoverDecorations: string[] = [];
    const monacoNs = (window as unknown as { monaco?: typeof import("monaco-editor") }).monaco;

    disposables.push(modified.onMouseMove((e) => {
      const target = e.target;
      const line = target.position?.lineNumber;
      const kind = target.type; // 2 = GUTTER_GLYPH_MARGIN, 3 = GUTTER_LINE_NUMBERS, 6 = CONTENT_TEXT
      if (!line || !monacoNs) {
        if (hoverDecorations.length) {
          hoverDecorations = modified.deltaDecorations(hoverDecorations, []);
        }
        return;
      }
      // Show the + on gutter line numbers OR while hovering the text itself.
      const showOnGutter = kind === 3 || kind === 2 || kind === 6;
      if (!showOnGutter) {
        if (hoverDecorations.length) {
          hoverDecorations = modified.deltaDecorations(hoverDecorations, []);
        }
        return;
      }
      hoverDecorations = modified.deltaDecorations(hoverDecorations, [
        {
          range: new monacoNs.Range(line, 1, line, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: "prr-comment-glyph",
            glyphMarginHoverMessage: { value: "Comentar nesta linha" },
          },
        },
      ]);
    }));

    // Click on gutter glyph → open inline editor at that line.
    disposables.push(modified.onMouseDown((e) => {
      const target = e.target;
      const line = target.position?.lineNumber;
      if (!line) return;
      // GLYPH_MARGIN = 2 in Monaco's MouseTargetType enum.
      if (target.type === 2) {
        // If there's an active range selection covering this line, open as range.
        const sel = modified.getSelection();
        if (sel && !sel.isEmpty() && sel.startLineNumber !== sel.endLineNumber) {
          const sLine = Math.min(sel.startLineNumber, sel.endLineNumber);
          const eLine = Math.max(sel.startLineNumber, sel.endLineNumber);
          setPending({ line: eLine, side: "RIGHT", startLine: sLine });
        } else {
          setPending({ line, side: "RIGHT" });
        }
        setRangeSel(null);
      }
    }));

    // Range selection listener — surface the floating button when the user
    // drags across multiple lines.
    disposables.push(modified.onDidChangeCursorSelection((e) => {
      const sel = e.selection;
      if (sel.startLineNumber === sel.endLineNumber) {
        setRangeSel(null);
        return;
      }
      const sLine = Math.min(sel.startLineNumber, sel.endLineNumber);
      const eLine = Math.max(sel.startLineNumber, sel.endLineNumber);
      const top = modified.getTopForLineNumber(eLine) - modified.getScrollTop();
      setRangeSel({ startLine: sLine, endLine: eLine, side: "RIGHT", topPx: top });
    }));

    return () => { for (const d of disposables) d.dispose(); };
  }, [ready]);

  if (!file) return <div style={{ padding: 16, color: "var(--c-subtext)" }}>Selecione um arquivo.</div>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "8px 12px", borderBottom: "1px solid var(--c-surface0)",
        background: "var(--c-mantle)", fontSize: 12, color: "var(--c-subtext)",
        fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ flex: 1 }}>
          {file.path}
          <span style={{ marginLeft: 8, color: "var(--c-green)" }}>+{file.additions}</span>
          <span style={{ marginLeft: 4, color: "var(--c-red)" }}>−{file.deletions}</span>
        </span>
        <button
          onClick={() => setCommentOpen(true)}
          title="Comentar (fallback)"
          style={{ background: "transparent", border: 0, color: "var(--c-subtext)", cursor: "pointer", padding: 4 }}
        >
          <MessageSquarePlus size={14} />
        </button>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <DiffEditor
          original={original}
          modified={modified}
          language={languageFor(file.path)}
          theme={resolved === "mocha" ? "vs-dark" : "vs"}
          options={{
            renderSideBySide: true,
            readOnly: true,
            originalEditable: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: "JetBrains Mono, Fira Code, monospace",
            fontSize: 13,
            glyphMargin: true,
          }}
          onMount={(ed) => { editorRef.current = ed; setReady(true); }}
        />
        {rangeSel && !pending && (
          <button
            onClick={() => {
              setPending({ line: rangeSel.endLine, side: rangeSel.side, startLine: rangeSel.startLine });
              setRangeSel(null);
            }}
            style={{
              position: "absolute",
              // We anchor mid-right; the diff editor's split puts the
              // modified side on the right half, so center the button there.
              right: 24,
              top: Math.max(rangeSel.topPx + 18, 4),
              padding: "6px 12px",
              borderRadius: 5,
              border: 0,
              background: "var(--c-accent)",
              color: "white",
              cursor: "pointer",
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              zIndex: 10,
            }}
          >
            Comentar {rangeSel.endLine - rangeSel.startLine + 1} linhas
          </button>
        )}
      </div>
      <CommentLineModal open={commentOpen} onClose={() => setCommentOpen(false)} path={file.path} />
    </div>
  );
}
