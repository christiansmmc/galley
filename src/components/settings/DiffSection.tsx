import { Button } from "../ui";
import { useSettingsStore } from "../../state/settingsStore";
import type { DiffRenderMode } from "../../ipc/types";

const LABELS: Record<DiffRenderMode, string> = {
  "side-by-side": "Lado a lado",
  "inline": "Inline",
  "auto": "Auto",
};

export function DiffSection() {
  const settings = useSettingsStore(s => s.settings);
  const save = useSettingsStore(s => s.save);

  if (!settings) return null;
  const current = settings.ui.diff_render_mode;

  const setMode = (mode: DiffRenderMode) => {
    save({ ...settings, ui: { ...settings.ui, diff_render_mode: mode } });
  };

  return (
    <section style={{ marginBottom: "var(--space-7)" }}>
      <h4 style={{ margin: "0 0 var(--space-4)" }}>Diff</h4>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        {(["side-by-side", "inline", "auto"] as DiffRenderMode[]).map(m => (
          <Button
            key={m}
            variant={current === m ? "subtle" : "ghost"}
            size="sm"
            fullWidth
            onClick={() => setMode(m)}
          >{LABELS[m]}</Button>
        ))}
      </div>
      <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
        Auto: lado a lado acima de 1100&nbsp;px, inline abaixo.
      </p>
    </section>
  );
}
