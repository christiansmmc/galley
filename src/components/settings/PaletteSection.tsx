import { useSettingsStore } from "../../state/settingsStore";
import type { PaletteSources } from "../../ipc/types";

const ROWS: Array<{ key: keyof PaletteSources; label: string; desc: string }> = [
  { key: "prs", label: "Pull Requests", desc: "Lista todos os PRs configurados (Mine + Pra revisar)." },
  { key: "files", label: "Arquivos", desc: "Lista arquivos do PR atualmente aberto." },
  { key: "repos", label: "Repositórios", desc: "Lista repos configurados; selecionar escopa a busca a aquele repo." },
  { key: "commands", label: "Comandos", desc: "Refresh, Configurações, Tema, Enviar review. Sempre disponíveis no modo > prefixo." },
];

export function PaletteSection() {
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
      <h4 style={{ margin: "0 0 var(--space-2)" }}>Paleta de comandos</h4>
      <p style={{ marginTop: 0, marginBottom: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
        Controla quais fontes a paleta (<kbd>Ctrl+K</kbd>) inclui. Desativar uma fonte esconde os itens dela.
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
              aria-label={row.label}
              style={{ marginTop: 3 }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-base)", color: "var(--c-text)", fontWeight: "var(--weight-medium)" as unknown as number }}>
                {row.label}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginTop: 2 }}>
                {row.desc}
              </div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
