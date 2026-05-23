use crate::config;
use crate::config::types::PathFilter;
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_path_filters(repo: String, state: State<'_, AppState>) -> AppResult<Vec<PathFilter>> {
    Ok(state.settings.read().await.path_filters.iter()
        .filter(|f| f.repo == repo).cloned().collect())
}

#[tauri::command]
pub async fn set_path_filters(repo: String, filters: Vec<PathFilter>, state: State<'_, AppState>) -> AppResult<()> {
    let snapshot = {
        let mut s = state.settings.write().await;
        s.path_filters.retain(|f| f.repo != repo);
        s.path_filters.extend(filters);
        s.clone()
    };
    config::save(&snapshot)?;
    Ok(())
}
