import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../../ipc/client";
import type { PathFilter, RepoConfig } from "../../ipc/types";
import { Button, Dropdown, Input } from "../ui";

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
    <section style={{ marginBottom: "var(--space-7)" }}>
      <h3 className="settings-section-title">Filtros de path</h3>
      <Dropdown
        value={selectedRepo}
        onChange={e => setSelectedRepo(e.target.value)}
        size="sm"
        style={{ marginBottom: "var(--space-4)" }}
      >
        {repos.map(r => <option key={`${r.owner}/${r.name}`} value={`${r.owner}/${r.name}`}>{r.owner}/{r.name}</option>)}
      </Dropdown>
      {filters.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-2)", alignItems: "center" }}>
          <Input value={f.pattern} onChange={e => update(i, { pattern: e.target.value })} placeholder="glob" mono size="sm" />
          <Input value={f.label} onChange={e => update(i, { label: e.target.value })} placeholder="rótulo" size="sm" />
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-base)", color: "var(--c-subtext)" }}>
            <input type="checkbox" checked={f.default_hidden} onChange={e => update(i, { default_hidden: e.target.checked })} />
            esconder
          </label>
          <Button
            variant="icon"
            size="sm"
            aria-label="Remover"
            onClick={() => remove(i)}
            style={{ color: "var(--c-danger)" }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={add} disabled={!selectedRepo}>
        + Filtro
      </Button>
    </section>
  );
}
