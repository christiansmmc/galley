import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FileText, FolderGit2, GitPullRequest, RefreshCw, Send, Settings, Sun, X } from "lucide-react";
import { usePrsStore } from "../../state/prsStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { fuzzyScore } from "../../util/fuzzy";
import type { PrSummary, RepoConfig } from "../../ipc/types";
import { useT } from "../../i18n";

type TFn = ReturnType<typeof useT>;

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
  const t = useT();
  const mine = usePrsStore(s => s.mine);
  const reviewRequested = usePrsStore(s => s.reviewRequested);
  const currentPr = usePrsStore(s => s.currentPr);
  const diff = usePrsStore(s => s.diff);
  const openPr = usePrsStore(s => s.openPr);
  const selectFile = usePrsStore(s => s.selectFile);
  const refreshLists = usePrsStore(s => s.refreshLists);
  const refreshCurrentPr = usePrsStore(s => s.refreshCurrentPr);
  const repos = useSettingsStore(s => s.settings?.repos) ?? [];
  const sources = useSettingsStore(s => s.settings?.ui.palette_sources) ?? { prs: true, files: true, repos: true, commands: true };
  const theme = useTheme();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [scope, setScope] = useState<RepoConfig | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** While >0, ignore hover-driven setActive — lets keyboard arrows win against accidental mouse twitches over the palette. */
  const keyNavLockRef = useRef(0);
  /** Becomes true only after the user actually moves the mouse inside the palette. Prevents the initial render's onMouseEnter (which fires on whichever row the cursor is parked over) from clobbering the keyboard default of "first item". */
  const mouseMovedRef = useRef(false);
  const hover = (idx: number) => {
    if (!mouseMovedRef.current) return;
    if (keyNavLockRef.current !== 0) return;
    setActive(idx);
  };

  // Reset state on each open.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setScope(null);
      mouseMovedRef.current = false;
      queueMicrotask(() => {
        inputRef.current?.focus();
        if (listRef.current) listRef.current.scrollTop = 0;
      });
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

      // Scoped: only show PRs of `scope`. Otherwise show repo entries + all PRs.
      if (scope) {
        if (sources.prs) {
          for (const p of allPrs) {
            if (p.owner === scope.owner && p.repo === scope.name) {
              out.push(prItem(p, openPr, onClose, t));
            }
          }
        }
      } else {
        if (sources.repos) {
          for (const r of repos) {
            const count = allPrs.filter(p => p.owner === r.owner && p.repo === r.name).length;
            out.push({
              id: `repo:${r.owner}/${r.name}`,
              kind: "repo",
              group: t("command_palette.group_repos"),
              label: `${r.owner}/${r.name}`,
              hint: count > 0 ? t("command_palette.pr_count", { count }) : undefined,
              icon: <FolderGit2 size={14} />,
              match: `${r.owner}/${r.name} ${r.name} ${r.owner}`,
              run: () => { enterScope(r); return true; },
            });
          }
        }
        if (sources.prs) {
          for (const p of allPrs) {
            out.push(prItem(p, openPr, onClose, t));
          }
        }
      }

      // Files within the open PR.
      if (currentPr && sources.files) {
        for (const f of diff) {
          out.push({
            id: `file:${f.path}`,
            kind: "file",
            group: t("command_palette.group_files"),
            label: f.path,
            hint: `+${f.additions} −${f.deletions}`,
            icon: <FileText size={14} />,
            match: f.path,
            run: () => { selectFile(f.path); onClose(); },
          });
        }
      }
    }

    // Commands appear when the source toggle is on OR when the user is in
    // `>` command-only mode (escape hatch even if they hid commands).
    if (commandOnly || sources.commands) {
      out.push({
        id: "cmd:refresh",
        kind: "command",
        group: t("command_palette.group_commands"),
        label: t("command_palette.cmd_refresh"),
        hint: t("command_palette.cmd_refresh_hint"),
        icon: <RefreshCw size={14} />,
        match: "atualizar lista prs refresh update",
        run: () => { refreshLists(true); onClose(); },
      });
      out.push({
        id: "cmd:settings",
        kind: "command",
        group: t("command_palette.group_commands"),
        label: t("command_palette.cmd_settings"),
        hint: t("command_palette.cmd_settings_hint"),
        icon: <Settings size={14} />,
        match: "abrir configurações settings open",
        run: () => { onOpenSettings(); onClose(); },
      });
      out.push({
        id: "cmd:theme",
        kind: "command",
        group: t("command_palette.group_commands"),
        label: t("command_palette.cmd_theme", { theme: theme.choice }),
        hint: t("command_palette.cmd_theme_hint"),
        icon: <Sun size={14} />,
        match: "alternar tema theme toggle",
        run: () => {
          const next = theme.choice === "system" ? "dark" : theme.choice === "dark" ? "light" : "system";
          theme.setChoice(next);
          onClose();
        },
      });
      if (currentPr) {
        out.push({
          id: "cmd:refresh_pr",
          kind: "command",
          group: t("command_palette.group_commands"),
          label: t("command_palette.cmd_refresh_pr"),
          hint: t("command_palette.cmd_refresh_pr_hint"),
          icon: <RefreshCw size={14} />,
          match: "atualizar pr atual refresh current update",
          run: () => { refreshCurrentPr(); onClose(); },
        });
      }
      if (currentPr) {
        out.push({
          id: "cmd:submit",
          kind: "command",
          group: t("command_palette.group_commands"),
          label: t("command_palette.cmd_submit"),
          hint: t("command_palette.cmd_submit_hint"),
          icon: <Send size={14} />,
          match: "enviar review submit send",
          run: () => { onOpenSubmit(); onClose(); },
        });
      }
    }

    return out;
  }, [commandOnly, reviewRequested, mine, currentPr, diff, theme, repos, scope, sources, openPr, selectFile, refreshLists, refreshCurrentPr, onClose, onOpenSettings, onOpenSubmit, t]);

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
  // After typing changes filtered/grouping, snap selection back to the top so the user
  // doesn't see a stale highlight buried somewhere in the new list.
  useEffect(() => { setActive(0); }, [effectiveQuery, scope]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-row="${active}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  const armKeyNavLock = () => {
    keyNavLockRef.current += 1;
    window.setTimeout(() => { keyNavLockRef.current = Math.max(0, keyNavLockRef.current - 1); }, 300);
  };

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
    if (e.key === "ArrowDown") { e.preventDefault(); armKeyNavLock(); setActive(a => Math.min(visualOrder.length - 1, a + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); armKeyNavLock(); setActive(a => Math.max(0, a - 1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = visualOrder[active];
      if (!item) return;
      item.run();
      return;
    }
  };

  // Bucket items by group so each group header appears exactly once even
  // after a fuzzy resort interleaves items. Groups render in a fixed order;
  // fuzzy ranking is preserved *within* each group. `visualOrder` is the
  // linear traversal the keyboard navigates — its indices are what `active`
  // refers to from this point on.
  const GROUP_ORDER = [
    t("command_palette.group_repos"),
    t("command_palette.group_prs"),
    t("command_palette.group_files"),
    t("command_palette.group_commands"),
  ];
  const buckets = new Map<string, Item[]>();
  for (const it of filtered) {
    const b = buckets.get(it.group);
    if (b) b.push(it);
    else buckets.set(it.group, [it]);
  }
  const groups: Array<[string, Item[]]> = [];
  for (const g of GROUP_ORDER) {
    const items = buckets.get(g);
    if (items && items.length) groups.push([g, items]);
  }
  for (const [g, items] of buckets) {
    if (!GROUP_ORDER.includes(g)) groups.push([g, items]);
  }
  const visualOrder: Item[] = [];
  for (const [, items] of groups) visualOrder.push(...items);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-label={t("command_palette.aria_label")}
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
          borderBottom: "1px solid var(--c-line)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}>
          <span aria-hidden="true" style={{
            color: "var(--c-overlay)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1,
            flex: "0 0 auto",
          }}>⌕</span>
          {scope && (
            <button
              onClick={() => { setScope(null); setQuery(""); setActive(0); inputRef.current?.focus(); }}
              aria-label={t("command_palette.exit_scope_aria", { scope: `${scope.owner}/${scope.name}` })}
              title={t("command_palette.exit_scope_title")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "2px var(--space-3)",
                background: "var(--c-accent-soft)",
                color: "var(--c-accent)",
                border: "1px solid var(--c-accent)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              <FolderGit2 size={12} />
              <span>{scope.owner}/{scope.name}</span>
              <X size={12} />
            </button>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={scope ? t("command_palette.search_in_scope", { scope: `${scope.owner}/${scope.name}` }) : t("command_palette.search_placeholder")}
            aria-label={t("command_palette.search_aria")}
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
          <span aria-hidden="true" style={{
            color: "var(--c-overlay)",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.04em",
            flex: "0 0 auto",
          }}>esc</span>
        </div>

        <div
          ref={listRef}
          role="listbox"
          aria-label={t("command_palette.results_aria")}
          onMouseMove={() => { mouseMovedRef.current = true; }}
          style={{ overflowY: "auto", flex: 1 }}
        >
          {visualOrder.length === 0 ? (
            <div style={{
              padding: "var(--space-7)",
              textAlign: "center",
              color: "var(--c-subtext)",
              fontSize: "var(--text-base)",
            }}>
              {t("command_palette.nothing_found")}
            </div>
          ) : (() => {
            let cursor = 0;
            return groups.map(([group, gItems]) => {
              const startIdx = cursor;
              cursor += gItems.length;
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
                      onHover={() => hover(startIdx + i)}
                      onClick={it.run}
                    />
                  ))}
                </CommandGroup>
              );
            });
          })()}
        </div>

        <div style={{
          padding: "var(--space-2) var(--space-5)",
          borderTop: "1px solid var(--c-line)",
          color: "var(--c-overlay)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-5)",
        }}>
          <div style={{
            display: "flex",
            gap: "var(--space-5)",
            flexWrap: "wrap",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.04em",
          }}>
            <span>{t("command_palette.footer_navigate")}</span>
            <span>{t("command_palette.footer_select")}</span>
            <span>{scope ? t("command_palette.footer_exit_scope") : t("command_palette.footer_close")}</span>
            <span>{t("command_palette.footer_prefix")}</span>
          </div>
          {query === "" && !scope && (
            <span style={{
              marginLeft: "auto",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12.5,
              color: "var(--c-subtext)",
            }}>{t("command_palette.hint_no_suggestions")}</span>
          )}
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
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--c-overlay)",
        textTransform: "uppercase",
        letterSpacing: "0.10em",
        background: "var(--c-mantle)",
      }}>
        <span>{label}</span>
        <span style={{ flex: 1, height: 1, background: "var(--c-line-soft)" }} />
      </div>
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
      onMouseEnter={onHover}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-5)",
        cursor: "pointer",
        background: active ? "var(--c-mantle)" : "transparent",
        boxShadow: active ? "inset 2px 0 0 0 var(--c-accent)" : "none",
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
        <span style={{
          color: "var(--c-overlay)",
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.02em",
          flex: "0 0 auto",
        }}>{hint}</span>
      )}
    </div>
  );
}

function prItem(p: PrSummary, openPr: (o: string, r: string, n: number) => void, onClose: () => void, t: TFn): Item {
  return {
    id: `pr:${p.id}`,
    kind: "pr",
    group: t("command_palette.group_prs"),
    label: `#${p.number} ${p.title}`,
    hint: `${p.owner}/${p.repo}`,
    icon: <GitPullRequest size={14} />,
    match: `${p.title} ${p.number} ${p.owner} ${p.repo} ${p.author}`,
    run: () => { openPr(p.owner, p.repo, p.number); onClose(); },
  };
}
