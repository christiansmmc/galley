import { Group, Panel, Separator } from "react-resizable-panels";
import { useUiStore } from "../../state/uiStore";
import { usePrsStore } from "../../state/prsStore";
import { PrListRail } from "./PrListRail";
import { FileTreeRail } from "../files/FileTreeRail";

interface Props {
  prList: React.ReactNode;
  fileTree: React.ReactNode;
  diff: React.ReactNode;
}

const RAIL_WIDTH = 28;
const LIST_WIDTH = 300;
const TREE_WIDTH = 280;

/**
 * One collapsible side column. Both the expanded panel and the narrow rail
 * stay mounted; only their visibility flips.
 *
 * Rendering `collapsed ? rail : panel` instead would unmount the panel on
 * every collapse — and these panels do work on mount (PrListPanel kicks off a
 * list load, FileTreePanel re-reads its path filters), so a collapse/expand
 * round trip paid for it every time. `display: contents` on the visible
 * wrapper means it generates no box at all, so the child is laid out exactly
 * as if it were a direct child of the column — the width transition and the
 * rail/panel look are unchanged.
 */
function SideColumn({ width, collapsed, rail, panel }: {
  width: number;
  collapsed: boolean;
  rail: React.ReactNode;
  panel: React.ReactNode;
}) {
  return (
    <div
      style={{
        width,
        flexShrink: 0,
        height: "100%",
        background: "var(--c-base)",
        borderRight: "1px solid var(--c-line)",
        overflow: "hidden",
        transition: "width 220ms ease",
      }}
    >
      <div style={{ display: collapsed ? "contents" : "none" }}>{rail}</div>
      <div style={{ display: collapsed ? "none" : "contents" }}>{panel}</div>
    </div>
  );
}

export function Layout({ prList, fileTree, diff }: Props) {
  const prListCollapsed = useUiStore(s => s.prListCollapsed);
  const fileTreeCollapsed = useUiStore(s => s.fileTreeCollapsed);
  const setPrListCollapsed = useUiStore(s => s.setPrListCollapsed);
  const setFileTreeCollapsed = useUiStore(s => s.setFileTreeCollapsed);
  const currentPr = usePrsStore(s => s.currentPr);

  if (!currentPr) {
    return (
      <Group orientation="horizontal" style={{ height: "100%" }}>
        <Panel defaultSize={22} minSize={15}>
          <div style={{ height: "100%", background: "var(--c-base)" }}>{prList}</div>
        </Panel>
        <Separator style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
        <Panel defaultSize={78} minSize={30}>
          <div style={{ height: "100%", background: "var(--c-base)" }}>{diff}</div>
        </Panel>
      </Group>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <SideColumn
        width={prListCollapsed ? RAIL_WIDTH : LIST_WIDTH}
        collapsed={prListCollapsed}
        rail={<PrListRail onExpand={() => setPrListCollapsed(false)} />}
        panel={prList}
      />
      <SideColumn
        width={fileTreeCollapsed ? RAIL_WIDTH : TREE_WIDTH}
        collapsed={fileTreeCollapsed}
        rail={<FileTreeRail onExpand={() => setFileTreeCollapsed(false)} />}
        panel={fileTree}
      />
      <div style={{ flex: 1, minWidth: 0, height: "100%", background: "var(--c-base)" }}>{diff}</div>
    </div>
  );
}
