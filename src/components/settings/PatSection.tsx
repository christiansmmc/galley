import { useState } from "react";
import { api } from "../../ipc/client";
import { useSettingsStore } from "../../state/settingsStore";
import { Button, Input } from "../ui";

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
    <div style={{ padding: "var(--space-9)", maxWidth: 480, margin: "10vh auto" }}>
      <h2 style={{ marginTop: 0 }}>Conectar ao GitHub</h2>
      <p style={{ color: "var(--c-subtext)" }}>
        Cole seu Personal Access Token (escopo <code>repo</code>). O token fica guardado no keyring do sistema.
      </p>
      <Input
        type="password"
        mono
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="ghp_..."
        invalid={Boolean(err)}
      />
      {err && <div style={{ color: "var(--c-danger)", marginTop: "var(--space-4)", fontSize: "var(--text-base)" }}>{err}</div>}
      <div style={{ marginTop: "var(--space-6)" }}>
        <Button
          variant="subtle"
          onClick={submit}
          disabled={busy || !token.trim()}
        >
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
