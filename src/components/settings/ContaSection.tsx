import { useEffect, useState } from "react";
import { LogOut, RefreshCcw } from "lucide-react";
import { api } from "../../ipc/client";
import { useSettingsStore } from "../../state/settingsStore";
import { Avatar, Button, Input } from "../ui";
import { Trans } from "react-i18next";
import { useT } from "../../i18n";

export function ContaSection() {
  const t = useT();
  const checkPat = useSettingsStore(s => s.checkPat);
  const [user, setUser] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadUser = () => api.currentUser().then(setUser);
  useEffect(() => { loadUser(); }, []);

  const replace = async () => {
    if (!token.trim()) return;
    setBusy(true); setErr(null);
    try {
      await api.setPat(token.trim());
      await checkPat();
      await loadUser();
      setToken("");
      setReplacing(false);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    await api.clearPat();
    await checkPat();
    setUser(null);
  };

  return (
    <section>
      <h3 className="settings-section-title">{t("settings.account.title")}</h3>

      {user ? (
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--space-4)",
          padding: "var(--space-4) var(--space-5)",
          background: "var(--c-mantle)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-5)",
        }}>
          <Avatar login={user} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-medium)" as unknown as number }}>
              {user}
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
              {t("settings.account.connected_via_pat")}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--c-subtext)" }}>
          {t("settings.account.no_token")}
        </p>
      )}

      {!replacing && (
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button variant="ghost" size="sm" onClick={() => setReplacing(true)}>
            <RefreshCcw size={12} style={{ marginRight: "var(--space-2)" }} />
            {t("settings.account.replace_token")}
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              style={{ color: "var(--c-danger)" }}
            >
              <LogOut size={12} style={{ marginRight: "var(--space-2)" }} />
              {t("settings.account.logout")}
            </Button>
          )}
        </div>
      )}

      {replacing && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <label style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--c-subtext)", marginBottom: "var(--space-2)" }}>
            <Trans i18nKey="settings.account.new_token_label" components={[<code key="code" />]} />
          </label>
          <Input
            type="password"
            mono
            size="sm"
            value={token}
            onChange={e => { setToken(e.target.value); setErr(null); }}
            placeholder="ghp_..."
            invalid={Boolean(err)}
          />
          {err && (
            <div role="alert" style={{ color: "var(--c-danger)", marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}>{err}</div>
          )}
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <Button variant="subtle" size="sm" onClick={replace} disabled={busy || !token.trim()}>
              {busy ? t("settings.account.saving") : t("settings.account.save")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setReplacing(false); setToken(""); setErr(null); }}>
              {t("settings.account.cancel")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
