import { DiffEditor } from "@monaco-editor/react";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import { usePrsStore } from "../../state/prsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { monacoLatte, monacoMocha } from "../../theme/monaco-themes";
import { CommentLineModal } from "./CommentLineModal";
import { ThreadsSidebar } from "./ThreadsSidebar";

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

export function DiffPanel() {
  const { diff, selectedFile } = usePrsStore();
  const { resolved } = useTheme();
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const [ready, setReady] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  const file = diff.find(f => f.path === selectedFile);
  const { original, modified } = useMemo(() => parsePatchSides(file?.patch ?? null), [file?.patch]);

  useEffect(() => {
    if (!ready) return;
    const monaco = (window as unknown as { monaco?: typeof import("monaco-editor") }).monaco;
    if (!monaco) return;
    monaco.editor.defineTheme("cat-latte", monacoLatte);
    monaco.editor.defineTheme("cat-mocha", monacoMocha);
    monaco.editor.setTheme(resolved === "mocha" ? "cat-mocha" : "cat-latte");
  }, [resolved, ready]);

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
          title="Comentar"
          style={{ background: "transparent", border: 0, color: "var(--c-subtext)", cursor: "pointer", padding: 4 }}
        >
          <MessageSquarePlus size={14} />
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
            }}
            onMount={(ed) => { editorRef.current = ed; setReady(true); }}
          />
        </div>
        <div style={{ width: 280, borderLeft: "1px solid var(--c-surface0)", background: "var(--c-base)" }}>
          <ThreadsSidebar path={file.path} />
        </div>
      </div>
      <CommentLineModal open={commentOpen} onClose={() => setCommentOpen(false)} path={file.path} />
    </div>
  );
}
