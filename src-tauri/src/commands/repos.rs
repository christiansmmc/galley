use crate::config;
use crate::config::types::RepoConfig;
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_repos(state: State<'_, AppState>) -> AppResult<Vec<RepoConfig>> {
    Ok(state.settings.read().await.repos.clone())
}

#[tauri::command]
pub async fn add_repo(owner: String, name: String, state: State<'_, AppState>) -> AppResult<RepoConfig> {
    let r = RepoConfig { owner, name };
    let snapshot = {
        let mut s = state.settings.write().await;
        if !s.repos.contains(&r) { s.repos.push(r.clone()); }
        s.clone()
    };
    config::save(&snapshot)?;
    Ok(r)
}

#[tauri::command]
pub async fn remove_repo(owner: String, name: String, state: State<'_, AppState>) -> AppResult<()> {
    let snapshot = {
        let mut s = state.settings.write().await;
        s.repos.retain(|r| !(r.owner == owner && r.name == name));
        s.clone()
    };
    config::save(&snapshot)?;
    Ok(())
}
