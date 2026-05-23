import { Button } from "../ui";
import { useSettingsStore } from "../../state/settingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import type { Density, ThemeChoice } from "../../ipc/types";

const DENSITY_LABEL: Record<Density, string> = {
  compact: "Compacta",
  comfortable: "Confortável",
  spacious: "Espaçosa",
};

export function AparenciaSection() {
  const { choice, setChoice } = useTheme();
  const settings = useSettingsStore(s => s.settings);
  const save = useSettingsStore(s => s.save);

  const compactPaths = settings?.ui.compact_paths ?? true;
  const density = settings?.ui.density ?? "comfortable";

  const toggleCompact = () => {
    if (!settings) return;
    save({ ...settings, ui: { ...settings.ui, compact_paths: !compactPaths } });
  };
  const setDensity = (d: Density) => {
    if (!settings) return;
    save({ ...settings, ui: { ...settings.ui, density: d } });
  };

  return (
    <section>
      <h4 style={{ margin: "0 0 var(--space-4)" }}>Aparência</h4>

      <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
        Tema
      </label>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        {(["system", "light", "dark"] as ThemeChoice[]).map(t => (
          <Button
            key={t}
            variant={choice === t ? "subtle" : "ghost"}
            size="sm"
            fullWidth
            onClick={() => setChoice(t)}
          >{t}</Button>
        ))}
      </div>

      <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginTop: "var(--space-6)", marginBottom: "var(--space-2)" }}>
        Densidade
      </label>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        {(["compact", "comfortable", "spacious"] as Density[]).map(d => (
          <Button
            key={d}
            variant={density === d ? "subtle" : "ghost"}
            size="sm"
            fullWidth
            onClick={() => setDensity(d)}
          >{DENSITY_LABEL[d]}</Button>
        ))}
      </div>

      <label style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        marginTop: "var(--space-6)", cursor: "pointer",
        fontSize: "var(--text-base)",
      }}>
        <input
          type="checkbox"
          checked={compactPaths}
          onChange={toggleCompact}
          aria-label="Caminhos compactos"
        />
        Caminhos compactos na árvore de arquivos
      </label>
      <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
        Junta diretórios com um único filho num só nó. Útil para repositórios Java/Maven.
      </p>
    </section>
  );
}
