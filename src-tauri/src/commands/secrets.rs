use crate::error::AppResult;
use crate::github::GitHubClient;
use crate::secrets;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn set_pat(token: String, state: State<'_, AppState>) -> AppResult<()> {
    secrets::set_pat(&token)?;
    let client = GitHubClient::new(&token).await?;
    *state.client.write().await = Some(client);
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
