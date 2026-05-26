//! Tauri commands for the GitHub OAuth device-flow login.
//!
//! Two-step, await-based design (NO Tauri events, so NO extra capability):
//!   1. [`start_device_login`] requests the device + user codes, opens the
//!      browser to GitHub's verification page, stashes the in-flight state in
//!      `AppState`, and returns the `user_code` + `verification_uri` so the UI
//!      can display them immediately.
//!   2. [`poll_device_login`] awaits authorization (polling at GitHub's
//!      requested interval, honoring `slow_down`). On success it saves the
//!      token to the keyring and builds the live `GitHubClient`, mirroring the
//!      PAT path in `commands::secrets::set_pat`.

use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use crate::oauth;
use crate::{secrets, AppState, PendingDeviceLogin};
use either::Either;
use octocrab::auth::Continue;
use secrecy::ExposeSecret;
use serde::Serialize;
use std::time::Duration;
use tauri::State;

/// Returned to the UI from [`start_device_login`] so it can prompt the user.
#[derive(Serialize)]
pub struct DeviceLoginStart {
    pub user_code: String,
    pub verification_uri: String,
}

/// Step 1: begin the device flow. Requests codes, opens the browser, stashes
/// pending state, and returns the code the user must type in.
#[tauri::command]
pub async fn start_device_login(state: State<'_, AppState>) -> AppResult<DeviceLoginStart> {
    tracing::info!("device login started");
    let (crab, client_id, codes) = oauth::request_device_codes().await?;

    // Send the user to GitHub's verification page. A failure to launch the
    // browser is non-fatal: the UI still shows the code + URL for manual entry.
    if let Err(e) = crate::commands::system::open_url(&codes.verification_uri) {
        tracing::warn!("device login: could not open browser: {e:?}");
    }

    let out = DeviceLoginStart {
        user_code: codes.user_code.clone(),
        verification_uri: codes.verification_uri.clone(),
    };

    *state.device_login.write().await = Some(PendingDeviceLogin { crab, client_id, codes });
    Ok(out)
}

/// Step 2: poll GitHub until the user authorizes (or the request is denied /
/// expires). On success, persist the token and activate the GitHub client.
#[tauri::command]
pub async fn poll_device_login(state: State<'_, AppState>) -> AppResult<()> {
    // Pull the pending login out so the lock is not held across the poll loop.
    let pending = state
        .device_login
        .write()
        .await
        .take()
        .ok_or_else(|| AppError::Internal("no device login in progress".to_string()))?;

    let PendingDeviceLogin { crab, client_id, codes } = pending;

    // Manual poll loop honoring `interval` + `slow_down`. (octocrab also offers
    // `poll_until_available`, but a manual loop lets us map errors to AppError
    // and keep the secret out of any logs.)
    let mut interval = Duration::from_secs(codes.interval.max(1));
    let oauth = loop {
        tokio::time::sleep(interval).await;
        match codes.poll_once(&crab, &client_id).await {
            Ok(Either::Left(auth)) => break auth,
            Ok(Either::Right(Continue::AuthorizationPending)) => continue,
            Ok(Either::Right(Continue::SlowDown)) => {
                interval += Duration::from_secs(5);
                continue;
            }
            Err(e) => {
                return Err(AppError::Auth(format!("device authorization failed: {e}")));
            }
        }
    };

    // Persist + activate, mirroring commands::secrets::set_pat exactly.
    let token = oauth.access_token.expose_secret();
    secrets::set_pat(token).map_err(|e| {
        tracing::error!("device login keyring write failed: {e:?}");
        e
    })?;
    let client = GitHubClient::new(token).await.map_err(|e| {
        tracing::error!("device login GitHubClient::new failed: {e:?}");
        e
    })?;
    *state.client.write().await = Some(client);
    tracing::info!("device login authorized");
    Ok(())
}
