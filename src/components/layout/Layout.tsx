import { Group, Panel, PanelImperativeHandle, Separator } from "react-resizable-panels";
import { useEffect, useRef } from "react";
import { useUiStore } from "../../state/uiStore";
import { usePrsStore } from "../../state/prsStore";
import { PrListRail } from "./PrListRail";

interface Props {
  prList: React.ReactNode;
  fileTree: React.ReactNode;
  diff: React.ReactNode;
}

const RAIL_WIDTH = 28;
const LIST_WIDTH = 300;

export function Layout({ prList, fileTree, diff }: Props) {
  const fileTreeRef = useRef<PanelImperativeHandle>(null);
  const prListCollapsed = useUiStore(s => s.prListCollapsed);
  const fileTreeCollapsed = useUiStore(s => s.fileTreeCollapsed);
  const setPrListCollapsed = useUiStore(s => s.setPrListCollapsed);
  const setFileTreeCollapsed = useUiStore(s => s.setFileTreeCollapsed);
  const currentPr = usePrsStore(s => s.currentPr);

  useEffect(() => {
    const h = fileTreeRef.current; if (!h) return;
    if (fileTreeCollapsed && !h.isCollapsed()) h.collapse();
    else if (!fileTreeCollapsed && h.isCollapsed()) h.expand();
  }, [fileTreeCollapsed]);

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
      <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
        <Group orientation="horizontal" style={{ height: "100%" }}>
          <Panel
            panelRef={fileTreeRef}
            defaultSize={28}
            minSize={12}
            collapsible
            collapsedSize={0}
            onResize={size => {
              const isCollapsed = size.asPercentage <= 0.5;
              if (isCollapsed !== fileTreeCollapsed) setFileTreeCollapsed(isCollapsed);
            }}
          >
            <div style={{ height: "100%", background: "var(--c-base)" }}>{fileTree}</div>
          </Panel>
          <Separator style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
          <Panel defaultSize={72} minSize={30}>
            <div style={{ height: "100%", background: "var(--c-base)" }}>{diff}</div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
