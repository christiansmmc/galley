import { ChevronDown, ChevronRight, Check, File } from "lucide-react";
import { useState } from "react";
import { usePrsStore } from "../../state/prsStore";

interface DirNode {
  type: "dir";
  name: string;
  originalName?: string;
  children: TreeNode[];
}
interface FileNode {
  type: "file";
  path: string;
  status: string;
  additions: number;
  deletions: number;
}
export type TreeNode = DirNode | FileNode;

interface Props {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}

const STATUS_COLORS: Record<string, string> = {
  added: "var(--c-success)", modified: "var(--c-warn)",
  removed: "var(--c-danger)", renamed: "var(--c-info)",
};

export function FileTreeNode({ node, selectedPath, onSelect, depth = 0 }: Props) {
  const [open, setOpen] = useState(true);
  const viewed = usePrsStore(s => node.type === "file" && s.viewedFiles.has(node.path));
  const pad = `calc(var(--space-4) + ${depth} * var(--space-6))`;

  if (node.type === "file") {
    const selected = selectedPath === node.path;
    return (
      <button
        onClick={() => onSelect(node.path)}
        className="prr-row"
        data-selected={selected}
        data-viewed={viewed}
        title={viewed ? `${node.path} (visto)` : node.path}
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-3)",
          width: "100%", textAlign: "left",
          padding: `var(--density-row-pad-y) var(--space-4) var(--density-row-pad-y) ${pad}`,
          border: 0,
          color: "var(--c-text)",
          cursor: "pointer",
          fontSize: "var(--text-base)",
          opacity: viewed ? 0.55 : 1,
          textDecoration: viewed ? "line-through" : "none",
          transition: "background var(--transition-fast), opacity var(--transition-fast)",
        }}
      >
        {viewed
          ? <Check size={12} style={{ color: "var(--c-success)" }} />
          : <File size={12} style={{ color: STATUS_COLORS[node.status] ?? "var(--c-subtext)" }} />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.path.split("/").pop()}</span>
        <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--c-subtext)" }}>
          +{node.additions} −{node.deletions}
        </span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="prr-row"
        title={node.originalName && node.originalName !== node.name ? node.originalName : undefined}
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-2)",
          width: "100%", textAlign: "left",
          padding: `var(--density-row-pad-y) var(--space-4) var(--density-row-pad-y) ${pad}`,
          border: 0,
          color: "var(--c-subtext)",
          cursor: "pointer",
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-medium)" as unknown as number,
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {node.name}
      </button>
      {open && node.children.map((child, i) => (
        <FileTreeNode key={i} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}
