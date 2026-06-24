import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import { usePrsStore } from "../../state/prsStore";
import { useDraftsStore } from "../../state/draftsStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { monacoPaper, monacoLinen } from "../../theme/monaco-themes";
import { InlineCommentEditor } from "./InlineCommentEditor";
import { InlineThreadWidget } from "./InlineThreadWidget";
import { InlineDraftWidget } from "./InlineDraftWidget";
import { useDiffViewZones, type ViewZoneSpec } from "./useDiffViewZones";
import { useDiffRenderMode } from "./useDiffRenderMode";
import { parseDiff } from "./parseDiff";
import { buildFullFileModel } from "./buildFullFileModel";
import { diffModelPath } from "./diffModelPath";
import { api } from "../../ipc/client";
import { useUiStore } from "../../state/uiStore";
import { EmptyState, SkeletonBars, Sweep, Button } from "../ui";
import { splitPath } from "../../util/path";
import { PrMetaStrip } from "../prs/PrMetaStrip";
import { useT } from "../../i18n";

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
  const t = useT();
  const { diff, selectedFile, threads } = usePrsStore();
  const loadingPr = usePrsStore(s => s.loadingPr);
  const drafts = useDraftsStore(s => s.drafts);
  const addDraft = useDraftsStore(s => s.add);
  const currentPr = usePrsStore(s => s.currentPr);
  const viewedFiles = usePrsStore(s => s.viewedFiles);
  const setViewed = usePrsStore(s => s.setViewed);
  const settings = useSettingsStore(s => s.settings);
  const saveSettings = useSettingsStore(s => s.save);
  const renderModePref = settings?.ui.diff_render_mode;
  const diffFont = settings?.ui.diff_font;
  const { resolved } = useTheme();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const renderSideBySide = useDiffRenderMode(renderModePref, panelEl);
  const [diffEd, setDiffEd] = useState<editor.IStandaloneDiffEditor | null>(null);

  // Expose the modified editor's content viewport width as --diff-viewport-w
  // so inline comment/draft/thread widgets (rendered inside Monaco's
  // horizontally-scrolling view zones) can sticky-left and cap their width
  // to stay visible. Using Monaco's getLayoutInfo().contentWidth excludes
  // the line-number gutter, vertical scrollbar, and overview ruler — the
  // chrome that surrounds the actual code area.
  useEffect(() => {
    if (!panelEl || !diffEd) return;
    const modified = diffEd.getModifiedEditor();
    const update = () => {
      const info = modified.getLayoutInfo();
      panelEl.style.setProperty("--diff-viewport-w", `${info.contentWidth}px`);
    };
    update();
    const disposable = modified.onDidLayoutChange(update);
    return () => disposable.dispose();
  }, [panelEl, diffEd, renderSideBySide]);
  const [pending, setPending] = useState<PendingDraft | null>(null);
  const [rangeSel, setRangeSel] = useState<RangeSelection | null>(null);

  const file = diff.find(f => f.path === selectedFile);
  const pushToast = useUiStore(s => s.pushToast);
  const [wholeFile, setWholeFile] = useState(false);
  const [blobs, setBlobs] = useState<{ base: string; head: string } | null>(null);
  const [loadingBlobs, setLoadingBlobs] = useState(false);

  const patchParsed = useMemo(() => parseDiff(file?.patch ?? null), [file?.patch]);

  // Whole-file is opt-in per file and resets when the open file changes.
  useEffect(() => {
    setWholeFile(false);
    setBlobs(null);
  }, [selectedFile]);

  // Fetch base + head blobs when whole-file mode turns on. Added/removed files
  // only have one side; the missing side is an empty document. On any failure
  // we toast and fall back to the patch view.
  useEffect(() => {
    if (!wholeFile || !file || !currentPr) return;
    let cancelled = false;
    setLoadingBlobs(true);
    const owner = currentPr.summary.owner;
    const repo = currentPr.summary.repo;
    const basePath = file.previous_path ?? file.path;
    Promise.all([
      file.status === "added"
        ? Promise.resolve<string | null>("")
        : api.getFileContent(owner, repo, basePath, currentPr.base_sha),
      file.status === "removed"
        ? Promise.resolve<string | null>("")
        : api.getFileContent(owner, repo, file.path, currentPr.head_sha),
    ])
      .then(([base, head]) => {
        if (cancelled) return;
        if (base == null || head == null) {
          pushToast("error", t("diff.whole_file_failed"));
          setWholeFile(false);
          return;
        }
        setBlobs({ base, head });
      })
      .catch(() => {
        if (cancelled) return;
        pushToast("error", t("diff.whole_file_failed"));
        setWholeFile(false);
      })
      .finally(() => { if (!cancelled) setLoadingBlobs(false); });
    // Clear the loading flag on teardown too. A file switch cancels the
    // in-flight fetch (cancelled=true), which makes the `.finally` skip its
    // reset — without this the button stays stuck on "loading file…" forever.
    return () => { cancelled = true; setLoadingBlobs(false); };
  }, [wholeFile, file, currentPr, pushToast, t]);

  const parsed = useMemo(
    () => (wholeFile && blobs
      ? buildFullFileModel(blobs.base, blobs.head, file?.patch ?? null)
      : patchParsed),
    [wholeFile, blobs, patchParsed, file?.path, file?.patch],
  );

  // `v` toggles viewed for the open file. Ignore when an editable field has
  // focus (textarea / input / contentEditable) so typing "v" in a reply box
  // doesn't flip the seen-dot.
  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== "v" && e.key !== "V") return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable) return;
      }
      e.preventDefault();
      setViewed(file.path, !viewedFiles.has(file.path));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, setViewed, viewedFiles]);
  const {
    original, modified,
    modifiedLineMap, originalLineMap, modifiedFileToEditor,
    commentableModified,
  } = parsed;

  // Replace Monaco's gutter numbers (1, 2, 3... editor lines) with real file
  // lines from the patch hunks. Empty for hunk-separator rows. Two side maps
  // → two updateOptions calls.
  useEffect(() => {
    if (!diffEd) return;
    const fmt = (map: Map<number, number | null>) => (n: number) => {
      const v = map.get(n);
      return v == null ? "" : String(v);
    };
    diffEd.getModifiedEditor().updateOptions({ lineNumbers: fmt(modifiedLineMap) });
    diffEd.getOriginalEditor().updateOptions({ lineNumbers: fmt(originalLineMap) });
  }, [diffEd, modifiedLineMap, originalLineMap]);

  // Clear transient editor state when the file changes — otherwise an inline
  // editor or range button can outlive its file.
  useEffect(() => {
    setPending(null);
    setRangeSel(null);
  }, [selectedFile, wholeFile]);

  // Threads + drafts scoped to the open file.
  //
  // Sub-phase 2.0 decision: LEFT-side comments (on the original file) are
  // not rendered inline. The data model (Rust + IPC types) keeps `side:
  // String` so we can wire LEFT-side rendering later without a schema
  // change; only the React state and these filters narrow to RIGHT now.
  // The trade-off is: LEFT threads pulled from GitHub are silently
  // ignored. Acceptable in sub-phase 2.0 because new draft comments can
  // only be created RIGHT-side anyway (gutter listeners are bound to the
  // modified editor), so the only case affected is *replying* to a
  // pre-existing LEFT-side thread — rare in practice.
  const fileThreads = useMemo(
    () => threads.filter(t => t.path === selectedFile && t.line != null && t.side !== "LEFT"),
    [threads, selectedFile],
  );
  const fileDrafts = useMemo(
    () => drafts.filter(d => d.path === selectedFile && d.side !== "LEFT"),
    [drafts, selectedFile],
  );

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
      // LEFT-side threads are filtered out above (see fileThreads memo).
      const editorLine = modifiedFileToEditor.get(t.line);
      if (editorLine == null) {
        console.warn(`[DiffPanel] thread ${t.id} line ${t.line} not in current diff; skipping zone`);
        continue;
      }
      // Height estimate — overshoots intentionally so widget content does not
      // overflow into the next code line. ResizeObserver-based exact measure
      // is deferred to sub-phase 2.4.
      //
      // Budget per piece (in Monaco "lines"), S6 layout:
      //   ribbon row                         1
      //   per comment: author(1) + body(N) + gap(1)
      //     where N = max(1, body lines), capped at 4 to avoid runaway height
      //   reply textarea (rows=2) + actions  4   (skipped when resolved)
      //   outer padding (10px top + 12px bot) 2
      const commentLines = t.comments.reduce((sum, c) => {
        const bodyLines = Math.max(1, Math.min(4, c.body.split("\n").length));
        return sum + 1 + bodyLines + 1;
      }, 0);
      const replyLines = t.resolved ? 0 : 4;
      const heightInLines = Math.max(5, 1 + commentLines + replyLines + 2);
      specs.push({
        key: `thread:${t.id}`,
        side: "RIGHT",
        afterLineNumber: editorLine,
        heightInLines,
        render: () => <InlineThreadWidget thread={t} />,
      });
    }

    for (const d of fileDrafts) {
      // LEFT-side drafts are filtered out above (see fileDrafts memo).
      const editorLine = modifiedFileToEditor.get(d.line);
      if (editorLine == null) {
        console.warn(`[DiffPanel] draft ${d.id} line ${d.line} not in current diff; skipping zone`);
        continue;
      }
      // S6 layout: ribbon (1) + body (capped) + actions (1) + padding (2).
      const lineCount = Math.max(1, Math.min(d.body.split("\n").length, 6));
      const heightInLines = Math.max(5, 1 + lineCount + 1 + 2);
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
        heightInLines: 7,
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
    monaco.editor.defineTheme("workshop-paper", monacoPaper);
    monaco.editor.defineTheme("workshop-linen", monacoLinen);
    monaco.editor.setTheme(resolved === "linen" ? "workshop-linen" : "workshop-paper");
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
            glyphMarginHoverMessage: { value: t("diff.comment_on_line") },
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
    // Gated on target type CONTENT_TEXT: mouseup events inside view zones
    // (e.g. when the user clicks inside an inline editor/thread) shouldn't
    // rebuild rangeSel. We resolve the enum via monaco at runtime; fall back
    // to the documented value 6 if monaco isn't loaded yet (shouldn't
    // happen since the editor mounted, but defensive).
    const CONTENT_TEXT = monacoNs?.editor.MouseTargetType.CONTENT_TEXT ?? 6;
    disposables.push(modified.onMouseUp((e) => {
      // Only CONTENT_TEXT clicks count. Anything else (overlay widgets, view
      // zones, gutter, scrollbar, …) means the user isn't selecting code.
      if (e.target.type !== CONTENT_TEXT) return;
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
  }, [diffEd, modifiedLineMap, commentableModified, t]);

  if (!file) {
    if (loadingPr) return (
      <div
        role="status"
        aria-label={t("diff.loading_pr")}
        style={{ height: "100%", position: "relative" }}
      >
        <Sweep />
        <SkeletonBars rows={10} />
      </div>
    );
    if (currentPr) {
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <PrMetaStrip pr={currentPr} />
          <EmptyState
            title={t("diff.empty_select_file_title")}
            description={t("diff.empty_select_file_desc")}
          />
        </div>
      );
    }
    return (
      <EmptyState
        title={t("diff.empty_select_pr_title")}
        description={t("diff.empty_select_pr_desc")}
      />
    );
  }

  const isViewed = viewedFiles.has(file.path);
  const { head, leaf } = splitPath(file.path);
  // Revision token for the Monaco model URIs. Changing it when the PR head/base
  // moves (a new commit was pushed) forces fresh models so the diff reflects the
  // update instead of reusing the stale cached model. See diffModelPath.
  const diffRev = `${currentPr?.base_sha ?? "_"}.${currentPr?.head_sha ?? "_"}`;

  const copyPath = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(file.path);
  };
  const toggleRenderMode = () => {
    if (!settings) return;
    const next = renderSideBySide ? "inline" : "side-by-side";
    void saveSettings({ ...settings, ui: { ...settings.ui, diff_render_mode: next } });
  };

  return (
    <div
      ref={setPanelEl}
      data-diff-mode={renderSideBySide ? "side-by-side" : "inline"}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      {currentPr && <PrMetaStrip pr={currentPr} />}
      <div style={{
        padding: "10px 24px",
        borderBottom: "1px solid var(--c-line)",
        background: "var(--c-mantle)",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button
          onClick={() => setViewed(file.path, !isViewed)}
          title={isViewed ? t("diff.unmark_viewed") : t("diff.mark_viewed")}
          aria-label={isViewed ? t("diff.unmark_viewed_aria") : t("diff.mark_viewed_aria")}
          aria-pressed={isViewed}
          style={{
            flex: "0 0 auto",
            width: 9, height: 9,
            borderRadius: "50%",
            border: `1.5px solid ${isViewed ? "var(--c-accent)" : "var(--c-overlay)"}`,
            background: isViewed ? "var(--c-accent)" : "transparent",
            padding: 0,
            cursor: "pointer",
          }}
        />
        <span style={{
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)", fontSize: 11,
        }}>
          {head.map((seg, i) => (
            <span key={i}>
              <span style={{ color: "var(--c-subtext)" }}>{seg}</span>
              <span style={{ color: "var(--c-overlay)" }}>/</span>
            </span>
          ))}
          <span style={{ color: "var(--c-text)", fontWeight: 500 }}>{leaf}</span>
        </span>
        <span style={{
          flex: "0 0 auto",
          fontFamily: "var(--font-mono)", fontSize: 10.5,
          display: "inline-flex", gap: "var(--space-2)",
        }}>
          <span style={{ color: "var(--c-success)" }}>+{file.additions}</span>
          <span style={{ color: "var(--c-danger)" }}>−{file.deletions}</span>
        </span>
        <Button
          variant="link"
          onClick={copyPath}
          title={t("diff.copy_path")}
        >
          {t("diff.copy_path")}
        </Button>
        <span aria-hidden style={{ color: "var(--c-overlay)" }}>·</span>
        <Button
          variant="link"
          onClick={toggleRenderMode}
          title={renderSideBySide ? t("diff.switch_to_inline") : t("diff.switch_to_side_by_side")}
          disabled={!settings}
        >
          {renderSideBySide ? t("diff.inline") : t("diff.side_by_side")}
        </Button>
        <span aria-hidden style={{ color: "var(--c-overlay)" }}>·</span>
        <Button
          variant="link"
          onClick={() => setWholeFile(v => !v)}
          title={t("diff.whole_file_tooltip")}
          disabled={file.patch == null || loadingBlobs}
        >
          {loadingBlobs
            ? t("diff.whole_file_loading")
            : wholeFile
              ? t("diff.whole_file_active")
              : t("diff.whole_file")}
        </Button>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <DiffEditor
          key={`${currentPr?.summary.id ?? "_"}-${file.path}-${wholeFile ? "full" : "patch"}-${diffRev}`}
          original={original}
          modified={modified}
          language={languageFor(file.path)}
          originalModelPath={diffModelPath(currentPr?.summary.id ?? "_", "orig", file.path, wholeFile ? "full" : "patch", diffRev)}
          modifiedModelPath={diffModelPath(currentPr?.summary.id ?? "_", "mod", file.path, wholeFile ? "full" : "patch", diffRev)}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          theme={resolved === "linen" ? "workshop-linen" : "workshop-paper"}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("workshop-paper", monacoPaper);
            monaco.editor.defineTheme("workshop-linen", monacoLinen);
          }}
          options={{
            renderSideBySide,
            readOnly: true,
            originalEditable: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: diffFont?.family
              ? `${diffFont.family}, "JetBrains Mono", "Fira Code", monospace`
              : "JetBrains Mono, Fira Code, monospace",
            fontSize: diffFont?.size ?? 13,
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
              padding: "var(--space-3) var(--space-6)",
              borderRadius: "var(--radius-md)",
              border: 0,
              background: "var(--c-accent)",
              color: "white",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              boxShadow: "var(--shadow-md)",
              zIndex: "var(--z-overlay-widget)" as unknown as number,
            }}
          >
            {t("diff.comment_n_lines", { count: rangeSel.target.endLine - rangeSel.target.startLine + 1 })}
          </button>
        )}
      </div>
    </div>
  );
}
