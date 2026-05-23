import { ChevronDown, ChevronRight, File } from "lucide-react";
import { useState } from "react";

interface DirNode {
  type: "dir";
  name: string;
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
  added: "var(--c-green)", modified: "var(--c-amber)",
  removed: "var(--c-red)", renamed: "var(--c-blue)",
};

export function FileTreeNode({ node, selectedPath, onSelect, depth = 0 }: Props) {
  const [open, setOpen] = useState(true);
  const pad = 8 + depth * 12;

  if (node.type === "file") {
    return (
      <button
        onClick={() => onSelect(node.path)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", textAlign: "left",
          padding: `4px 8px 4px ${pad}px`, border: 0,
          background: selectedPath === node.path ? "var(--c-surface0)" : "transparent",
          color: "var(--c-text)", cursor: "pointer", fontSize: 12,
        }}
      >
        <File size={12} style={{ color: STATUS_COLORS[node.status] ?? "var(--c-subtext)" }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.path.split("/").pop()}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--c-subtext)" }}>
          +{node.additions} −{node.deletions}
        </span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          width: "100%", textAlign: "left",
          padding: `4px 8px 4px ${pad}px`, border: 0,
          background: "transparent", color: "var(--c-subtext)",
          cursor: "pointer", fontSize: 12, fontWeight: 500,
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
