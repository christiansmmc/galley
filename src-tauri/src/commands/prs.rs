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

#[tauri::command]
pub async fn list_prs(filter: String, state: State<'_, AppState>) -> AppResult<Vec<PrSummary>> {
    let f = match filter.as_str() {
        "mine" => PrFilter::Mine,
        "review_requested" => PrFilter::ReviewRequested,
        _ => return Err(AppError::Internal(format!("unknown filter: {filter}"))),
    };
    let repos: Vec<(String, String)> = {
        let s = state.settings.read().await;
        s.repos.iter().map(|r| (r.owner.clone(), r.name.clone())).collect()
    };
    let c = client(&state).await?;
    c.list_prs(f, &repos).await
}

#[tauri::command]
pub async fn get_pr(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<PrDetail> {
    let c = client(&state).await?;
    c.get_pr(&owner, &repo, number).await
}

#[tauri::command]
pub async fn get_pr_diff(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<Vec<FileDiff>> {
    let c = client(&state).await?;
    c.get_pr_diff(&owner, &repo, number).await
}

#[tauri::command]
pub async fn get_pr_threads(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<Vec<ReviewThread>> {
    let c = client(&state).await?;
    c.get_pr_threads(&owner, &repo, number).await
}

#[tauri::command]
pub async fn refresh_pr(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<PrDetail> {
    get_pr(owner, repo, number, state).await
}
