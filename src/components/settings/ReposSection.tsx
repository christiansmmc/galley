import { useEffect, useState } from "react";
import { api } from "../../ipc/client";
import type { RepoConfig } from "../../ipc/types";
import { Trash2 } from "lucide-react";

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
    <section style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>Repositórios</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {repos.map(r => (
          <div key={`${r.owner}/${r.name}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "var(--c-mantle)", borderRadius: 4 }}>
            <code style={{ flex: 1, fontSize: 12 }}>{r.owner}/{r.name}</code>
            <button onClick={async () => { await api.removeRepo(r.owner, r.name); refresh(); }} style={{ border: 0, background: "transparent", color: "var(--c-red)", cursor: "pointer" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" style={input()} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="repo" style={input()} />
        <button onClick={add} style={addBtn()}>+</button>
      </div>
    </section>
  );
}

function input(): React.CSSProperties {
  return { flex: 1, padding: "6px 8px", borderRadius: 4, border: "1px solid var(--c-surface1)", background: "var(--c-base)", color: "var(--c-text)", fontFamily: "var(--font-mono)", fontSize: 12 };
}
function addBtn(): React.CSSProperties {
  return { padding: "6px 12px", borderRadius: 4, border: 0, background: "var(--c-accent)", color: "white", cursor: "pointer" };
}
