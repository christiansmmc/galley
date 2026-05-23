import type { FileDiff } from "../../ipc/types";
import type { TreeNode } from "./FileTreeNode";

const JAVA_ROOTS = new Set(["com", "org", "io", "net", "dev", "gov", "edu", "ai", "app"]);

export function buildTree(files: FileDiff[], compact: boolean = false): TreeNode[] {
  const root: TreeNode = { type: "dir", name: "", originalName: "", children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let cur: TreeNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur.type !== "dir") break;
      let next = cur.children.find(c => c.type === "dir" && c.name === parts[i]) as TreeNode | undefined;
      if (!next) {
        next = { type: "dir", name: parts[i], originalName: parts[i], children: [] };
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
  const top = (root as Extract<TreeNode, { type: "dir" }>).children;
  if (compact) top.forEach(compactDir);
  return top;
}

function compactDir(node: TreeNode): void {
  if (node.type !== "dir") return;
  while (node.children.length === 1 && node.children[0].type === "dir") {
    const child = node.children[0];
    if (JAVA_ROOTS.has(child.name) && !JAVA_ROOTS.has(node.name) && !node.name.includes(".")) {
      break;
    }
    const sep = chooseSeparator(node.name, child.name);
    node.name = `${node.name}${sep}${child.name}`;
    node.originalName = `${node.originalName ?? ""}/${child.originalName ?? child.name}`;
    node.children = child.children;
  }
  node.children.forEach(compactDir);
}

function chooseSeparator(parent: string, child: string): string {
  if (parent.includes(".") || child.includes(".")) return ".";
  if (JAVA_ROOTS.has(parent) || JAVA_ROOTS.has(child)) return ".";
  return "/";
}

export interface FlatRow {
  path: string;
  name: string;
  dir: string;
  status: string;
  additions: number;
  deletions: number;
}

export function buildFlat(files: FileDiff[]): FlatRow[] {
  return files.map(f => {
    const idx = f.path.lastIndexOf("/");
    return {
      path: f.path,
      name: idx >= 0 ? f.path.slice(idx + 1) : f.path,
      dir: idx >= 0 ? f.path.slice(0, idx) : "",
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    };
  }).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
    a.dir.localeCompare(b.dir, undefined, { sensitivity: "base" })
  );
}
