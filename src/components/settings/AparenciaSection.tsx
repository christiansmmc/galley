import { Button } from "../ui";
import { useSettingsStore } from "../../state/settingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeChoice } from "../../ipc/types";

export function AparenciaSection() {
  const { choice, setChoice } = useTheme();
  const settings = useSettingsStore(s => s.settings);
  const save = useSettingsStore(s => s.save);

  const compactPaths = settings?.ui.compact_paths ?? true;
  const toggleCompact = () => {
    if (!settings) return;
    save({ ...settings, ui: { ...settings.ui, compact_paths: !compactPaths } });
  };

  return (
    <section style={{ marginBottom: "var(--space-7)" }}>
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

      <label style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        marginTop: "var(--space-5)", cursor: "pointer",
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
