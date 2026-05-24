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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      padding: "12vh 0 0 10vw",
      background: "var(--c-base)",
    }}>
      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--c-overlay)",
        }}>
          primeira vez
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 28,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: "var(--c-text)",
        }}>
          Sem token, ainda.
        </h1>
        <p style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--c-subtext)",
        }}>
          Cole um Personal Access Token do GitHub com escopo <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>repo</code>. Fica no keyring do sistema — nunca em disco.
        </p>
        <Input
          type="password"
          mono
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ghp_..."
          invalid={Boolean(err)}
          aria-label="Personal Access Token"
        />
        {err && (
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--c-danger)",
            whiteSpace: "pre-wrap",
          }}>
            error: {err}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "center" }}>
          <Button
            variant="link"
            tone="accent"
            onClick={submit}
            disabled={busy || !token.trim()}
          >
            {busy ? "salvando…" : "salvar token"}
          </Button>
          <button
            type="button"
            onClick={() => {
              void api.openExternalUrl(
                "https://github.com/settings/tokens/new?scopes=repo&description=PR%20Reviewer",
              );
            }}
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--c-subtext)",
              cursor: "pointer",
              borderBottom: "1px solid transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-text)"; e.currentTarget.style.borderBottomColor = "var(--c-line)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--c-subtext)"; e.currentTarget.style.borderBottomColor = "transparent"; }}
          >
            criar token no github ↗
          </button>
        </div>
      </div>
    </div>
  );
}
