import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FileText, FolderGit2, GitPullRequest, RefreshCw, Send, Settings, Sun, X } from "lucide-react";
import { usePrsStore } from "../../state/prsStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { fuzzyScore } from "../../util/fuzzy";
import type { PrSummary, RepoConfig } from "../../ipc/types";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenSubmit: () => void;
}

type ItemKind = "pr" | "file" | "command" | "repo";

interface Item {
  id: string;
  kind: ItemKind;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  match: string;
  /** Return `true` to keep the palette open (e.g. drilling into a repo scope). */
  run: () => boolean | void;
}

export function CommandPalette({ open, onClose, onOpenSettings, onOpenSubmit }: CommandPaletteProps) {
  const mine = usePrsStore(s => s.mine);
  const reviewRequested = usePrsStore(s => s.reviewRequested);
  const currentPr = usePrsStore(s => s.currentPr);
  const diff = usePrsStore(s => s.diff);
  const openPr = usePrsStore(s => s.openPr);
  const selectFile = usePrsStore(s => s.selectFile);
  const refreshLists = usePrsStore(s => s.refreshLists);
  const repos = useSettingsStore(s => s.settings?.repos) ?? [];
  const theme = useTheme();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [scope, setScope] = useState<RepoConfig | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state on each open.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setScope(null);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const commandOnly = query.startsWith(">");
  const effectiveQuery = commandOnly ? query.slice(1).trimStart() : query;

  const enterScope = (r: RepoConfig) => {
    setScope(r);
    setQuery("");
    setActive(0);
    queueMicrotask(() => inputRef.current?.focus());
  };

  const items = useMemo(() => {
    const out: Item[] = [];

    if (!commandOnly) {
      // PRs (dedupe by id; reviewRequested first since user opens them more often).
      const seen = new Set<number>();
      const allPrs: PrSummary[] = [];
      for (const p of [...reviewRequested, ...mine]) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        allPrs.push(p);
      }

      // Scoped: only show PRs of `scope`. Otherwise show all + repo entries.
      if (scope) {
        for (const p of allPrs) {
          if (p.owner === scope.owner && p.repo === scope.name) {
            out.push(prItem(p, openPr, onClose));
          }
        }
      } else {
        // Repo entries — clicking enters scope, not opens.
        for (const r of repos) {
          const count = allPrs.filter(p => p.owner === r.owner && p.repo === r.name).length;
          out.push({
            id: `repo:${r.owner}/${r.name}`,
            kind: "repo",
            group: "Repositórios",
            label: `${r.owner}/${r.name}`,
            hint: count > 0 ? `${count} PR${count === 1 ? "" : "s"}` : undefined,
            icon: <FolderGit2 size={14} />,
            match: `${r.owner}/${r.name} ${r.name} ${r.owner}`,
            run: () => { enterScope(r); return true; },
          });
        }
        for (const p of allPrs) {
          out.push(prItem(p, openPr, onClose));
        }
      }

      // Files within the open PR — always available when a PR is open.
      if (currentPr) {
        for (const f of diff) {
          out.push({
            id: `file:${f.path}`,
            kind: "file",
            group: "Arquivos",
            label: f.path,
            hint: `+${f.additions} −${f.deletions}`,
            icon: <FileText size={14} />,
            match: f.path,
            run: () => { selectFile(f.path); onClose(); },
          });
        }
      }
    }

    // Commands always available.
    out.push({
      id: "cmd:refresh",
      kind: "command",
      group: "Comandos",
      label: "Atualizar lista de PRs",
      hint: "refresh",
      icon: <RefreshCw size={14} />,
      match: "atualizar lista prs refresh",
      run: () => { refreshLists(); onClose(); },
    });
    out.push({
      id: "cmd:settings",
      kind: "command",
      group: "Comandos",
      label: "Abrir configurações",
      hint: "settings",
      icon: <Settings size={14} />,
      match: "abrir configurações settings",
      run: () => { onOpenSettings(); onClose(); },
    });
    out.push({
      id: "cmd:theme",
      kind: "command",
      group: "Comandos",
      label: `Alternar tema (atual: ${theme.choice})`,
      hint: "theme",
      icon: <Sun size={14} />,
      match: "alternar tema theme",
      run: () => {
        const next = theme.choice === "system" ? "dark" : theme.choice === "dark" ? "light" : "system";
        theme.setChoice(next);
        onClose();
      },
    });
    if (currentPr) {
      out.push({
        id: "cmd:submit",
        kind: "command",
        group: "Comandos",
        label: "Enviar review",
        hint: "submit review",
        icon: <Send size={14} />,
        match: "enviar review submit",
        run: () => { onOpenSubmit(); onClose(); },
      });
    }

    return out;
  }, [commandOnly, reviewRequested, mine, currentPr, diff, theme, repos, scope, openPr, selectFile, refreshLists, onClose, onOpenSettings, onOpenSubmit]);

  const filtered = useMemo(() => {
    if (!effectiveQuery) return items;
    const scored: Array<[number, Item]> = [];
    for (const it of items) {
      const s = fuzzyScore(it.match, effectiveQuery);
      if (s !== null) scored.push([s, it]);
    }
    scored.sort((a, b) => a[0] - b[0]);
    return scored.map(([, it]) => it);
  }, [items, effectiveQuery]);

  useEffect(() => { if (active >= filtered.length) setActive(0); }, [filtered.length, active]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-row="${active}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (scope) { setScope(null); setQuery(""); setActive(0); }
      else onClose();
      return;
    }
    if (e.key === "Backspace" && query === "" && scope) {
      e.preventDefault();
      setScope(null);
      setActive(0);
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(filtered.length - 1, a + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (!item) return;
      item.run();
      return;
    }
  };

  // Group items in render order without resorting (preserves fuzzy ranking).
  const groups: Array<[string, Item[]]> = [];
  for (const it of filtered) {
    const last = groups[groups.length - 1];
    if (last && last[0] === it.group) last[1].push(it);
    else groups.push([it.group, [it]]);
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-label="Paleta de comandos"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: "var(--z-modal)" as unknown as number,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={onKey}
        style={{
          width: "min(640px, 92vw)",
          background: "var(--c-base)",
          color: "var(--c-text)",
          border: "1px solid var(--c-surface1)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
        }}
      >
        <div style={{
          padding: "var(--space-3) var(--space-5)",
          borderBottom: "1px solid var(--c-surface0)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}>
          {scope && (
            <button
              onClick={() => { setScope(null); setQuery(""); setActive(0); inputRef.current?.focus(); }}
              aria-label={`Sair do escopo ${scope.owner}/${scope.name}`}
              title="Sair do escopo (Esc ou Backspace)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "2px var(--space-3)",
                background: "var(--c-surface0)",
                color: "var(--c-text)",
                border: "1px solid var(--c-surface1)",
                borderRadius: "var(--radius-pill)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              <FolderGit2 size={12} />
              <span>{scope.owner}/{scope.name}</span>
              <X size={12} style={{ color: "var(--c-subtext)" }} />
            </button>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={scope ? `PRs em ${scope.owner}/${scope.name}…` : "Buscar PRs, arquivos, repos, ou > comando..."}
            aria-label="Buscar"
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              background: "transparent",
              color: "var(--c-text)",
              fontSize: "var(--text-md)",
              padding: "var(--space-2) 0",
              minWidth: 0,
            }}
          />
        </div>

        <div ref={listRef} role="listbox" aria-label="Resultados" style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: "var(--space-7)",
              textAlign: "center",
              color: "var(--c-subtext)",
              fontSize: "var(--text-base)",
            }}>
              Nada encontrado.
            </div>
          ) : (
            groups.map(([group, gItems]) => {
              const startIdx = filtered.indexOf(gItems[0]);
              return (
                <CommandGroup key={group} label={group}>
                  {gItems.map((it, i) => (
                    <CommandItem
                      key={it.id}
                      rowIndex={startIdx + i}
                      active={startIdx + i === active}
                      icon={it.icon}
                      label={it.label}
                      hint={it.hint}
                      onHover={() => setActive(startIdx + i)}
                      onClick={it.run}
                    />
                  ))}
                </CommandGroup>
              );
            })
          )}
        </div>

        <div style={{
          padding: "var(--space-2) var(--space-5)",
          borderTop: "1px solid var(--c-surface0)",
          color: "var(--c-overlay)",
          fontSize: "var(--text-sm)",
          display: "flex",
          gap: "var(--space-5)",
          flexWrap: "wrap",
        }}>
          <span>↑↓ navegar</span>
          <span>↵ selecionar</span>
          <span>esc {scope ? "sair do escopo" : "fechar"}</span>
          <span>{"> "}prefixo = comandos</span>
        </div>
      </div>
    </div>
  );
}

export function CommandGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{
        padding: "var(--space-2) var(--space-5)",
        fontSize: "var(--text-sm)",
        color: "var(--c-subtext)",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        background: "var(--c-mantle)",
      }}>{label}</div>
      {children}
    </div>
  );
}

export function CommandItem({
  rowIndex, active, icon, label, hint, onClick, onHover,
}: {
  rowIndex: number;
  active: boolean;
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <div
      data-cmd-row={rowIndex}
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-5)",
        cursor: "pointer",
        background: active ? "var(--c-surface0)" : "transparent",
      }}
    >
      <span style={{ color: "var(--c-subtext)", display: "inline-flex", flex: "0 0 auto" }}>{icon}</span>
      <span style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>{label}</span>
      {hint && (
        <span style={{ color: "var(--c-overlay)", fontSize: "var(--text-sm)", flex: "0 0 auto" }}>{hint}</span>
      )}
    </div>
  );
}

function prItem(p: PrSummary, openPr: (o: string, r: string, n: number) => void, onClose: () => void): Item {
  return {
    id: `pr:${p.id}`,
    kind: "pr",
    group: "Pull Requests",
    label: `#${p.number} ${p.title}`,
    hint: `${p.owner}/${p.repo}`,
    icon: <GitPullRequest size={14} />,
    match: `${p.title} ${p.number} ${p.owner} ${p.repo} ${p.author}`,
    run: () => { openPr(p.owner, p.repo, p.number); onClose(); },
  };
}
