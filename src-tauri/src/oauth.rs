//! GitHub OAuth Device Flow.
//!
//! Galley is a public desktop app: it cannot safely embed an OAuth
//! `client_secret`. The OAuth **device flow** is designed exactly for this
//! case — it needs only a *public* `client_id` (no secret, no callback
//! server). The user authorizes in their browser; we poll GitHub for the
//! resulting user-access token, then store it in the SAME OS keyring slot the
//! Personal Access Token uses, so the entire downstream `GitHubClient` path is
//! reused unchanged.
//!
//! See <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow>.

use crate::error::{AppError, AppResult};
use octocrab::auth::DeviceCodes;
use octocrab::Octocrab;
use secrecy::SecretString;

/// Public OAuth App `client_id` used for the device flow.
///
/// TODO(setup): replace this placeholder with the `client_id` of an OAuth App
/// you register at <https://github.com/settings/apps> (or a classic OAuth App
/// at <https://github.com/settings/developers>) with **Device Flow enabled**.
/// A `client_id` is NOT a secret — it ships in the binary safely. There is no
/// `client_secret` involved in the device flow.
///
/// You can also override this at runtime/build time without editing the source
/// by exporting the `GALLEY_OAUTH_CLIENT_ID` environment variable.
pub const GITHUB_OAUTH_CLIENT_ID: &str = "REPLACE_WITH_OAUTH_CLIENT_ID";

/// Environment variable that overrides [`GITHUB_OAUTH_CLIENT_ID`] at runtime.
const CLIENT_ID_ENV: &str = "GALLEY_OAUTH_CLIENT_ID";

/// OAuth scope requested for the device flow.
///
/// Matches the scope the PAT flow asks for at the GitHub token-creation page
/// linked from `PatSection.tsx` (`tokens/new?scopes=repo`).
pub const OAUTH_SCOPE: &str = "repo";

/// GitHub's device-flow endpoints live on the `github.com` web host, not the
/// `api.github.com` REST host octocrab defaults to.
const GITHUB_WEB_BASE: &str = "https://github.com";

/// Resolve the effective OAuth `client_id`.
///
/// Prefers the `GALLEY_OAUTH_CLIENT_ID` env var; falls back to the compiled-in
/// [`GITHUB_OAUTH_CLIENT_ID`] constant. Empty/whitespace-only env values are
/// ignored so an accidentally-blank export does not silently break the flow.
pub fn resolve_client_id() -> String {
    match std::env::var(CLIENT_ID_ENV) {
        Ok(v) if !v.trim().is_empty() => v.trim().to_string(),
        _ => GITHUB_OAUTH_CLIENT_ID.to_string(),
    }
}

/// Whether the resolved `client_id` is still the unconfigured placeholder.
///
/// Used to fail fast with a clear maintainer-facing message instead of letting
/// GitHub reject `REPLACE_WITH_OAUTH_CLIENT_ID` with an opaque error.
pub fn is_placeholder(client_id: &str) -> bool {
    client_id == GITHUB_OAUTH_CLIENT_ID
}

/// Build an `Octocrab` pointed at the `github.com` web host with the
/// `Accept: application/json` header the device-flow endpoints require.
///
/// octocrab's device-flow docs mandate this exact configuration; the default
/// builder targets `api.github.com` and would 404 on `/login/device/code`.
fn device_flow_client() -> AppResult<Octocrab> {
    Octocrab::builder()
        .base_uri(GITHUB_WEB_BASE)
        .map_err(|e| AppError::Internal(format!("oauth client base_uri: {e}")))?
        .add_header(http::header::ACCEPT, "application/json".to_string())
        .build()
        .map_err(|e| AppError::Internal(format!("oauth client build: {e}")))
}

/// Step 1 of the device flow: request device + user codes from GitHub.
///
/// Returns the [`DeviceCodes`] (containing `user_code`, `verification_uri`,
/// `device_code`, `interval`) plus the configured `Octocrab` to reuse for
/// polling, so we do not rebuild it (and re-resolve headers) between steps.
pub async fn request_device_codes() -> AppResult<(Octocrab, SecretString, DeviceCodes)> {
    let client_id_str = resolve_client_id();
    if is_placeholder(&client_id_str) {
        return Err(AppError::Internal(
            "GitHub OAuth login is not configured: replace GITHUB_OAUTH_CLIENT_ID \
             (or set GALLEY_OAUTH_CLIENT_ID) with a registered OAuth App client_id \
             that has Device Flow enabled."
                .to_string(),
        ));
    }
    let crab = device_flow_client()?;
    let client_id = SecretString::from(client_id_str);
    let codes = crab
        .authenticate_as_device(&client_id, [OAUTH_SCOPE])
        .await
        .map_err(|e| AppError::Auth(format!("device code request failed: {e}")))?;
    Ok((crab, client_id, codes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_detected() {
        assert!(is_placeholder(GITHUB_OAUTH_CLIENT_ID));
        assert!(!is_placeholder("Iv1.realclientid"));
    }

    /// All env-var cases live in ONE test: the process-global
    /// `GALLEY_OAUTH_CLIENT_ID` makes split tests race when cargo runs them in
    /// parallel. A single sequential test mutates + asserts + restores safely.
    #[test]
    fn resolve_client_id_env_override() {
        // SAFETY: single test owns the var for its duration; no other test
        // reads/writes it. We restore the original value at the end.
        let original = std::env::var(CLIENT_ID_ENV).ok();

        unsafe { std::env::remove_var(CLIENT_ID_ENV); }
        assert_eq!(resolve_client_id(), GITHUB_OAUTH_CLIENT_ID, "absent -> const");

        unsafe { std::env::set_var(CLIENT_ID_ENV, "Iv1.override123"); }
        assert_eq!(resolve_client_id(), "Iv1.override123", "present -> override");

        unsafe { std::env::set_var(CLIENT_ID_ENV, "   "); }
        assert_eq!(resolve_client_id(), GITHUB_OAUTH_CLIENT_ID, "blank -> const");

        // SAFETY: restore prior environment for any later code in this process.
        match original {
            Some(v) => unsafe { std::env::set_var(CLIENT_ID_ENV, v) },
            None => unsafe { std::env::remove_var(CLIENT_ID_ENV) },
        }
    }
}
