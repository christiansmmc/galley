import { useEffect, useState } from "react";
import { api } from "../../ipc/client";
import type { PathFilter, RepoConfig } from "../../ipc/types";
import { Trash2 } from "lucide-react";

export function FiltersSection() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [filters, setFilters] = useState<PathFilter[]>([]);

  useEffect(() => { api.listRepos().then(r => { setRepos(r); if (r[0]) setSelectedRepo(`${r[0].owner}/${r[0].name}`); }); }, []);
  useEffect(() => {
    if (!selectedRepo) return;
    api.getPathFilters(selectedRepo).then(setFilters);
  }, [selectedRepo]);

  const save = async (next: PathFilter[]) => {
    setFilters(next);
    await api.setPathFilters(selectedRepo, next);
  };

  const add = () => save([...filters, { repo: selectedRepo, pattern: "**/*.lock", label: "Novo filtro", default_hidden: true }]);
  const remove = (i: number) => save(filters.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<PathFilter>) => save(filters.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  return (
    <section style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>Filtros de path</h4>
      <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)} style={{ marginBottom: 8, padding: 6, background: "var(--c-base)", color: "var(--c-text)", border: "1px solid var(--c-surface1)", borderRadius: 4 }}>
        {repos.map(r => <option key={`${r.owner}/${r.name}`} value={`${r.owner}/${r.name}`}>{r.owner}/{r.name}</option>)}
      </select>
      {filters.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <input value={f.pattern} onChange={e => update(i, { pattern: e.target.value })} placeholder="glob" style={inp()} />
          <input value={f.label} onChange={e => update(i, { label: e.target.value })} placeholder="rótulo" style={inp()} />
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--c-subtext)" }}>
            <input type="checkbox" checked={f.default_hidden} onChange={e => update(i, { default_hidden: e.target.checked })} />
            esconder
          </label>
          <button onClick={() => remove(i)} style={{ border: 0, background: "transparent", color: "var(--c-red)", cursor: "pointer" }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={add} disabled={!selectedRepo} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--c-surface1)", background: "transparent", color: "var(--c-text)", cursor: "pointer", fontSize: 12 }}>
        + Filtro
      </button>
    </section>
  );
}

function inp(): React.CSSProperties {
  return { flex: 1, padding: "6px 8px", borderRadius: 4, border: "1px solid var(--c-surface1)", background: "var(--c-base)", color: "var(--c-text)", fontFamily: "var(--font-mono)", fontSize: 12 };
}
