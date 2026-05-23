import { Button, Dropdown, Input } from "../ui";
import { useSettingsStore } from "../../state/settingsStore";
import type { DiffRenderMode } from "../../ipc/types";

const LABELS: Record<DiffRenderMode, string> = {
  "side-by-side": "Lado a lado",
  "inline": "Inline",
  "auto": "Auto",
};

const FONT_FAMILIES = [
  "JetBrains Mono",
  "Fira Code",
  "Cascadia Code",
  "IBM Plex Mono",
  "Source Code Pro",
  "Menlo",
  "Consolas",
  "monospace",
];

export function DiffSection() {
  const settings = useSettingsStore(s => s.settings);
  const save = useSettingsStore(s => s.save);

  if (!settings) return null;
  const current = settings.ui.diff_render_mode;
  const font = settings.ui.diff_font;

  const setMode = (mode: DiffRenderMode) => {
    save({ ...settings, ui: { ...settings.ui, diff_render_mode: mode } });
  };
  const setSize = (n: number) => {
    if (Number.isNaN(n) || n < 8 || n > 32) return;
    save({ ...settings, ui: { ...settings.ui, diff_font: { ...font, size: n } } });
  };
  const setFamily = (family: string) => {
    save({ ...settings, ui: { ...settings.ui, diff_font: { ...font, family } } });
  };

  return (
    <section>
      <h4 style={{ margin: "0 0 var(--space-4)" }}>Diff</h4>

      <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
        Modo de renderização
      </label>
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
        Auto: lado a lado quando o painel do diff tem ≥&nbsp;1100&nbsp;px de largura, inline abaixo. A largura é medida no próprio painel (não na janela), então abrir a lista de PRs ou a árvore de arquivos pode disparar o modo inline.
      </p>

      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
            Fonte
          </label>
          <Dropdown value={font.family} onChange={e => setFamily(e.target.value)} size="sm">
            {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
          </Dropdown>
        </div>
        <div style={{ width: 96 }}>
          <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
            Tamanho
          </label>
          <Input
            type="number"
            min={8}
            max={32}
            mono
            size="sm"
            value={String(font.size)}
            onChange={e => setSize(parseInt(e.target.value, 10))}
          />
        </div>
      </div>
    </section>
  );
}
