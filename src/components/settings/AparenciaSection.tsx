import type { CSSProperties } from "react";
import { useSettingsStore } from "../../state/settingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import type { AccentColor, Density, ThemeChoice } from "../../ipc/types";

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: "system",
  light: "claro",
  dark: "escuro",
};

const DENSITY_LABEL: Record<Density, string> = {
  compact: "compacta",
  comfortable: "confortável",
  spacious: "espaçosa",
};

const ACCENT_OPTIONS: Array<{ id: AccentColor; label: string; paperHex: string; linenHex: string }> = [
  { id: "sage",  label: "sage",  paperHex: "#5E7556", linenHex: "#8FA888" },
  { id: "ochre", label: "ochre", paperHex: "#8E6A2C", linenHex: "#C9A35A" },
  { id: "ink",   label: "ink",   paperHex: "#3B5570", linenHex: "#7AA5C9" },
  { id: "rust",  label: "rust",  paperHex: "#8B4A38", linenHex: "#C78866" },
];

const CREEDS = [
  "lendo. sem resumos.",
  "código antes do colega.",
  "sem atalhos não pedidos.",
  "um diff por vez.",
  "você é o revisor.",
];

const labelStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--c-overlay)",
  marginBottom: 8,
};

const fieldStyle: CSSProperties = { marginBottom: 24 };

function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        border: "1px solid var(--c-line)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 400,
              border: 0,
              borderLeft: i === 0 ? 0 : "1px solid var(--c-line)",
              background: active ? "var(--c-accent-soft)" : "transparent",
              color: active ? "var(--c-text)" : "var(--c-subtext)",
              cursor: "pointer",
              transition: "background var(--transition-fast), color var(--transition-fast)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function AparenciaSection() {
  const { choice, setChoice, resolved } = useTheme();
  const settings = useSettingsStore(s => s.settings);
  const save = useSettingsStore(s => s.save);

  const compactPaths = settings?.ui.compact_paths ?? true;
  const density = settings?.ui.density ?? "comfortable";
  const accent = settings?.ui.accent_color ?? "sage";
  const creed = settings?.ui.creed ?? CREEDS[0];

  const patch = (ui: Partial<NonNullable<typeof settings>["ui"]>) => {
    if (!settings) return;
    save({ ...settings, ui: { ...settings.ui, ...ui } });
  };

  return (
    <section>
      <h3 className="settings-section-title">Aparência</h3>

      <div style={fieldStyle}>
        <label style={labelStyle}>Tema</label>
        <Segmented<ThemeChoice>
          ariaLabel="Tema"
          value={choice}
          onChange={setChoice}
          options={(["system", "light", "dark"] as const).map(t => ({ value: t, label: THEME_LABEL[t] }))}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Acento</label>
        <div style={{ display: "flex", gap: 12 }}>
          {ACCENT_OPTIONS.map(opt => {
            const active = accent === opt.id;
            const swatch = resolved === "linen" ? opt.linenHex : opt.paperHex;
            return (
              <button
                key={opt.id}
                onClick={() => patch({ accent_color: opt.id })}
                aria-pressed={active}
                aria-label={`Acento ${opt.label}`}
                title={opt.label}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-sm)",
                  background: swatch,
                  border: active ? "2px solid var(--c-text)" : "1px solid var(--c-line)",
                  padding: 0,
                  cursor: "pointer",
                  transition: "border-color var(--transition-fast), transform var(--transition-fast)",
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Densidade</label>
        <Segmented<Density>
          ariaLabel="Densidade"
          value={density}
          onChange={d => patch({ density: d })}
          options={(["compact", "comfortable", "spacious"] as const).map(d => ({ value: d, label: DENSITY_LABEL[d] }))}
        />
      </div>

      <div style={fieldStyle}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={compactPaths}
            onChange={() => patch({ compact_paths: !compactPaths })}
            aria-label="Caminhos compactos"
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              width: 14,
              height: 14,
              border: "1px solid var(--c-line)",
              borderRadius: 2,
              background: compactPaths ? "var(--c-accent)" : "transparent",
              cursor: "pointer",
              position: "relative",
              flex: "0 0 14px",
            }}
          />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--c-text)" }}>
            Caminhos compactos na árvore de arquivos
          </span>
        </label>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="creed-select">Voz</label>
        <select
          id="creed-select"
          value={creed}
          onChange={e => patch({ creed: e.target.value })}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            padding: "6px 10px",
            background: "var(--c-base)",
            color: "var(--c-text)",
            border: "1px solid var(--c-line)",
            borderRadius: "var(--radius-sm)",
            minWidth: 240,
            cursor: "pointer",
          }}
        >
          {CREEDS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </section>
  );
}
