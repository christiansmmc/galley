import { Group, Panel, PanelImperativeHandle, Separator } from "react-resizable-panels";
import { useRef } from "react";
import { PanelHeader } from "./PanelHeader";
import { useShortcuts } from "./shortcuts";

interface Props {
  prList: React.ReactNode;
  fileTree: React.ReactNode;
  diff: React.ReactNode;
}

export function Layout({ prList, fileTree, diff }: Props) {
  const prListRef = useRef<PanelImperativeHandle>(null);
  const fileTreeRef = useRef<PanelImperativeHandle>(null);

  const togglePrList = () => {
    const h = prListRef.current; if (!h) return;
    h.isCollapsed() ? h.expand() : h.collapse();
  };
  const toggleFileTree = () => {
    const h = fileTreeRef.current; if (!h) return;
    h.isCollapsed() ? h.expand() : h.collapse();
  };

  useShortcuts({ togglePrList, toggleFileTree });

  return (
    <Group orientation="horizontal" style={{ height: "100%" }}>
      <Panel panelRef={prListRef} defaultSize={22} minSize={15} collapsible collapsedSize={0}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--c-base)" }}>
          <PanelHeader title="Pull Requests" onCollapse={togglePrList} side="left" />
          <div style={{ flex: 1, overflow: "auto" }}>{prList}</div>
        </div>
      </Panel>
      <Separator style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
      <Panel panelRef={fileTreeRef} defaultSize={20} minSize={12} collapsible collapsedSize={0}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--c-base)" }}>
          <PanelHeader title="Files" onCollapse={toggleFileTree} side="left" />
          <div style={{ flex: 1, overflow: "auto" }}>{fileTree}</div>
        </div>
      </Panel>
      <Separator style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
      <Panel defaultSize={58} minSize={30}>
        <div style={{ height: "100%", background: "var(--c-base)" }}>{diff}</div>
      </Panel>
    </Group>
  );
}
