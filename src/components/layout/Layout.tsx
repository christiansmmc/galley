import { Group, Panel, PanelImperativeHandle, Separator } from "react-resizable-panels";
import { useEffect, useRef } from "react";
import { useUiStore } from "../../state/uiStore";
import { usePrsStore } from "../../state/prsStore";

interface Props {
  prList: React.ReactNode;
  fileTree: React.ReactNode;
  diff: React.ReactNode;
}

export function Layout({ prList, fileTree, diff }: Props) {
  const prListRef = useRef<PanelImperativeHandle>(null);
  const fileTreeRef = useRef<PanelImperativeHandle>(null);
  const prListCollapsed = useUiStore(s => s.prListCollapsed);
  const fileTreeCollapsed = useUiStore(s => s.fileTreeCollapsed);
  const setPrListCollapsed = useUiStore(s => s.setPrListCollapsed);
  const setFileTreeCollapsed = useUiStore(s => s.setFileTreeCollapsed);
  const currentPr = usePrsStore(s => s.currentPr);

  useEffect(() => {
    const h = prListRef.current; if (!h) return;
    if (prListCollapsed && !h.isCollapsed()) h.collapse();
    else if (!prListCollapsed && h.isCollapsed()) h.expand();
  }, [prListCollapsed]);

  useEffect(() => {
    const h = fileTreeRef.current; if (!h) return;
    if (fileTreeCollapsed && !h.isCollapsed()) h.collapse();
    else if (!fileTreeCollapsed && h.isCollapsed()) h.expand();
  }, [fileTreeCollapsed]);

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
          if (isCollapsed !== prListCollapsed) setPrListCollapsed(isCollapsed);
        }}
      >
        <div style={{ height: "100%", background: "var(--c-base)" }}>{prList}</div>
      </Panel>
      <Separator style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
      <Panel
        panelRef={fileTreeRef}
        defaultSize={currentPr ? 20 : 0}
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
      <Panel defaultSize={58} minSize={30}>
        <div style={{ height: "100%", background: "var(--c-base)" }}>{diff}</div>
      </Panel>
    </Group>
  );
}
