import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { FileTreePanel } from "./FileTreePanel";
import { useUiStore } from "../../state/uiStore";
import { usePrsStore } from "../../state/prsStore";
import { Button } from "../ui";

const DRAWER_WIDTH = 320;

export function FileTreeDrawer() {
  const open = useUiStore(s => s.fileTreeOpen);
  const setOpen = useUiStore(s => s.setFileTreeOpen);
  const selectedFile = usePrsStore(s => s.selectedFile);
  const drawerRef = useRef<HTMLDivElement>(null);
  const initialFileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    initialFileRef.current = selectedFile;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    if (selectedFile !== initialFileRef.current) setOpen(false);
  }, [selectedFile, open, setOpen]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: "var(--z-modal)" as unknown as number,
      }}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-label="Arquivos do PR"
        style={{
          position: "absolute",
          top: 0, bottom: 0, left: 0,
          width: DRAWER_WIDTH,
          background: "var(--c-base)",
          borderRight: "1px solid var(--c-surface0)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          animation: "prr-drawer-in var(--transition-base)",
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-5)",
          borderBottom: "1px solid var(--c-surface0)",
          background: "var(--c-mantle)",
        }}>
          <span style={{
            fontWeight: "var(--weight-semibold)" as unknown as number,
            fontSize: "var(--text-md)",
          }}>
            Arquivos
          </span>
          <Button
            variant="icon"
            size="sm"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            <X size={14} />
          </Button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <FileTreePanel />
        </div>
      </aside>
    </div>
  );
}
