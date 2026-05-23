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

interface ParsedDiff {
  original: string;
  modified: string;
  /** Editor line (1-based) on modified side → file line in modified file, or null for hunk separators. */
  modifiedLineMap: Map<number, number | null>;
  originalLineMap: Map<number, number | null>;
  /** Reverse: file line in modified file → editor line on the modified side. */
  modifiedFileToEditor: Map<number, number>;
  /** Reverse: file line in original file → editor line on the original side. */
  originalFileToEditor: Map<number, number>;
  /** Modified-side editor lines that GitHub will accept as comment targets. */
  commentableModified: Set<number>;
  commentableOriginal: Set<number>;
}

function parseDiff(patch: string | null): ParsedDiff {
  const empty: ParsedDiff = {
    original: "", modified: "",
    modifiedLineMap: new Map(), originalLineMap: new Map(),
    modifiedFileToEditor: new Map(), originalFileToEditor: new Map(),
    commentableModified: new Set(), commentableOriginal: new Set(),
  };
  if (!patch) return empty;

  const orig: string[] = [];
  const mod: string[] = [];
  const origMap = new Map<number, number | null>();
  const modMap = new Map<number, number | null>();
  const modFileToEditor = new Map<number, number>();
  const origFileToEditor = new Map<number, number>();
  const commentableMod = new Set<number>();
  const commentableOrig = new Set<number>();

  let origLine = 0;
  let modLine = 0;
  const hunkRe = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

  for (const raw of patch.split("\n")) {
    const m = hunkRe.exec(raw);
    if (m) {
      origLine = parseInt(m[1], 10);
      modLine = parseInt(m[2], 10);
      orig.push(""); origMap.set(orig.length, null);
      mod.push(""); modMap.set(mod.length, null);
      continue;
    }
    if (raw.startsWith("+")) {
      mod.push(raw.slice(1));
      modMap.set(mod.length, modLine);
      modFileToEditor.set(modLine, mod.length);
      commentableMod.add(mod.length);
      modLine++;
    } else if (raw.startsWith("-")) {
      orig.push(raw.slice(1));
      origMap.set(orig.length, origLine);
      origFileToEditor.set(origLine, orig.length);
      commentableOrig.add(orig.length);
      origLine++;
    } else if (raw.startsWith(" ") || raw.length === 0) {
      const content = raw.startsWith(" ") ? raw.slice(1) : raw;
      orig.push(content);
      origMap.set(orig.length, origLine);
      origFileToEditor.set(origLine, orig.length);
      commentableOrig.add(orig.length);
      mod.push(content);
      modMap.set(mod.length, modLine);
      modFileToEditor.set(modLine, mod.length);
      commentableMod.add(mod.length);
      origLine++;
      modLine++;
    }
    // Lines starting with '\' (e.g. "\ No newline at end of file") are skipped.
  }

  return {
    original: orig.join("\n"),
    modified: mod.join("\n"),
    modifiedLineMap: modMap,
    originalLineMap: origMap,
    modifiedFileToEditor: modFileToEditor,
    originalFileToEditor: origFileToEditor,
    commentableModified: commentableMod,
    commentableOriginal: commentableOrig,
  };
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

/**
 * A pending (uncommitted) inline draft. Two coordinate systems are kept
 * separate by construction:
 *   - `anchor` is what Monaco understands (editor lines / side).
 *   - `target` is what is persisted to disk and posted to GitHub (file lines).
 *
 * Fix 6 narrows the React-side `side` to "RIGHT" only; LEFT-side commenting
 * is deferred. The Rust + IPC types stay flexible (`String`).
 */
interface PendingDraft {
  anchor: { editorLine: number; side: "RIGHT" };
  target: {
    line: number;
    startLine?: number;
    side: "RIGHT";
    startSide?: "RIGHT";
  };
}

interface RangeSelection {
  anchor: {
    startEditorLine: number;
    endEditorLine: number;
    side: "RIGHT";
    /** Pixel top inside the editor — used to anchor the floating button. */
    topPx: number;
  };
  target: {
    startLine: number;
    endLine: number;
    side: "RIGHT";
  };
}

export function DiffPanel() {
  const { diff, selectedFile, threads } = usePrsStore();
  const drafts = useDraftsStore(s => s.drafts);
  const addDraft = useDraftsStore(s => s.add);
  const currentPr = usePrsStore(s => s.currentPr);
  const { resolved } = useTheme();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [diffEd, setDiffEd] = useState<editor.IStandaloneDiffEditor | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [pending, setPending] = useState<PendingDraft | null>(null);
  const [rangeSel, setRangeSel] = useState<RangeSelection | null>(null);

  const file = diff.find(f => f.path === selectedFile);
  const parsed = useMemo(() => parseDiff(file?.patch ?? null), [file?.patch]);
  const {
    original, modified,
    modifiedLineMap, modifiedFileToEditor,
    commentableModified,
  } = parsed;

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
  //
  // CRITICAL: `afterLineNumber` is an *editor* line, never a file line.
  // Threads and saved drafts arrive with file lines; we translate via the
  // reverse map. Stale data (file line not in the current diff) is skipped
  // with a console warning rather than crashing.
  const zoneSpecs: ViewZoneSpec[] = useMemo(() => {
    const specs: ViewZoneSpec[] = [];

    for (const t of fileThreads) {
      if (t.line == null) continue;
      // For RIGHT side we use the modified reverse map; LEFT would need the
      // original reverse map. Until we ship LEFT-side rendering, only RIGHT
      // threads are placed inline.
      if (t.side === "LEFT") continue;
      const editorLine = modifiedFileToEditor.get(t.line);
      if (editorLine == null) {
        console.warn(`[DiffPanel] thread ${t.id} line ${t.line} not in current diff; skipping zone`);
        continue;
      }
      // Height is approximate: 1 header + 1 per comment + 2 for reply textarea.
      // Range threads bump the header height by 1 line for the "Lx–y" label.
      const isRange = t.start_line != null && t.start_line !== t.line;
      const heightInLines = Math.max(4, 2 + t.comments.length + 2 + (isRange ? 1 : 0));
      specs.push({
        key: `thread:${t.id}`,
        side: "RIGHT",
        afterLineNumber: editorLine,
        heightInLines,
        render: () => <InlineThreadWidget thread={t} />,
      });
    }

    for (const d of fileDrafts) {
      if (d.side === "LEFT") continue;
      const editorLine = modifiedFileToEditor.get(d.line);
      if (editorLine == null) {
        console.warn(`[DiffPanel] draft ${d.id} line ${d.line} not in current diff; skipping zone`);
        continue;
      }
      const lineCount = Math.max(1, d.body.split("\n").length);
      const heightInLines = Math.max(3, 2 + Math.min(lineCount, 6));
      specs.push({
        key: `draft:${d.id}`,
        side: "RIGHT",
        afterLineNumber: editorLine,
        heightInLines,
        render: () => <InlineDraftWidget draft={d} />,
      });
    }

    if (pending) {
      specs.push({
        // Constant key — see fix #4. Even if the user retargets the pending
        // draft (e.g. by re-clicking a different line), the shape-diff in
        // useDiffViewZones will remove+re-add only when afterLineNumber/side/
        // heightInLines change, never on a body keystroke.
        key: "pending:current",
        side: pending.anchor.side,
        afterLineNumber: pending.anchor.editorLine,
        heightInLines: 6,
        render: () => (
          <InlineCommentEditor
            line={pending.target.line}
            side={pending.target.side}
            startLine={pending.target.startLine ?? null}
            onCancel={() => setPending(null)}
            onSave={async (body) => {
              if (!currentPr) return;
              await addDraft(
                currentPr.summary.id,
                file?.path ?? "",
                pending.target.line,
                pending.target.side,
                body,
                pending.target.startLine ?? null,
                pending.target.startSide ?? null,
              );
              setPending(null);
              setRangeSel(null);
            }}
          />
        ),
      });
    }

    return specs;
  }, [fileThreads, fileDrafts, pending, currentPr, addDraft, file?.path, modifiedFileToEditor]);

  useDiffViewZones(diffEd, zoneSpecs);

  // Monaco theme refresh on theme change.
  useEffect(() => {
    if (!diffEd) return;
    const monaco = (window as unknown as { monaco?: typeof import("monaco-editor") }).monaco;
    if (!monaco) return;
    monaco.editor.defineTheme("cat-latte", monacoLatte);
    monaco.editor.defineTheme("cat-mocha", monacoMocha);
    monaco.editor.setTheme(resolved === "mocha" ? "cat-mocha" : "cat-latte");
  }, [resolved, diffEd]);

  // Gutter hover affordance + range selection listener. Bound to the
  // *modified* editor (right side); the original side is treated as
  // read-only context for now (LEFT-side commenting deferred — see fix 6).
  useEffect(() => {
    if (!diffEd) return;
    const modified = diffEd.getModifiedEditor();

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
      const showOnGutter = kind === 3 || kind === 2 || kind === 6;
      // Only allow the + on commentable lines (= context + additions inside a hunk).
      if (!showOnGutter || !commentableModified.has(line)) {
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
      const editorLine = target.position?.lineNumber;
      if (!editorLine) return;
      if (target.type !== 2) return; // GLYPH_MARGIN
      if (!commentableModified.has(editorLine)) return;

      // If there's an active range selection covering multiple commentable
      // lines, open as range — capturing both anchor (editor) and target
      // (file) coordinates.
      const sel = modified.getSelection();
      if (sel && !sel.isEmpty() && sel.startLineNumber !== sel.endLineNumber) {
        const sEditor = Math.min(sel.startLineNumber, sel.endLineNumber);
        const eEditor = Math.max(sel.startLineNumber, sel.endLineNumber);
        const startFile = modifiedLineMap.get(sEditor);
        const endFile = modifiedLineMap.get(eEditor);
        if (startFile != null && endFile != null) {
          setPending({
            anchor: { editorLine: eEditor, side: "RIGHT" },
            target: { line: endFile, startLine: startFile, side: "RIGHT", startSide: "RIGHT" },
          });
          setRangeSel(null);
          return;
        }
      }
      const fileLine = modifiedLineMap.get(editorLine);
      if (fileLine == null) return;
      setPending({
        anchor: { editorLine, side: "RIGHT" },
        target: { line: fileLine, side: "RIGHT" },
      });
      setRangeSel(null);
    }));

    // Range selection listener — surface the floating button when the user
    // drags across multiple lines. We listen on mouseup rather than
    // onDidChangeCursorSelection because in a read-only DiffEditor the
    // cursor-selection event doesn't fire reliably for drag-only selections
    // (no cursor activity → no event).
    //
    // Gated on target type CONTENT_TEXT (6): mouseup events inside view zones
    // (e.g. when the user clicks inside an inline editor/thread) shouldn't
    // rebuild rangeSel. Monaco's MouseTargetType.CONTENT_TEXT === 6.
    disposables.push(modified.onMouseUp((e) => {
      const kind = e.target.type;
      // Only CONTENT_TEXT clicks count. Anything else (overlay widgets, view
      // zones, gutter, scrollbar, …) means the user isn't selecting code.
      if (kind !== 6) return;
      const sel = modified.getSelection();
      if (!sel || sel.startLineNumber === sel.endLineNumber) {
        setRangeSel(null);
        return;
      }
      const sEditor = Math.min(sel.startLineNumber, sel.endLineNumber);
      const eEditor = Math.max(sel.startLineNumber, sel.endLineNumber);
      const startFile = modifiedLineMap.get(sEditor);
      const endFile = modifiedLineMap.get(eEditor);
      if (startFile == null || endFile == null) {
        setRangeSel(null);
        return;
      }
      const top = modified.getTopForLineNumber(eEditor) - modified.getScrollTop();
      setRangeSel({
        anchor: { startEditorLine: sEditor, endEditorLine: eEditor, side: "RIGHT", topPx: top },
        target: { startLine: startFile, endLine: endFile, side: "RIGHT" },
      });
    }));

    return () => { for (const d of disposables) d.dispose(); };
  }, [diffEd, modifiedLineMap, commentableModified]);

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
          key={`${currentPr?.summary.id ?? "_"}-${file.path}`}
          original={original}
          modified={modified}
          language={languageFor(file.path)}
          originalModelPath={`inmemory://pr/${currentPr?.summary.id ?? "_"}/orig/${file.path}`}
          modifiedModelPath={`inmemory://pr/${currentPr?.summary.id ?? "_"}/mod/${file.path}`}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          theme={resolved === "mocha" ? "cat-mocha" : "cat-latte"}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("cat-latte", monacoLatte);
            monaco.editor.defineTheme("cat-mocha", monacoMocha);
          }}
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
          onMount={(ed) => { setDiffEd(ed); }}
        />
        {rangeSel && !pending && (
          <button
            onClick={() => {
              setPending({
                anchor: { editorLine: rangeSel.anchor.endEditorLine, side: "RIGHT" },
                target: {
                  line: rangeSel.target.endLine,
                  startLine: rangeSel.target.startLine,
                  side: "RIGHT",
                  startSide: "RIGHT",
                },
              });
              setRangeSel(null);
            }}
            style={{
              position: "absolute",
              // We anchor mid-right; the diff editor's split puts the
              // modified side on the right half, so center the button there.
              right: 24,
              top: Math.max(rangeSel.anchor.topPx + 18, 4),
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
            Comentar {rangeSel.target.endLine - rangeSel.target.startLine + 1} linhas
          </button>
        )}
      </div>
      <CommentLineModal open={commentOpen} onClose={() => setCommentOpen(false)} path={file.path} />
    </div>
  );
}
