import { ChevronRight } from "lucide-react";
import { usePrsStore } from "../../state/prsStore";
import { useT } from "../../i18n";

interface Props { onExpand: () => void; }

export function FileTreeRail({ onExpand }: Props) {
  const t = useT();
  const diff = usePrsStore(s => s.diff);
  const selectedFile = usePrsStore(s => s.selectedFile);
  const selectFile = usePrsStore(s => s.selectFile);
  const viewedFiles = usePrsStore(s => s.viewedFiles);

  const total = diff.length;
  const viewed = diff.reduce((n, f) => n + (viewedFiles.has(f.path) ? 1 : 0), 0);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--c-mantle)" }}>
      <button
        type="button"
        onClick={onExpand}
        title={t("files.rail_expand")}
        aria-label={t("files.rail_expand_aria")}
        style={{
          width: "100%", height: 28, display: "flex", alignItems: "center", justifyContent: "center",
          border: 0, background: "transparent", color: "var(--c-subtext)", cursor: "pointer",
        }}
      >
        <ChevronRight size={14} />
      </button>
      <div style={{ height: 1, background: "var(--c-line-soft)" }} />

      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "10px 0",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}>
        {diff.map(f => {
          const isViewed = viewedFiles.has(f.path);
          const active = selectedFile === f.path;
          return (
            <button
              key={f.path}
              type="button"
              onClick={() => selectFile(f.path)}
              title={f.path}
              aria-label={f.path}
              aria-current={active || undefined}
              style={{
                position: "relative", width: 28, height: 18, padding: 0, border: 0,
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {active && (
                <span
                  aria-hidden
                  style={{ position: "absolute", left: 0, top: 1, bottom: 1, width: 2, background: "var(--c-accent)" }}
                />
              )}
              <span style={{
                width: 6, height: 6, borderRadius: "var(--radius-pill)", boxSizing: "border-box",
                border: `1.5px solid ${isViewed || active ? "var(--c-accent)" : "var(--c-overlay)"}`,
                background: isViewed || active ? "var(--c-accent)" : "transparent",
                boxShadow: active ? "0 0 0 2px var(--c-mantle), 0 0 0 3px var(--c-accent)" : undefined,
              }} />
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: "8px 0 10px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 2, fontFamily: "var(--font-mono)",
        }}
        title={t("files.viewed_progress", { viewed, total })}
      >
        <span style={{ fontSize: 11, color: "var(--c-text)" }}>{viewed}/{total}</span>
        <span style={{
          fontSize: 8, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--c-overlay)",
        }}>
          {t("files.viewed_label")}
        </span>
      </div>
    </div>
  );
}
