use crate::cache::ttl;
use crate::error::{AppError, AppResult};
use crate::github::diffs::FileDiff;
use crate::github::prs::{PrDetail, PrFilter, PrSummary};
use crate::github::threads::ReviewThread;
use crate::AppState;
use tauri::State;

async fn client(state: &State<'_, AppState>) -> AppResult<crate::github::GitHubClient> {
    let guard = state.client.read().await;
    guard.clone().ok_or_else(|| AppError::Auth("no GitHub client; set PAT first".into()))
}

fn list_cache_key(filter: &str, repos: &[(String, String)]) -> String {
    // Stable, order-independent: sort repo handles, join with ',' under the filter prefix.
    let mut keyed: Vec<String> = repos.iter().map(|(o, r)| format!("{o}/{r}")).collect();
    keyed.sort();
    format!("{filter}|{}", keyed.join(","))
}

#[tauri::command]
pub async fn list_prs(
    filter: String,
    force: bool,
    state: State<'_, AppState>,
) -> AppResult<Vec<PrSummary>> {
    let f = match filter.as_str() {
        "mine" => PrFilter::Mine,
        "review_requested" => PrFilter::ReviewRequested,
        _ => return Err(AppError::Internal(format!("unknown filter: {filter}"))),
    };
    let repos: Vec<(String, String)> = {
        let s = state.settings.read().await;
        s.repos.iter().map(|r| (r.owner.clone(), r.name.clone())).collect()
    };
    let key = list_cache_key(&filter, &repos);

    // `force` (manual refresh) bypasses the cache read so the user always gets
    // fresh data; the fresh result is still written back below.
    if !force {
        if let Some(payload) = ttl::get_fresh_list(&state.cache, &key, ttl::LIST_TTL_SECS)? {
            if let Ok(cached) = serde_json::from_str::<Vec<PrSummary>>(&payload) {
                tracing::debug!(target: "pr_reviewer::cache", key = %key, "cache hit (list_prs)");
                return Ok(cached);
            }
        }
    }
    tracing::debug!(target: "pr_reviewer::cache", key = %key, force, "cache miss (list_prs)");

    let c = client(&state).await?;
    let fresh = c.list_prs(f, &repos).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_list(&state.cache, &key, &json);
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn get_pr(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<PrDetail> {
    if let Some(payload) = ttl::get_fresh_pr(&state.cache, &owner, &repo, number, ttl::DETAIL_TTL_SECS)? {
        if let Ok(cached) = serde_json::from_str::<PrDetail>(&payload) {
            tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache hit (get_pr)");
            return Ok(cached);
        }
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache miss (get_pr)");

    let c = client(&state).await?;
    let fresh = c.get_pr(&owner, &repo, number).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_pr(&state.cache, fresh.summary.id, &owner, &repo, number, &json);
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn get_pr_diff(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<Vec<FileDiff>> {
    let pr_id = ttl::synthetic_pr_id(&owner, &repo, number);

    if let Some(payload) = ttl::get_fresh_diff(&state.cache, pr_id, ttl::DETAIL_TTL_SECS)? {
        if let Ok(cached) = serde_json::from_str::<Vec<FileDiff>>(&payload) {
            tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache hit (get_pr_diff)");
            return Ok(cached);
        }
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache miss (get_pr_diff)");

    let c = client(&state).await?;
    let fresh = c.get_pr_diff(&owner, &repo, number).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_diff(&state.cache, pr_id, &json);
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn get_pr_threads(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<Vec<ReviewThread>> {
    let pr_id = ttl::synthetic_pr_id(&owner, &repo, number);

    if let Some(payload) = ttl::get_fresh_threads(&state.cache, pr_id, ttl::DETAIL_TTL_SECS)? {
        if let Ok(cached) = serde_json::from_str::<Vec<ReviewThread>>(&payload) {
            tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache hit (get_pr_threads)");
            return Ok(cached);
        }
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache miss (get_pr_threads)");

    let c = client(&state).await?;
    let fresh = c.get_pr_threads(&owner, &repo, number).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_threads(&state.cache, pr_id, &json);
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn refresh_pr(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<PrDetail> {
    // Bypass cache entirely: clear all cached rows for this PR (and the list
    // cache, since a refresh implies the user wants fresh list data too).
    let _ = ttl::invalidate_pr_by_handle(&state.cache, &owner, &repo, number);
    // Also clear diff / threads bundle rows keyed by the synthetic pr_id.
    let synth_id = ttl::synthetic_pr_id(&owner, &repo, number);
    let _ = ttl::invalidate_pr(&state.cache, synth_id);
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache invalidated (refresh_pr)");

    // Now fetch fresh and re-cache.
    let c = client(&state).await?;
    let fresh = c.get_pr(&owner, &repo, number).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_pr(&state.cache, fresh.summary.id, &owner, &repo, number, &json);
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn get_file_content(
    owner: String,
    repo: String,
    path: String,
    git_ref: String,
    state: State<'_, AppState>,
) -> AppResult<Option<String>> {
    if let Some(cached) = ttl::get_blob(&state.cache, &git_ref, &path)? {
        tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, path = %path, git_ref = %git_ref, "cache hit (get_file_content)");
        return Ok(Some(cached));
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, path = %path, git_ref = %git_ref, "cache miss (get_file_content)");
    let c = client(&state).await?;
    let content = c.get_file_content(&owner, &repo, &path, &git_ref).await?;
    if let Some(text) = &content {
        let _ = ttl::put_blob(&state.cache, &git_ref, &path, text);
    }
    Ok(content)
}

