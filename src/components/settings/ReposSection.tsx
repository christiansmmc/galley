import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../../ipc/client";
import type { RepoConfig } from "../../ipc/types";
import { Button, Input } from "../ui";

export function ReposSection() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");

  const refresh = () => api.listRepos().then(setRepos);
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!owner.trim() || !name.trim()) return;
    await api.addRepo(owner.trim(), name.trim());
    setOwner(""); setName("");
    refresh();
  };

  return (
    <section style={{ marginBottom: "var(--space-7)" }}>
      <h4 style={{ margin: "0 0 var(--space-4)" }}>Repositórios</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        {repos.map(r => (
          <div
            key={`${r.owner}/${r.name}`}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)",
              padding: "var(--space-2) var(--space-4)",
              background: "var(--c-mantle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <code style={{ flex: 1, fontSize: "var(--text-base)" }}>{r.owner}/{r.name}</code>
            <Button
              variant="icon"
              size="sm"
              aria-label="Remover"
              onClick={async () => { await api.removeRepo(r.owner, r.name); refresh(); }}
              style={{ color: "var(--c-red)" }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" mono size="sm" />
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="repo" mono size="sm" />
        <Button variant="primary" size="sm" onClick={add}>+</Button>
      </div>
    </section>
  );
}
