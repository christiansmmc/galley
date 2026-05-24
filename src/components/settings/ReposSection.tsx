import { useEffect, useState } from "react";
import { Trash2, Search } from "lucide-react";
import { api } from "../../ipc/client";
import type { RepoConfig } from "../../ipc/types";
import { Button, EmptyState, Input } from "../ui";
import { BrowseReposModal } from "./BrowseReposModal";
import { useT } from "../../i18n";

type TFn = ReturnType<typeof useT>;

export function ReposSection({ onReposChanged }: { onReposChanged?: () => void } = {}) {
  const t = useT();
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
        onReposChanged?.();
      }
      setPaste("");
    } catch (e) {
      setErr(translate(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h3 className="settings-section-title">{t("settings.repos.title")}</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        {repos.length === 0 && (
          <EmptyState
            title={t("settings.repos.empty_title")}
            description={t("settings.repos.empty_desc")}
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
              aria-label={t("settings.repos.remove_aria")}
              onClick={async () => { await api.removeRepo(r.owner, r.name); await refresh(); onReposChanged?.(); }}
              style={{ color: "var(--c-danger)" }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>

      <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
        {t("settings.repos.add_label")}
      </label>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Input
          value={paste}
          onChange={e => { setPaste(e.target.value); setErr(null); }}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder={t("settings.repos.add_placeholder")}
          mono
          size="sm"
          invalid={Boolean(err)}
          aria-label={t("settings.repos.add_aria")}
        />
        <Button variant="subtle" size="sm" onClick={submit} disabled={busy || !paste.trim()}>
          {busy ? t("settings.repos.add_validating") : t("settings.repos.add_button")}
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
          {t("settings.repos.browse")}
        </Button>
      </div>

      <BrowseReposModal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        configured={repos}
        onSaved={async (next) => { await api.setRepos(next); await refresh(); onReposChanged?.(); }}
      />
    </section>
  );
}

function translate(e: unknown, t: TFn): string {
  const kind = (e as { kind?: string } | null)?.kind;
  const details = (e as { details?: string } | null)?.details ?? "";
  if (kind === "NotFound") return t("settings.repos.error_not_accessible");
  if (kind === "Auth") return t("settings.repos.error_no_token");
  if (kind === "Config" && details.includes("Formato inválido")) {
    return t("settings.repos.error_invalid_format");
  }
  const s = `${kind ?? ""} ${details}`.trim() || String(e);
  if (s.includes("Formato inválido")) return t("settings.repos.error_invalid_format");
  if (s.toLowerCase().includes("not found") || s.includes("404") || s.includes("403")) {
    return t("settings.repos.error_not_accessible");
  }
  return details || s;
}
