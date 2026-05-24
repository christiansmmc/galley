import { useSettingsStore } from "../../state/settingsStore";
import type { PaletteSources } from "../../ipc/types";
import { Trans } from "react-i18next";
import { useT } from "../../i18n";

const ROWS: Array<{ key: keyof PaletteSources; labelKey: string; descKey: string }> = [
  { key: "prs", labelKey: "settings.palette.prs_label", descKey: "settings.palette.prs_desc" },
  { key: "files", labelKey: "settings.palette.files_label", descKey: "settings.palette.files_desc" },
  { key: "repos", labelKey: "settings.palette.repos_label", descKey: "settings.palette.repos_desc" },
  { key: "commands", labelKey: "settings.palette.commands_label", descKey: "settings.palette.commands_desc" },
];

export function PaletteSection() {
  const t = useT();
  const settings = useSettingsStore(s => s.settings);
  const save = useSettingsStore(s => s.save);

  const sources = settings?.ui.palette_sources ?? { prs: true, files: true, repos: true, commands: true };

  const toggle = (key: keyof PaletteSources) => {
    if (!settings) return;
    save({
      ...settings,
      ui: { ...settings.ui, palette_sources: { ...sources, [key]: !sources[key] } },
    });
  };

  return (
    <section>
      <h3 className="settings-section-title">{t("settings.palette.title")}</h3>
      <p style={{ marginTop: 0, marginBottom: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
        <Trans i18nKey="settings.palette.intro" components={[<kbd key="kbd" />]} />
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {ROWS.map(row => (
          <label
            key={row.key}
            style={{
              display: "flex", alignItems: "flex-start", gap: "var(--space-4)",
              padding: "var(--space-4)",
              background: "var(--c-mantle)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={sources[row.key]}
              onChange={() => toggle(row.key)}
              aria-label={t(row.labelKey)}
              style={{ marginTop: 3 }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-base)", color: "var(--c-text)", fontWeight: "var(--weight-medium)" as unknown as number }}>
                {t(row.labelKey)}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginTop: 2 }}>
                {t(row.descKey)}
              </div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
