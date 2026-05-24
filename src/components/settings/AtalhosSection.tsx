import { useT } from "../../i18n";

interface Shortcut { keys: string[]; descKey: string; }

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "K"], descKey: "settings.shortcuts.palette_desc" },
  { keys: ["Ctrl", "1"], descKey: "settings.shortcuts.toggle_pr_list_desc" },
  { keys: ["Ctrl", "2"], descKey: "settings.shortcuts.toggle_file_tree_desc" },
  { keys: ["Ctrl", "P"], descKey: "settings.shortcuts.focus_search_desc" },
  { keys: ["Esc"], descKey: "settings.shortcuts.close_modal_desc" },
];

export function AtalhosSection() {
  const t = useT();
  return (
    <section>
      <h3 className="settings-section-title">{t("settings.shortcuts.title")}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {SHORTCUTS.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--c-mantle)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-base)",
            }}
          >
            <span style={{ color: "var(--c-text)" }}>{t(s.descKey)}</span>
            <span style={{ display: "flex", gap: "var(--space-2)" }}>
              {s.keys.map((k, j) => (
                <kbd
                  key={j}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    padding: "2px var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--c-base)",
                    border: "1px solid var(--c-surface1)",
                    color: "var(--c-subtext)",
                  }}
                >{k}</kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
        {t("settings.shortcuts.more_hint")}
      </p>
    </section>
  );
}
