use crate::error::AppResult;
use crate::github::GitHubClient;
use crate::secrets;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn set_pat(token: String, state: State<'_, AppState>) -> AppResult<()> {
    tracing::info!("set_pat: token len={}", token.len());
    secrets::set_pat(&token).map_err(|e| {
        tracing::error!("set_pat keyring write failed: {e:?}");
        e
    })?;
    tracing::info!("set_pat: keyring saved, creating GitHub client");
    let client = GitHubClient::new(&token).await.map_err(|e| {
        tracing::error!("set_pat GitHubClient::new failed: {e:?}");
        e
    })?;
    *state.client.write().await = Some(client);
    tracing::info!("set_pat: complete");
    Ok(())
}

#[tauri::command]
pub async fn clear_pat(state: State<'_, AppState>) -> AppResult<()> {
    secrets::clear_pat()?;
    *state.client.write().await = None;
    Ok(())
}

#[tauri::command]
pub async fn has_pat() -> AppResult<bool> {
    Ok(secrets::get_pat()?.is_some())
}
