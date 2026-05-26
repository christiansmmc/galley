import { useState } from "react";
import { api } from "../../ipc/client";
import { userMessage } from "../../ipc/errors";
import { useSettingsStore } from "../../state/settingsStore";
import { Button, Input, Spinner } from "../ui";
import { Trans } from "react-i18next";
import { useT } from "../../i18n";

type DeviceState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting"; userCode: string; verificationUri: string };

export function PatSection({ onDone }: { onDone?: () => void }) {
  const t = useT();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceState>({ phase: "idle" });
  const [copied, setCopied] = useState(false);
  const checkPat = useSettingsStore(s => s.checkPat);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.setPat(token.trim());
      await checkPat();
      setToken("");
      onDone?.();
    } catch (e) {
      setErr(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const loginWithGithub = async () => {
    setErr(null);
    setDevice({ phase: "starting" });
    try {
      const start = await api.startDeviceLogin();
      setDevice({
        phase: "waiting",
        userCode: start.user_code,
        verificationUri: start.verification_uri,
      });
      // Blocks until the user authorizes in the browser (or it errors/expires).
      await api.pollDeviceLogin();
      await checkPat();
      setDevice({ phase: "idle" });
      onDone?.();
    } catch (e) {
      setErr(userMessage(e));
      setDevice({ phase: "idle" });
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; the code is shown for manual copy anyway.
    }
  };

  const loginBusy = device.phase !== "idle";

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
          {t("pat.first_time")}
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
          {t("pat.no_token_yet")}
        </h1>

        {/* Primary: OAuth device-flow login. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Button
            variant="primary"
            size="lg"
            onClick={loginWithGithub}
            disabled={loginBusy}
            leadingIcon={device.phase === "starting" ? <Spinner size={13} /> : undefined}
          >
            {device.phase === "starting" ? t("pat.starting_login") : t("pat.login_with_github")}
          </Button>

          {device.phase === "waiting" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--c-overlay)",
              }}>
                {t("pat.device_code_label")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: "var(--c-text)",
                }}>
                  {device.userCode}
                </span>
                <button
                  type="button"
                  onClick={() => void copyCode(device.userCode)}
                  aria-label={t("pat.copy_code")}
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
                  {copied ? t("pat.code_copied") : t("pat.copy_code")}
                </button>
              </div>
              <p style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--c-subtext)",
              }}>
                <Trans
                  i18nKey="pat.device_code_instructions"
                  values={{ url: device.verificationUri }}
                  components={[<code key="url" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />]}
                />
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Spinner size={13} />
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--c-subtext)",
                }}>
                  {t("pat.waiting_authorization")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fallback: paste a Personal Access Token. */}
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--c-overlay)",
        }}>
          {t("pat.or_paste_token")}
        </div>
        <p style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--c-subtext)",
        }}>
          <Trans i18nKey="pat.instructions" components={[<code key="code" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />]} />
        </p>
        <Input
          type="password"
          mono
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ghp_..."
          invalid={Boolean(err)}
          aria-label={t("pat.aria_label")}
          disabled={loginBusy}
        />
        {err && (
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--c-danger)",
            whiteSpace: "pre-wrap",
          }}>
            {t("pat.error_prefix")} {err}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "center" }}>
          <Button
            variant="link"
            tone="accent"
            onClick={submit}
            disabled={busy || loginBusy || !token.trim()}
          >
            {busy ? t("pat.saving") : t("pat.save_token")}
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
            {t("pat.create_token")}
          </button>
        </div>
      </div>
    </div>
  );
}
