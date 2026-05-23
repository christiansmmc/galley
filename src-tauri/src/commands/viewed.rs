use crate::error::AppResult;
use crate::viewed;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_viewed_files(pr_id: i64, state: State<'_, AppState>) -> AppResult<Vec<String>> {
    viewed::list(&state.cache, pr_id)
}

#[tauri::command]
pub async fn mark_viewed(
    pr_id: i64,
    path: String,
    viewed: bool,
    state: State<'_, AppState>,
) -> AppResult<()> {
    viewed::mark(&state.cache, pr_id, &path, viewed)
}
