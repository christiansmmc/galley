import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { PrSummary } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";
import { PrListItem } from "./PrListItem";

type Tab = "mine" | "review_requested";

function groupByRepo(prs: PrSummary[]): Record<string, PrSummary[]> {
  const out: Record<string, PrSummary[]> = {};
  for (const p of prs) {
    const k = `${p.owner}/${p.repo}`;
    (out[k] ||= []).push(p);
  }
  return out;
}

export function PrListPanel() {
  const { mine, reviewRequested, loadingLists, refreshLists, openPr, currentPr } = usePrsStore();
  const [tab, setTab] = useState<Tab>("review_requested");

  useEffect(() => { refreshLists(); }, [refreshLists]);

  const list = tab === "mine" ? mine : reviewRequested;
  const groups = groupByRepo(list);
  const selectedNum = currentPr?.summary.number ?? null;

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid var(--c-surface0)" }}>
        {(["review_requested", "mine"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "8px 0", border: 0,
              background: tab === t ? "var(--c-base)" : "var(--c-mantle)",
              color: tab === t ? "var(--c-text)" : "var(--c-subtext)",
              cursor: "pointer", fontSize: 12, fontWeight: 500,
              borderBottom: tab === t ? "2px solid var(--c-accent)" : "2px solid transparent",
            }}
          >
            {t === "mine" ? "Meus" : "Pra revisar"}
          </button>
        ))}
        <button
          onClick={refreshLists}
          disabled={loadingLists}
          title="Refresh"
          style={{
            padding: "0 10px", border: 0, background: "var(--c-mantle)",
            color: "var(--c-subtext)", cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {Object.entries(groups).map(([repo, prs]) => (
        <div key={repo}>
          <div style={{
            padding: "6px 12px", fontSize: 11, fontWeight: 600,
            color: "var(--c-subtext)", background: "var(--c-mantle)",
            textTransform: "uppercase", letterSpacing: 0.4,
          }}>{repo}</div>
          {prs.map(p => (
            <PrListItem
              key={p.id}
              pr={p}
              selected={selectedNum === p.number && currentPr?.summary.owner === p.owner && currentPr?.summary.repo === p.repo}
              onClick={() => openPr(p.owner, p.repo, p.number)}
            />
          ))}
        </div>
      ))}

      {!loadingLists && list.length === 0 && (
        <div style={{ padding: 24, color: "var(--c-subtext)", fontSize: 12 }}>
          Nenhum PR. Adicione repos em Configurações.
        </div>
      )}
    </div>
  );
}
