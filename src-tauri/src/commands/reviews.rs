use crate::drafts;
use crate::error::{AppError, AppResult};
use crate::github::reviews::{ReviewEvent, ReviewResult};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn submit_review(
    owner: String,
    repo: String,
    number: u64,
    event: ReviewEvent,
    body: Option<String>,
    pr_id: i64,
    draft_ids: Vec<i64>,
    state: State<'_, AppState>,
) -> AppResult<ReviewResult> {
    let all = drafts::list(&state.cache, pr_id)?;
    let id_set: std::collections::HashSet<i64> = draft_ids.into_iter().collect();
    let selected: Vec<_> = all.into_iter().filter(|d| id_set.contains(&d.id)).collect();

    let client = state.client.read().await
        .clone()
        .ok_or_else(|| AppError::Auth("no GitHub client".into()))?;
    let result = client.submit_review(&owner, &repo, number, event, body.as_deref(), &selected).await?;
    for d in &selected { let _ = crate::drafts::delete(&state.cache, d.id); }
    Ok(result)
}
