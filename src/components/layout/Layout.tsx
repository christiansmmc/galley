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

  const listWidth = prListCollapsed ? RAIL_WIDTH : LIST_WIDTH;
  const treeWidth = fileTreeCollapsed ? RAIL_WIDTH : TREE_WIDTH;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div
        style={{
          width: listWidth,
          flexShrink: 0,
          height: "100%",
          background: "var(--c-base)",
          borderRight: "1px solid var(--c-line)",
          overflow: "hidden",
          transition: "width 220ms ease",
        }}
      >
        {prListCollapsed ? (
          <PrListRail onExpand={() => setPrListCollapsed(false)} />
        ) : (
          prList
        )}
      </div>
      <div
        style={{
          width: treeWidth,
          flexShrink: 0,
          height: "100%",
          background: "var(--c-base)",
          borderRight: "1px solid var(--c-line)",
          overflow: "hidden",
          transition: "width 220ms ease",
        }}
      >
        {fileTreeCollapsed ? (
          <FileTreeRail onExpand={() => setFileTreeCollapsed(false)} />
        ) : (
          fileTree
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, height: "100%", background: "var(--c-base)" }}>{diff}</div>
    </div>
  );
}
