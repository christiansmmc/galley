import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, GitFork, Archive } from "lucide-react";
import { api } from "../../ipc/client";
import type { RemoteRepo, RepoBrowseFilters, RepoConfig } from "../../ipc/types";
import { Button, Input, Modal, Spinner } from "../ui";

interface Props {
  open: boolean;
  onClose: () => void;
  configured: RepoConfig[];
  onSaved: (repos: RepoConfig[]) => Promise<void> | void;
}

interface FilterPill { key: keyof RepoBrowseFilters; label: string; icon: React.ReactNode; }

const PILLS: FilterPill[] = [
  { key: "include_orgs", label: "Org", icon: null },
  { key: "include_forks", label: "Forks", icon: <GitFork size={12} /> },
  { key: "include_archived", label: "Arquivados", icon: <Archive size={12} /> },
];

const DEFAULT_FILTERS: RepoBrowseFilters = {
  include_orgs: true,
  include_forks: false,
  include_archived: false,
};

export function BrowseReposModal({ open, onClose, configured, onSaved }: Props) {
  const [filters, setFilters] = useState<RepoBrowseFilters>(DEFAULT_FILTERS);
  const [remote, setRemote] = useState<RemoteRepo[]>([]);
  const [page, setPage] = useState(1);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const configuredKeys = useMemo(
    () => new Set(configured.map(r => `${r.owner}/${r.name}`)),
    [configured],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(configuredKeys));
    setRemote([]);
    setPage(1);
    setExhausted(false);
    setError(null);
  }, [open, configuredKeys]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api.listMyRepos(page, filters)
      .then(rows => {
        if (cancelled) return;
        setRemote(prev => page === 1 ? rows : dedupe([...prev, ...rows]));
        if (rows.length < 100) setExhausted(true);
      })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, page, filters]);

  // Reset paginação ao trocar filtros.
  const setFilter = (k: keyof RepoBrowseFilters, v: boolean) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
    setRemote([]);
    setExhausted(false);
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || loading || exhausted) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setPage(p => p + 1);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return remote;
    return remote.filter(r => r.full_name.toLowerCase().includes(q));
  }, [remote, search]);

  const toggle = (full: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(full)) next.delete(full); else next.add(full);
      return next;
    });
  };

  const save = async () => {
    const next: RepoConfig[] = [...selected].map(full => {
      const [owner, name] = full.split("/");
      return { owner, name };
    });
    await onSaved(next);
    onClose();
  };

  return (
    <Modal
      title="Procurar repositórios"
      open={open}
      onClose={onClose}
      maxWidth={720}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>Salvar ({selected.size})</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", minHeight: 360 }}>
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          size="sm"
          aria-label="Buscar repos"
        />

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {PILLS.map(p => {
            const active = filters[p.key];
            return (
              <button
                key={p.key}
                onClick={() => setFilter(p.key, !active)}
                aria-pressed={active}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-pill)",
                  border: `1px solid ${active ? "var(--c-accent)" : "var(--c-surface1)"}`,
                  background: active ? "var(--c-accent)" : "transparent",
                  color: active ? "white" : "var(--c-subtext)",
                  fontSize: "var(--text-sm)",
                  cursor: "pointer",
                }}
              >
                {p.icon}
                {p.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div role="alert" style={{ color: "var(--c-red)", fontSize: "var(--text-sm)" }}>{error}</div>
        )}

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          style={{
            flex: 1, minHeight: 280, maxHeight: 420, overflowY: "auto",
            border: "1px solid var(--c-surface1)", borderRadius: "var(--radius-md)",
            background: "var(--c-mantle)",
          }}
        >
          {visible.length === 0 && !loading && (
            <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--c-subtext)", fontSize: "var(--text-sm)" }}>
              Nenhum repo encontrado.
            </div>
          )}
          {visible.map(r => {
            const isSelected = selected.has(r.full_name);
            return (
              <label
                key={r.full_name}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  borderBottom: "1px solid var(--c-surface0)",
                  cursor: "pointer",
                  background: isSelected ? "var(--c-surface0)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(r.full_name)}
                  aria-label={r.full_name}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-md)" }}>
                    <code>{r.full_name}</code>
                    {r.private && <Lock size={10} style={{ color: "var(--c-subtext)" }} />}
                    {r.fork && <GitFork size={10} style={{ color: "var(--c-subtext)" }} />}
                    {r.archived && <Archive size={10} style={{ color: "var(--c-amber)" }} />}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--c-subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.description}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--c-subtext)" }}>★ {r.stargazers_count}</span>
              </label>
            );
          })}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5)" }}>
              <Spinner />
            </div>
          )}
          {exhausted && visible.length > 0 && (
            <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--c-subtext)" }}>
              Fim da lista.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function dedupe(rows: RemoteRepo[]): RemoteRepo[] {
  const seen = new Set<string>();
  const out: RemoteRepo[] = [];
  for (const r of rows) {
    if (seen.has(r.full_name)) continue;
    seen.add(r.full_name);
    out.push(r);
  }
  return out;
}
