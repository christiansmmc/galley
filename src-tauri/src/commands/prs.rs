use crate::cache::ttl;
use crate::error::{AppError, AppResult};
use crate::github::diffs::FileDiff;
use crate::github::prs::{CiStatus, PrDetail, PrFilter, PrSummary};
use crate::github::threads::ReviewThread;
use crate::AppState;
use tauri::State;

/// Resolve the GitHub client, waiting out startup if it isn't built yet.
///
/// The client is now created by a background task (see `main.rs`) so the
/// window can paint without waiting on a `GET /user` round-trip. That opens a
/// short window right after launch where `state.client` is still `None` even
/// though a PAT exists — a command firing in that window would otherwise fail
/// with a bogus "set PAT first" and the UI would bounce the user to the PAT
/// screen. So: fast path if the client is already there, otherwise wait for
/// the init attempt to settle and re-check. Only once init has *finished*
/// without producing a client do we report the auth error.
async fn client(state: &State<'_, AppState>) -> AppResult<crate::github::GitHubClient> {
    if let Some(c) = state.client.read().await.clone() {
        return Ok(c);
    }
    state.await_client_init().await;
    state
        .client
        .read()
        .await
        .clone()
        .ok_or_else(|| AppError::Auth("no GitHub client; set PAT first".into()))
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
        if let Some(payload) = ttl::get_fresh_list(&state.cache, &key, ttl::LIST_TTL_SECS).await? {
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
        let _ = ttl::put_list(&state.cache, &key, &json).await;
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn get_pr(
    owner: String,
    repo: String,
    number: u64,
    force: bool,
    state: State<'_, AppState>,
) -> AppResult<PrDetail> {
    // Same `force` contract as `list_prs`: skip the cache *read*, still write
    // the fresh result back so the next non-forced read is warm.
    if !force {
        if let Some(payload) =
            ttl::get_fresh_pr(&state.cache, &owner, &repo, number, ttl::DETAIL_TTL_SECS).await?
        {
            if let Ok(cached) = serde_json::from_str::<PrDetail>(&payload) {
                tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache hit (get_pr)");
                return Ok(cached);
            }
        }
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, force, "cache miss (get_pr)");

    let c = client(&state).await?;
    let fresh = c.get_pr(&owner, &repo, number).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_pr(&state.cache, fresh.summary.id, &owner, &repo, number, &json).await;
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn get_pr_diff(
    owner: String,
    repo: String,
    number: u64,
    force: bool,
    state: State<'_, AppState>,
) -> AppResult<Vec<FileDiff>> {
    let pr_id = ttl::synthetic_pr_id(&owner, &repo, number);

    if !force {
        if let Some(payload) = ttl::get_fresh_diff(&state.cache, pr_id, ttl::DETAIL_TTL_SECS).await? {
            if let Ok(cached) = serde_json::from_str::<Vec<FileDiff>>(&payload) {
                tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache hit (get_pr_diff)");
                return Ok(cached);
            }
        }
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, force, "cache miss (get_pr_diff)");

    let c = client(&state).await?;
    let fresh = c.get_pr_diff(&owner, &repo, number).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_diff(&state.cache, pr_id, &json).await;
    }
    Ok(fresh)
}

#[tauri::command]
pub async fn get_pr_threads(
    owner: String,
    repo: String,
    number: u64,
    force: bool,
    state: State<'_, AppState>,
) -> AppResult<Vec<ReviewThread>> {
    let pr_id = ttl::synthetic_pr_id(&owner, &repo, number);

    if !force {
        if let Some(payload) = ttl::get_fresh_threads(&state.cache, pr_id, ttl::DETAIL_TTL_SECS).await? {
            if let Ok(cached) = serde_json::from_str::<Vec<ReviewThread>>(&payload) {
                tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, "cache hit (get_pr_threads)");
                return Ok(cached);
            }
        }
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, %number, force, "cache miss (get_pr_threads)");

    let c = client(&state).await?;
    let fresh = c.get_pr_threads(&owner, &repo, number).await?;
    if let Ok(json) = serde_json::to_string(&fresh) {
        let _ = ttl::put_threads(&state.cache, pr_id, &json).await;
    }
    Ok(fresh)
}

/// CI dot for one commit, on its own.
///
/// Deliberately uncached: it's the one field of a PR that goes stale while the
/// user is looking at it, and the whole point of splitting it out of `get_pr`
/// is that the UI can re-poll just this without paying for a full detail
/// refetch (which would also blow away the cached detail row).
#[tauri::command]
pub async fn get_ci_status(
    owner: String,
    repo: String,
    sha: String,
    state: State<'_, AppState>,
) -> AppResult<CiStatus> {
    let c = client(&state).await?;
    c.ci_status(&owner, &repo, &sha).await
}

/// Legacy entry point kept alive while the frontend migrates to
/// `get_pr(force: true)`.
///
/// It used to additionally wipe the diff/threads bundles *and* the entire PR
/// list cache. Both are gone: `get_pr_diff` / `get_pr_threads` now take their
/// own `force` flag, so the caller says exactly what it wants refreshed, and
/// dropping the list cache on every PR open was the reason list results were
/// never once served warm.
#[tauri::command]
pub async fn refresh_pr(
    owner: String,
    repo: String,
    number: u64,
    state: State<'_, AppState>,
) -> AppResult<PrDetail> {
    get_pr(owner, repo, number, true, state).await
}

#[tauri::command]
pub async fn get_file_content(
    owner: String,
    repo: String,
    path: String,
    git_ref: String,
    state: State<'_, AppState>,
) -> AppResult<Option<String>> {
    if let Some(cached) = ttl::get_blob(&state.cache, &git_ref, &path).await? {
        tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, path = %path, git_ref = %git_ref, "cache hit (get_file_content)");
        return Ok(Some(cached));
    }
    tracing::debug!(target: "pr_reviewer::cache", %owner, %repo, path = %path, git_ref = %git_ref, "cache miss (get_file_content)");
    let c = client(&state).await?;
    let content = c.get_file_content(&owner, &repo, &path, &git_ref).await?;
    if let Some(text) = &content {
        let _ = ttl::put_blob(&state.cache, &git_ref, &path, text).await;
    }
    Ok(content)
}
