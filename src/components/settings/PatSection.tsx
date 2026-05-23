import { useState } from "react";
import { api } from "../../ipc/client";
import { useSettingsStore } from "../../state/settingsStore";

export function PatSection({ onDone }: { onDone?: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const checkPat = useSettingsStore(s => s.checkPat);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.setPat(token.trim());
      await checkPat();
      setToken("");
      onDone?.();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "10vh auto" }}>
      <h2 style={{ marginTop: 0 }}>Conectar ao GitHub</h2>
      <p style={{ color: "var(--c-subtext)" }}>
        Cole seu Personal Access Token (escopo <code>repo</code>). O token fica guardado no keyring do sistema.
      </p>
      <input
        type="password"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="ghp_..."
        style={{
          width: "100%", padding: 10, borderRadius: 5,
          border: "1px solid var(--c-surface1)", background: "var(--c-mantle)",
          color: "var(--c-text)", fontFamily: "var(--font-mono)",
        }}
      />
      {err && <div style={{ color: "var(--c-red)", marginTop: 8 }}>{err}</div>}
      <button
        onClick={submit}
        disabled={busy || !token.trim()}
        style={{
          marginTop: 12, padding: "8px 14px", borderRadius: 5,
          border: 0, background: "var(--c-accent)", color: "white",
          cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}
