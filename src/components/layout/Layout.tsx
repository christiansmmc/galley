import { Group, Panel, PanelImperativeHandle, Separator } from "react-resizable-panels";
import { useEffect, useRef } from "react";
import { useUiStore } from "../../state/uiStore";

interface Props {
  prList: React.ReactNode;
  diff: React.ReactNode;
}

export function Layout({ prList, diff }: Props) {
  const prListRef = useRef<PanelImperativeHandle>(null);
  const collapsed = useUiStore(s => s.prListCollapsed);
  const setCollapsed = useUiStore(s => s.setPrListCollapsed);

  useEffect(() => {
    const h = prListRef.current; if (!h) return;
    if (collapsed && !h.isCollapsed()) h.collapse();
    else if (!collapsed && h.isCollapsed()) h.expand();
  }, [collapsed]);

  return (
    <Group orientation="horizontal" style={{ height: "100%" }}>
      <Panel
        panelRef={prListRef}
        defaultSize={22}
        minSize={15}
        collapsible
        collapsedSize={0}
        onResize={size => {
          const isCollapsed = size.asPercentage <= 0.5;
          if (isCollapsed !== collapsed) setCollapsed(isCollapsed);
        }}
      >
        <div style={{ height: "100%", background: "var(--c-base)" }}>{prList}</div>
      </Panel>
      <Separator style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
      <Panel defaultSize={78} minSize={30}>
        <div style={{ height: "100%", background: "var(--c-base)" }}>{diff}</div>
      </Panel>
    </Group>
  );
}
