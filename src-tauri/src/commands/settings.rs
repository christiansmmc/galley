use crate::config;
use crate::config::types::Settings;
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    Ok(state.settings.read().await.clone())
}

#[tauri::command]
pub async fn set_settings(settings: Settings, state: State<'_, AppState>) -> AppResult<()> {
    {
        let mut s = state.settings.write().await;
        *s = settings.clone();
    }
    config::save(&settings)?;
    Ok(())
}
