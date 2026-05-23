import { useEffect, useMemo, useState } from "react";
import { PanelLeftClose, List as ListIcon, FolderTree, Search, File, FolderOpen, FileSearch } from "lucide-react";
import { api } from "../../ipc/client";
import type { FileDiff, PathFilter } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { useSettingsStore } from "../../state/settingsStore";
import { FileTreeNode } from "./FileTreeNode";
import { buildTree, buildFlat, FlatRow } from "./treeBuild";
import { Button, EmptyState, Input, Spinner } from "../ui";

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

const STATUS_COLORS: Record<string, string> = {
  added: "var(--c-success)", modified: "var(--c-warn)",
  removed: "var(--c-danger)", renamed: "var(--c-info)",
};

export function FileTreePanel() {
  const { diff, currentPr, selectedFile, selectFile } = usePrsStore();
  const loadingPr = usePrsStore(s => s.loadingPr);
  const setFileTreeCollapsed = useUiStore(s => s.setFileTreeCollapsed);
  const compactPaths = useSettingsStore(s => s.settings?.ui.compact_paths ?? true);
  const [filters, setFilters] = useState<PathFilter[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [view, setView] = useState<"tree" | "flat">("tree");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!currentPr) { setFilters([]); return; }
    const repo = `${currentPr.summary.owner}/${currentPr.summary.repo}`;
    api.getPathFilters(repo).then(setFilters).catch(() => setFilters([]));
  }, [currentPr]);

  const filteredDiff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return diff;
    return diff.filter(f => f.path.toLowerCase().includes(q));
  }, [diff, query]);

  const { matched, unmatched } = useMemo(() => classify(filteredDiff, filters), [filteredDiff, filters]);
  const unmatchedTree = useMemo(() => buildTree(unmatched, compactPaths), [unmatched, compactPaths]);
  const flatRows = useMemo(() => buildFlat(filteredDiff), [filteredDiff]);

  if (!currentPr) {
    if (loadingPr) {
      return (
        <div
          role="status"
          aria-label="Carregando PR"
          style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-subtext)", gap: "var(--space-3)" }}
        >
          <Spinner size={16} /><span>Carregando arquivos…</span>
        </div>
      );
    }
    return (
      <EmptyState
        icon={<FolderOpen size={20} />}
        title="Nenhum PR selecionado"
        description="Abra um PR pra ver os arquivos modificados."
        compact
      />
    );
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div role="group" aria-label="Modo de visualização" style={{ display: "flex", gap: 0 }}>
            <Button
              variant={view === "tree" ? "subtle" : "ghost"}
              size="sm"
              onClick={() => setView("tree")}
              title="Árvore"
              aria-label="Árvore"
              aria-pressed={view === "tree"}
            >
              <FolderTree size={12} />
            </Button>
            <Button
              variant={view === "flat" ? "subtle" : "ghost"}
              size="sm"
              onClick={() => setView("flat")}
              title="Lista"
              aria-label="Lista"
              aria-pressed={view === "flat"}
            >
              <ListIcon size={12} />
            </Button>
          </div>
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
      </div>
      <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--c-surface0)" }}>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{
            position: "absolute", left: "var(--space-3)", top: "50%", transform: "translateY(-50%)",
            color: "var(--c-subtext)", pointerEvents: "none",
          }} />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filtrar arquivos…"
            aria-label="Filtrar arquivos"
            style={{ paddingLeft: "calc(var(--space-3) + 18px)" }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3) 0" }}>
        {view === "flat"
          ? <FlatView rows={flatRows} selectedFile={selectedFile} onSelect={selectFile} />
          : <>
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
            </>}
      </div>
    </div>
  );
}

function FlatView({ rows, selectedFile, onSelect }: {
  rows: FlatRow[];
  selectedFile: string | null;
  onSelect: (p: string) => void;
}) {
  const viewedFiles = usePrsStore(s => s.viewedFiles);
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileSearch size={20} />}
        title="Nenhum arquivo"
        description="Nada bate com esse filtro."
        compact
      />
    );
  }
  return (
    <>
      {rows.map(r => {
        const selected = selectedFile === r.path;
        const viewed = viewedFiles.has(r.path);
        return (
          <button
            key={r.path}
            onClick={() => onSelect(r.path)}
            className="prr-row"
            data-selected={selected}
            data-viewed={viewed}
            title={r.path}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-3)",
              width: "100%", textAlign: "left",
              padding: "var(--space-2) var(--space-4)",
              border: 0,
              color: "var(--c-text)",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              opacity: viewed ? 0.55 : 1,
              textDecoration: viewed ? "line-through" : "none",
              transition: "background var(--transition-fast), opacity var(--transition-fast)",
            }}
          >
            <File size={12} style={{ color: STATUS_COLORS[r.status] ?? "var(--c-subtext)", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.name}</span>
            <span style={{
              fontSize: "var(--text-xs)", color: "var(--c-subtext)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "45%", textAlign: "right",
            }}>{r.dir}</span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--c-subtext)", flexShrink: 0 }}>
              +{r.additions} −{r.deletions}
            </span>
          </button>
        );
      })}
    </>
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
