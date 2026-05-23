import { useEffect, useMemo, useState } from "react";
import { PanelLeftClose } from "lucide-react";
import { api } from "../../ipc/client";
import type { FileDiff, PathFilter } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { FileTreeNode, TreeNode } from "./FileTreeNode";
import { Button } from "../ui";

function matchesGlob(pattern: string, path: string): boolean {
  const re = "^" + pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    + "$";
  try { return new RegExp(re).test(path); } catch { return false; }
}

function classify(files: FileDiff[], filters: PathFilter[]) {
  const matched: Record<string, FileDiff[]> = {};
  const unmatched: FileDiff[] = [];
  for (const f of files) {
    const hit = filters.find(fl => matchesGlob(fl.pattern, f.path));
    if (hit) (matched[hit.label] ||= []).push(f);
    else unmatched.push(f);
  }
  return { matched, unmatched };
}

function buildTree(files: FileDiff[]): TreeNode[] {
  const root: TreeNode = { type: "dir", name: "", children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let cur: TreeNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur.type !== "dir") break;
      let next = cur.children.find(c => c.type === "dir" && c.name === parts[i]) as TreeNode | undefined;
      if (!next) {
        next = { type: "dir", name: parts[i], children: [] };
        cur.children.push(next);
      }
      cur = next;
    }
    if (cur.type === "dir") {
      cur.children.push({
        type: "file", path: f.path,
        status: f.status, additions: f.additions, deletions: f.deletions,
      });
    }
  }
  return (root as Extract<TreeNode, { type: "dir" }>).children;
}

export function FileTreePanel() {
  const { diff, currentPr, selectedFile, selectFile } = usePrsStore();
  const setFileTreeCollapsed = useUiStore(s => s.setFileTreeCollapsed);
  const [filters, setFilters] = useState<PathFilter[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    if (!currentPr) { setFilters([]); return; }
    const repo = `${currentPr.summary.owner}/${currentPr.summary.repo}`;
    api.getPathFilters(repo).then(setFilters).catch(() => setFilters([]));
  }, [currentPr]);

  const { matched, unmatched } = useMemo(() => classify(diff, filters), [diff, filters]);
  const unmatchedTree = useMemo(() => buildTree(unmatched), [unmatched]);

  if (!currentPr) return <div style={{ padding: "var(--space-6)", color: "var(--c-subtext)", fontSize: "var(--text-base)" }}>Selecione um PR.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3) var(--space-5)",
        borderBottom: "1px solid var(--c-surface0)",
        background: "var(--c-mantle)",
      }}>
        <span style={{
          fontWeight: "var(--weight-semibold)" as unknown as number,
          fontSize: "var(--text-md)",
        }}>
          Arquivos
        </span>
        <Button
          variant="icon"
          size="sm"
          onClick={() => setFileTreeCollapsed(true)}
          title="Esconder (Ctrl+2)"
          aria-label="Esconder arquivos"
        >
          <PanelLeftClose size={14} />
        </Button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3) 0" }}>
        {unmatchedTree.map((n, i) => (
          <FileTreeNode key={i} node={n} selectedPath={selectedFile} onSelect={selectFile} />
        ))}

        {Object.entries(matched).map(([label, files]) => (
          <GroupNode
            key={label}
            label={label}
            files={files}
            open={showHidden}
            onToggle={() => setShowHidden(s => !s)}
            selectedFile={selectedFile}
            onSelect={selectFile}
          />
        ))}
      </div>
    </div>
  );
}

function GroupNode({ label, files, open, onToggle, selectedFile, onSelect }: {
  label: string;
  files: FileDiff[];
  open: boolean;
  onToggle: () => void;
  selectedFile: string | null;
  onSelect: (p: string) => void;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--c-mantle)", marginTop: "var(--space-3)", paddingTop: "var(--space-3)" }}>
      <button
        onClick={onToggle}
        className="prr-row"
        style={{
          display: "flex", width: "100%", textAlign: "left", border: 0,
          padding: "var(--space-3) var(--space-5)",
          color: "var(--c-subtext)",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)" as unknown as number,
          cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.4,
        }}
      >
        {open ? "▾" : "▸"} {label} ({files.length})
      </button>
      {open && files.map(f => (
        <FileTreeNode
          key={f.path}
          node={{ type: "file", path: f.path, status: f.status, additions: f.additions, deletions: f.deletions }}
          selectedPath={selectedFile}
          onSelect={onSelect}
          depth={1}
        />
      ))}
    </div>
  );
}
