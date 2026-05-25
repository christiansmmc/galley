use crate::config;
use crate::config::types::RepoConfig;
use crate::error::{AppError, AppResult};
use crate::github::repos::{RemoteRepo, RepoBrowseFilters};
use crate::repo_input;
use crate::AppState;
use serde::Serialize;
use tauri::State;

/// PRs opened per repo over the last 365 days, surfaced in the Settings list.
#[derive(Debug, Clone, Serialize)]
pub struct RepoPrCount {
    pub owner: String,
    pub name: String,
    pub count: i64,
}

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

/// Parse a user-pasted repo string and verify the PAT can reach it.
/// Returns the resolved `(owner, name)` without persisting; the caller
/// is expected to invoke `add_repo` after a successful validation.
#[tauri::command]
pub async fn validate_repo(input: String, state: State<'_, AppState>) -> AppResult<RepoConfig> {
    let (owner, name) = repo_input::parse(&input)
        .ok_or_else(|| AppError::Config("invalid_repo_format".into()))?;
    let client_guard = state.client.read().await;
    let client = client_guard
        .as_ref()
        .ok_or_else(|| AppError::Auth("no_pat_configured".into()))?;
    client.validate_repo(&owner, &name).await?;
    Ok(RepoConfig { owner, name })
}

/// Paginated `/user/repos` for the Browse modal. Client-side filtering
/// per `filters` (orgs / forks / archived).
#[tauri::command]
pub async fn list_my_repos(
    page: u32,
    filters: RepoBrowseFilters,
    state: State<'_, AppState>,
) -> AppResult<Vec<RemoteRepo>> {
    let client_guard = state.client.read().await;
    let client = client_guard
        .as_ref()
        .ok_or_else(|| AppError::Auth("no_pat_configured".into()))?;
    client.list_my_repos(page, filters).await
}

/// Yearly PR counts for `repos`, fetched in parallel. A repo whose Search
/// request fails is simply omitted — the UI treats a missing entry as "no
/// number yet" rather than surfacing an error for a non-essential stat.
#[tauri::command]
pub async fn repo_pr_counts(
    repos: Vec<RepoConfig>,
    state: State<'_, AppState>,
) -> AppResult<Vec<RepoPrCount>> {
    let client = {
        let guard = state.client.read().await;
        guard
            .as_ref()
            .ok_or_else(|| AppError::Auth("no_pat_configured".into()))?
            .clone()
    };
    let mut set = tokio::task::JoinSet::new();
    for r in repos {
        let client = client.clone();
        set.spawn(async move {
            client
                .pr_count_last_year(&r.owner, &r.name)
                .await
                .ok()
                .map(|count| RepoPrCount { owner: r.owner, name: r.name, count })
        });
    }
    let mut out = Vec::new();
    while let Some(res) = set.join_next().await {
        if let Ok(Some(c)) = res {
            out.push(c);
        }
    }
    Ok(out)
}

/// Replace the configured repo list with `repos`. Used by the Browse modal's
/// Save action — diff is computed client-side so the command is a flat overwrite.
#[tauri::command]
pub async fn set_repos(repos: Vec<RepoConfig>, state: State<'_, AppState>) -> AppResult<()> {
    let snapshot = {
        let mut s = state.settings.write().await;
        s.repos = repos;
        s.clone()
    };
    config::save(&snapshot)?;
    Ok(())
}
