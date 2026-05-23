import { useEffect, useState } from "react";
import { Trash2, Search, FolderGit2 } from "lucide-react";
import { api } from "../../ipc/client";
import type { RepoConfig } from "../../ipc/types";
import { Button, EmptyState, Input } from "../ui";
import { BrowseReposModal } from "./BrowseReposModal";

export function ReposSection() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);

  const refresh = () => api.listRepos().then(setRepos);
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!paste.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.validateRepo(paste.trim());
      if (!repos.some(x => x.owner === r.owner && x.name === r.name)) {
        await api.addRepo(r.owner, r.name);
        await refresh();
      }
      setPaste("");
    } catch (e) {
      setErr(translate(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4 style={{ margin: "0 0 var(--space-4)" }}>Repositórios</h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        {repos.length === 0 && (
          <EmptyState
            icon={<FolderGit2 size={20} />}
            title="Nenhum repositório"
            description="Cole uma URL abaixo ou abra a busca para escolher entre os seus."
            compact
          />
        )}
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
              style={{ color: "var(--c-danger)" }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>

      <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
        Adicionar por URL ou <code>owner/repo</code>
      </label>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Input
          value={paste}
          onChange={e => { setPaste(e.target.value); setErr(null); }}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder="https://github.com/owner/repo  •  owner/repo"
          mono
          size="sm"
          invalid={Boolean(err)}
          aria-label="Adicionar repositório"
        />
        <Button variant="subtle" size="sm" onClick={submit} disabled={busy || !paste.trim()}>
          {busy ? "Validando…" : "Adicionar"}
        </Button>
      </div>
      {err && (
        <div role="alert" style={{ color: "var(--c-danger)", marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: "var(--space-5)" }}>
        <Button variant="ghost" size="sm" onClick={() => setBrowseOpen(true)}>
          <Search size={12} style={{ marginRight: "var(--space-2)" }} />
          Procurar meus repos no GitHub
        </Button>
      </div>

      <BrowseReposModal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        configured={repos}
        onSaved={async (next) => { await api.setRepos(next); await refresh(); }}
      />
    </section>
  );
}

function translate(e: unknown): string {
  const kind = (e as { kind?: string } | null)?.kind;
  const details = (e as { details?: string } | null)?.details ?? "";
  if (kind === "NotFound") return "Repo não acessível com seu PAT.";
  if (kind === "Auth") return "Token não configurado.";
  if (kind === "Config" && details.includes("Formato inválido")) {
    return "Formato inválido. Use https://github.com/owner/repo ou owner/repo.";
  }
  const s = `${kind ?? ""} ${details}`.trim() || String(e);
  if (s.includes("Formato inválido")) return "Formato inválido. Use https://github.com/owner/repo ou owner/repo.";
  if (s.toLowerCase().includes("not found") || s.includes("404") || s.includes("403")) {
    return "Repo não acessível com seu PAT.";
  }
  return details || s;
}
