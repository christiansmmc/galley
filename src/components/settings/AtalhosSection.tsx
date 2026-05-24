interface Shortcut { keys: string[]; desc: string; }

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "K"], desc: "Paleta de comandos (PRs, arquivos, comandos)" },
  { keys: ["Ctrl", "1"], desc: "Mostrar / esconder lista de PRs" },
  { keys: ["Ctrl", "2"], desc: "Mostrar / esconder árvore de arquivos" },
  { keys: ["Ctrl", "P"], desc: "Focar busca na lista de PRs" },
  { keys: ["Esc"], desc: "Fechar modal ou painel aberto" },
];

export function AtalhosSection() {
  return (
    <section>
      <h3 className="settings-section-title">Atalhos</h3>
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
            <span style={{ color: "var(--c-text)" }}>{s.desc}</span>
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
        Mais atalhos serão adicionados conforme novas ações ganharem hotkeys.
      </p>
    </section>
  );
}
