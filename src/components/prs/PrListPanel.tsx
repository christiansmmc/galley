import { useEffect, useState } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import type { PrSummary } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";
import { PrListItem } from "./PrListItem";
import { Button, EmptyState, Spinner, Tabs } from "../ui";

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
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "review_requested", label: "Pra revisar" },
          { id: "mine", label: "Meus" },
        ]}
        trailing={
          <Button
            variant="icon"
            size="md"
            onClick={refreshLists}
            disabled={loadingLists}
            title="Atualizar"
            aria-label="Atualizar"
          >
            {loadingLists ? <Spinner size={14} /> : <RefreshCw size={14} />}
          </Button>
        }
      />

      {Object.entries(groups).map(([repo, prs]) => (
        <div key={repo}>
          <div style={{
            padding: "var(--space-3) var(--space-6)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-semibold)" as unknown as number,
            color: "var(--c-subtext)",
            background: "var(--c-mantle)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
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
        <EmptyState
          icon={<Inbox size={20} />}
          title="Nenhum PR"
          description="Adicione repositórios em Configurações para começar."
          compact
        />
      )}
    </div>
  );
}
