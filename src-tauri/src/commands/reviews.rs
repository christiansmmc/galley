use crate::cache::ttl;
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

    // The freshly-submitted comments aren't in the cached threads bundle,
    // so the next get_pr_threads would serve stale data until the TTL
    // expires (5 min). Invalidate just the threads row — diff / PR detail
    // are unchanged.
    let synth_id = ttl::synthetic_pr_id(&owner, &repo, number);
    let _ = ttl::invalidate_threads(&state.cache, synth_id);

    Ok(result)
}

#[tauri::command]
pub async fn reply_to_thread(
    owner: String,
    repo: String,
    number: u64,
    in_reply_to: i64,
    body: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let client = state.client.read().await
        .clone()
        .ok_or_else(|| AppError::Auth("no GitHub client".into()))?;
    client.reply_to_thread(&owner, &repo, number, in_reply_to, &body).await?;

    // Same reason as submit_review: the new reply isn't in the cache yet.
    let synth_id = ttl::synthetic_pr_id(&owner, &repo, number);
    let _ = ttl::invalidate_threads(&state.cache, synth_id);

    Ok(())
}

#[tauri::command]
pub async fn resolve_thread(
    owner: String,
    repo: String,
    number: u64,
    thread_node_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let client = state.client.read().await
        .clone()
        .ok_or_else(|| AppError::Auth("no GitHub client".into()))?;
    client.resolve_thread(&thread_node_id).await?;

    let synth_id = ttl::synthetic_pr_id(&owner, &repo, number);
    let _ = ttl::invalidate_threads(&state.cache, synth_id);

    Ok(())
}

#[tauri::command]
pub async fn merge_pr(
    owner: String,
    repo: String,
    number: u64,
    method: crate::github::merge::MergeMethod,
    head_sha: String,
    state: State<'_, AppState>,
) -> AppResult<crate::github::merge::MergeResult> {
    let client = state.client.read().await
        .clone()
        .ok_or_else(|| AppError::Auth("no GitHub client".into()))?;
    let result = client.merge_pr(&owner, &repo, number, method, &head_sha).await?;

    // The PR is now merged/closed; drop its cached detail + diff + threads so a
    // refresh shows the new state instead of waiting out the TTL.
    let _ = ttl::invalidate_pr_by_handle(&state.cache, &owner, &repo, number);

    Ok(result)
}
