import { Button, Dropdown, Input } from "../ui";
import { useSettingsStore } from "../../state/settingsStore";
import type { DiffRenderMode } from "../../ipc/types";
import { useT } from "../../i18n";

const LABEL_KEYS: Record<DiffRenderMode, string> = {
  "side-by-side": "settings.diff.mode_side_by_side",
  "inline": "settings.diff.mode_inline",
  "auto": "settings.diff.mode_auto",
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
  const t = useT();
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
      <h3 className="settings-section-title">{t("settings.diff.title")}</h3>

      <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
        {t("settings.diff.render_mode")}
      </label>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        {(["side-by-side", "inline", "auto"] as DiffRenderMode[]).map(m => (
          <Button
            key={m}
            variant={current === m ? "subtle" : "ghost"}
            size="sm"
            fullWidth
            onClick={() => setMode(m)}
          >{t(LABEL_KEYS[m])}</Button>
        ))}
      </div>
      <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
        {t("settings.diff.auto_hint")}
      </p>

      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
            {t("settings.diff.font")}
          </label>
          <Dropdown value={font.family} onChange={e => setFamily(e.target.value)} size="sm">
            {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
          </Dropdown>
        </div>
        <div style={{ width: 96 }}>
          <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
            {t("settings.diff.size")}
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
