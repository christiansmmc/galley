use crate::drafts::{create, delete, list, update, CommentDraft};
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn draft_comment(pr_id: i64, path: String, line: i64, side: String, body: String, state: State<'_, AppState>) -> AppResult<CommentDraft> {
    create(&state.cache, pr_id, &path, line, &side, &body)
}

#[tauri::command]
pub async fn list_drafts(pr_id: i64, state: State<'_, AppState>) -> AppResult<Vec<CommentDraft>> {
    list(&state.cache, pr_id)
}

#[tauri::command]
pub async fn update_draft(draft_id: i64, body: String, state: State<'_, AppState>) -> AppResult<CommentDraft> {
    update(&state.cache, draft_id, &body)
}

#[tauri::command]
pub async fn delete_draft(draft_id: i64, state: State<'_, AppState>) -> AppResult<()> {
    delete(&state.cache, draft_id)
}
