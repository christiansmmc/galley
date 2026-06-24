import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import type { PrSummary } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";
import { useUiStore } from "../../state/uiStore";
import { PrListItem } from "./PrListItem";
import { Button, EmptyState, Input, SkeletonBars, Spinner, Sweep, Tabs } from "../ui";
import { useSettingsStore } from "../../state/settingsStore";
import { useT } from "../../i18n";

type Tab = "mine" | "review_requested";

/** Group PRs by `owner/repo` while preserving insertion order. */
function groupByRepo(prs: PrSummary[]): Array<[string, PrSummary[]]> {
  const map = new Map<string, PrSummary[]>();
  for (const p of prs) {
    const k = `${p.owner}/${p.repo}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  return Array.from(map.entries());
}

function matchesQuery(pr: PrSummary, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    pr.title.toLowerCase().includes(needle) ||
    pr.author.toLowerCase().includes(needle) ||
    String(pr.number).includes(needle)
  );
}

export function PrListPanel() {
  const t = useT();
  const { mine, reviewRequested, loadingLists, refreshLists, openPr, currentPr } = usePrsStore();
  const pendingPr = usePrsStore(s => s.pendingPr);
  const setPrListCollapsed = useUiStore(s => s.setPrListCollapsed);
  const repos = useSettingsStore(s => s.settings?.repos) ?? [];
  const [tab, setTab] = useState<Tab>("review_requested");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshLists(); }, [refreshLists]);

  // Ctrl+P focuses search (Cmd+P on mac kept for parity with browser DevTools muscle memory).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredMine = useMemo(() => mine.filter(p => matchesQuery(p, query)), [mine, query]);
  const filteredRr = useMemo(() => reviewRequested.filter(p => matchesQuery(p, query)), [reviewRequested, query]);

  const list = tab === "mine" ? filteredMine : filteredRr;
  const groups = groupByRepo(list);
  const selectedNum = currentPr?.summary.number ?? null;

  const hasRepos = repos.length > 0;
  const totalAll = mine.length + reviewRequested.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px 8px",
        background: "var(--c-mantle)",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--c-overlay)",
        }}>
          {t("pr_list.label")}
        </span>
        {currentPr && (
          <button
            type="button"
            onClick={() => setPrListCollapsed(true)}
            title={t("pr_list.collapse")}
            aria-label={t("pr_list.collapse_aria")}
            style={{
              background: "transparent", border: 0,
              color: "var(--c-overlay)", cursor: "pointer",
              padding: 0, lineHeight: 1,
              fontFamily: "var(--font-mono)", fontSize: 14,
            }}
          >
            ⟨
          </button>
        )}
      </div>
      <div style={{
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "1px solid var(--c-surface0)",
        background: "var(--c-mantle)",
        position: "relative",
      }}>
        <span style={{
          position: "absolute",
          left: "calc(var(--space-5) + var(--space-3))",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--c-overlay)",
          display: "inline-flex",
          pointerEvents: "none",
        }}>
          <Search size={14} />
        </span>
        <Input
          ref={searchRef}
          size="sm"
          mono
          placeholder={t("pr_list.search_placeholder")}
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label={t("pr_list.search_aria")}
          style={{ paddingLeft: "var(--space-9)", fontSize: 12 }}
        />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "review_requested", label: t("pr_list.tab_review_requested", { count: filteredRr.length }) },
          { id: "mine", label: t("pr_list.tab_mine", { count: filteredMine.length }) },
        ]}
        trailing={
          <Button
            variant="icon"
            size="md"
            onClick={() => refreshLists(true)}
            disabled={loadingLists}
            title={t("pr_list.refresh")}
            aria-label={t("pr_list.refresh")}
          >
            {loadingLists ? <Spinner size={14} /> : <RefreshCw size={14} />}
          </Button>
        }
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative" }}>
        {loadingLists && <Sweep />}
        {loadingLists && list.length === 0 ? (
          <SkeletonBars rows={8} />
        ) : list.length === 0 ? (
          renderEmpty({ hasRepos, query, totalAll, t })
        ) : (
          groups.map(([repo, prs]) => {
            const [owner, name] = repo.split("/");
            return (
              <div key={repo}>
                <div
                  title={repo}
                  aria-label={repo}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 14px 4px",
                    cursor: "default",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 400,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--c-overlay)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name ?? owner}
                  </span>
                  <span style={{ flex: 1, height: 1, background: "var(--c-line-soft)" }} />
                </div>
                {prs.map(p => {
                  const loading =
                    pendingPr?.owner === p.owner &&
                    pendingPr?.repo === p.repo &&
                    pendingPr?.number === p.number;
                  return (
                    <PrListItem
                      key={p.id}
                      pr={p}
                      selected={
                        selectedNum === p.number &&
                        currentPr?.summary.owner === p.owner &&
                        currentPr?.summary.repo === p.repo
                      }
                      loading={loading}
                      onClick={() => openPr(p.owner, p.repo, p.number)}
                    />
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type TFn = ReturnType<typeof useT>;

function renderEmpty({ hasRepos, query, totalAll, t }: { hasRepos: boolean; query: string; totalAll: number; t: TFn }) {
  if (!hasRepos) {
    return (
      <EmptyState
        title={t("pr_list.empty_no_repos_title")}
        description={t("pr_list.empty_no_repos_desc")}
      />
    );
  }
  if (query) {
    return (
      <EmptyState
        title={t("pr_list.empty_search_title")}
        description={t("pr_list.empty_search_desc", { query })}
      />
    );
  }
  if (totalAll === 0) {
    return (
      <EmptyState
        title={t("pr_list.empty_inbox_title")}
        description={t("pr_list.empty_inbox_desc")}
      />
    );
  }
  return (
    <EmptyState
      title={t("pr_list.empty_tab_title")}
      description={t("pr_list.empty_tab_desc")}
    />
  );
}
