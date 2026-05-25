import { useEffect, useRef, useState } from "react";
import { api } from "../../ipc/client";
import type { RepoConfig } from "../../ipc/types";
import { Button, EmptyState, Input } from "../ui";
import { BrowseReposModal } from "./BrowseReposModal";
import { useT } from "../../i18n";

type TFn = ReturnType<typeof useT>;

const key = (r: { owner: string; name: string }) => `${r.owner}/${r.name}`;

// Session cache for per-repo PR counts. The Settings modal unmounts each
// section on tab switch, so without this every return to the Repos tab would
// refetch and quickly trip GitHub's Search rate limit. Cache is keyed by
// "owner/name", survives remounts, and only repopulates on app reload. A
// single in-flight promise dedupes concurrent fetches across remounts.
const countsCache: Record<string, number> = {};
let countsInFlight: Promise<void> | null = null;

/** Fetch counts for any repos missing from the cache (once). */
async function ensureCounts(list: RepoConfig[]): Promise<void> {
  const missing = list.filter(r => countsCache[key(r)] === undefined);
  if (missing.length === 0) return;
  if (!countsInFlight) {
    countsInFlight = api.repoPrCounts(missing)
      .then(rows => { for (const c of rows) countsCache[key(c)] = c.count; })
      .catch(() => { /* leave missing; a later open may retry */ })
      .finally(() => { countsInFlight = null; });
  }
  await countsInFlight;
}

export function ReposSection({ onReposChanged }: { onReposChanged?: () => void } = {}) {
  const t = useT();
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ ...countsCache });
  const [countsLoading, setCountsLoading] = useState(false);
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = async () => {
    const list = await api.listRepos();
    if (!alive.current) return;
    setRepos(list);
    setCounts({ ...countsCache });
    // Only fetch counts not already cached (first open = all, remount = none,
    // after add = just the new repo). Blank/skeleton until they resolve.
    if (list.some(r => countsCache[key(r)] === undefined)) {
      setCountsLoading(true);
      void ensureCounts(list).finally(() => {
        if (!alive.current) return;
        setCounts({ ...countsCache });
        setCountsLoading(false);
      });
    }
  };
  useEffect(() => { void refresh(); }, []);

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

  const remove = async (r: RepoConfig) => {
    await api.removeRepo(r.owner, r.name);
    await refresh();
    onReposChanged?.();
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <h3 className="settings-section-title">{t("settings.repos.title")}</h3>
      <p className="settings-section-hint">{t("settings.repos.hint")}</p>

      <div className="cfg-scroll" style={{ flex: 1, minHeight: 0, paddingRight: "var(--space-2)", marginBottom: "var(--space-5)" }}>
        {repos.length === 0 ? (
          <EmptyState
            title={t("settings.repos.empty_title")}
            description={t("settings.repos.empty_desc")}
          />
        ) : (
          <div className="cfg-list">
            {repos.map(r => {
              const count = counts[key(r)];
              return (
                <div key={key(r)} className="cfg-row">
                  <div className="cfg-name">
                    <b>{r.owner}/{r.name}</b>
                    {count !== undefined
                      ? <em>{t("settings.repos.prs_per_year", { count })}</em>
                      : countsLoading
                        ? <span className="cfg-skel" aria-hidden="true" />
                        : null}
                  </div>
                  <button
                    type="button"
                    className="cfg-act danger"
                    aria-label={t("settings.repos.remove_aria")}
                    onClick={() => remove(r)}
                  >
                    {t("settings.repos.remove")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ flex: "0 0 auto" }}>
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
        <div style={{ marginTop: "var(--space-4)" }}>
          <button type="button" className="cfg-act" onClick={() => setBrowseOpen(true)}>
            {t("settings.repos.browse")}
          </button>
        </div>
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
