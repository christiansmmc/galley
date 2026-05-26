use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use octocrab::Octocrab;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::task::JoinSet;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CiStatus {
    Passing,
    Pending,
    Failing,
    None,
}

impl Default for CiStatus {
    fn default() -> Self { CiStatus::None }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrSummary {
    pub id: i64,
    pub owner: String,
    pub repo: String,
    pub number: u64,
    pub title: String,
    pub author: String,
    pub state: String,
    pub updated_at: String,
    pub html_url: String,
    pub is_mine: bool,
    pub review_requested: bool,
    #[serde(default)]
    pub changed_files: i64,
    #[serde(default)]
    pub ci_status: CiStatus,
}

#[derive(Debug, Clone, Copy)]
pub enum PrFilter { Mine, ReviewRequested }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrDetail {
    pub summary: PrSummary,
    pub body: Option<String>,
    pub head_sha: String,
    pub base_sha: String,
    pub draft: bool,
    pub mergeable: Option<bool>,
    #[serde(default)]
    pub mergeable_state: Option<String>,
    #[serde(default)]
    pub additions: i64,
    #[serde(default)]
    pub deletions: i64,
    #[serde(default)]
    pub reviewers_count: i64,
}

impl GitHubClient {
    pub async fn list_prs(&self, filter: PrFilter, repos: &[(String, String)]) -> AppResult<Vec<PrSummary>> {
        if repos.is_empty() { return Ok(vec![]); }
        let qualifier = match filter {
            PrFilter::Mine => format!("author:{}", self.user_login),
            PrFilter::ReviewRequested => format!("review-requested:{}", self.user_login),
        };
        let repo_q = repos.iter()
            .map(|(o, n)| format!("repo:{o}/{n}"))
            .collect::<Vec<_>>()
            .join(" ");
        let q = format!("is:pr is:open {qualifier} {repo_q}");
        let page = self.inner
            .search()
            .issues_and_pull_requests(&q)
            .per_page(100)
            .send()
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        let mut out = Vec::with_capacity(page.items.len());
        for item in page.items {
            let url = item.html_url.to_string();
            let parts: Vec<&str> = url.split('/').collect();
            let owner = parts.get(3).copied().unwrap_or("").to_string();
            let repo = parts.get(4).copied().unwrap_or("").to_string();
            let is_mine = matches!(filter, PrFilter::Mine);
            let review_requested = matches!(filter, PrFilter::ReviewRequested);
            out.push(PrSummary {
                id: item.id.0 as i64,
                owner,
                repo,
                number: item.number,
                title: item.title,
                author: item.user.login,
                state: format!("{:?}", item.state).to_lowercase(),
                updated_at: item.updated_at.to_rfc3339(),
                html_url: url,
                is_mine,
                review_requested,
                changed_files: 0,
                ci_status: CiStatus::None,
            });
        }
        augment_with_ci_and_changes(self.inner.clone(), &mut out).await;
        Ok(out)
    }

    pub async fn get_pr(&self, owner: &str, repo: &str, number: u64) -> AppResult<PrDetail> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}");
        let pr: serde_json::Value = self.inner
            .get(route, None::<&()>).await
            .map_err(|e| AppError::Network(e.to_string()))?;
        let id = pr.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
        let updated_at = pr.get("updated_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let title = pr.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let author = pr.get("user").and_then(|u| u.get("login")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let head_sha = pr.get("head").and_then(|h| h.get("sha")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let base_sha = pr.get("base").and_then(|b| b.get("sha")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let body = pr.get("body").and_then(|v| v.as_str()).map(|s| s.to_string());
        let state = pr.get("state").and_then(|v| v.as_str()).unwrap_or("open").to_string();
        let draft = pr.get("draft").and_then(|v| v.as_bool()).unwrap_or(false);
        let mergeable = pr.get("mergeable").and_then(|v| v.as_bool());
        let mergeable_state = pr.get("mergeable_state").and_then(|v| v.as_str()).map(|s| s.to_string());
        let html_url = pr.get("html_url").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let changed_files = pr.get("changed_files").and_then(|v| v.as_i64()).unwrap_or(0);
        let additions = pr.get("additions").and_then(|v| v.as_i64()).unwrap_or(0);
        let deletions = pr.get("deletions").and_then(|v| v.as_i64()).unwrap_or(0);
        let reviewers_count = pr.get("requested_reviewers")
            .and_then(|v| v.as_array())
            .map(|a| a.len() as i64)
            .unwrap_or(0);
        let ci_status = if head_sha.is_empty() {
            CiStatus::None
        } else {
            fetch_ci_status(self.inner.as_ref(), owner, repo, &head_sha).await
        };
        Ok(PrDetail {
            summary: PrSummary {
                id, owner: owner.into(), repo: repo.into(), number,
                title, author, state, updated_at, html_url,
                is_mine: false, review_requested: false,
                changed_files, ci_status,
            },
            body, head_sha, base_sha, draft, mergeable, mergeable_state,
            additions, deletions, reviewers_count,
        })
    }
}

/// Fetch (changed_files, head_sha) from the pulls endpoint for a single PR.
async fn fetch_pull_meta(oct: &Octocrab, owner: &str, repo: &str, number: u64) -> (i64, String) {
    let route = format!("/repos/{owner}/{repo}/pulls/{number}");
    match oct.get::<serde_json::Value, _, _>(route, None::<&()>).await {
        Ok(v) => {
            let changed = v.get("changed_files").and_then(|x| x.as_i64()).unwrap_or(0);
            let sha = v.get("head")
                .and_then(|h| h.get("sha"))
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            (changed, sha)
        }
        Err(_) => (0, String::new()),
    }
}

/// Resolve a commit's CI state into a CiStatus dot.
///
/// Tries the legacy combined-status endpoint first; when it reports
/// `total_count == 0` (typical for repos that use the Checks API — e.g.
/// GitHub Actions, which doesn't publish to commit statuses), falls back
/// to `/check-runs` and aggregates conclusions.
async fn fetch_ci_status(oct: &Octocrab, owner: &str, repo: &str, sha: &str) -> CiStatus {
    let status_route = format!("/repos/{owner}/{repo}/commits/{sha}/status");
    if let Ok(v) = oct.get::<serde_json::Value, _, _>(status_route, None::<&()>).await {
        let total = v.get("total_count").and_then(|x| x.as_i64()).unwrap_or(0);
        if total > 0 {
            return match v.get("state").and_then(|x| x.as_str()).unwrap_or("") {
                "success" => CiStatus::Passing,
                "pending" => CiStatus::Pending,
                "failure" | "error" => CiStatus::Failing,
                _ => CiStatus::None,
            };
        }
    }
    fetch_check_runs_status(oct, owner, repo, sha).await
}

/// Aggregate the Checks API for a commit. Returns:
/// - `Pending` if any run is still queued/in_progress
/// - `Failing` if any completed run conclusion is failure-ish
/// - `Passing` if every completed run is success/neutral/skipped
/// - `None` if there are no runs (or the request fails)
async fn fetch_check_runs_status(oct: &Octocrab, owner: &str, repo: &str, sha: &str) -> CiStatus {
    let route = format!("/repos/{owner}/{repo}/commits/{sha}/check-runs?per_page=100");
    let v: serde_json::Value = match oct.get(route, None::<&()>).await {
        Ok(v) => v,
        Err(_) => return CiStatus::None,
    };
    let runs = match v.get("check_runs").and_then(|x| x.as_array()) {
        Some(a) if !a.is_empty() => a,
        _ => return CiStatus::None,
    };
    let mut any_failing = false;
    let mut any_pending = false;
    for run in runs {
        let status = run.get("status").and_then(|x| x.as_str()).unwrap_or("");
        if status != "completed" {
            any_pending = true;
            continue;
        }
        match run.get("conclusion").and_then(|x| x.as_str()).unwrap_or("") {
            "success" | "neutral" | "skipped" => {}
            "failure" | "timed_out" | "action_required" | "cancelled" | "stale" => {
                any_failing = true;
            }
            _ => {}
        }
    }
    if any_failing { CiStatus::Failing }
    else if any_pending { CiStatus::Pending }
    else { CiStatus::Passing }
}

/// Concurrently fill `changed_files` + `ci_status` on every PrSummary.
///
/// The search API doesn't expose these, so we fan out one pulls fetch
/// (changed_files + head sha) and one combined-status fetch per PR.
/// Errors are swallowed — affected rows just keep their defaults.
async fn augment_with_ci_and_changes(oct: Arc<Octocrab>, prs: &mut [PrSummary]) {
    if prs.is_empty() { return; }
    let mut set: JoinSet<(usize, i64, CiStatus)> = JoinSet::new();
    for (i, p) in prs.iter().enumerate() {
        let oct = oct.clone();
        let owner = p.owner.clone();
        let repo = p.repo.clone();
        let number = p.number;
        set.spawn(async move {
            let (changed, sha) = fetch_pull_meta(oct.as_ref(), &owner, &repo, number).await;
            let ci = if sha.is_empty() {
                CiStatus::None
            } else {
                fetch_ci_status(oct.as_ref(), &owner, &repo, &sha).await
            };
            (i, changed, ci)
        });
    }
    while let Some(res) = set.join_next().await {
        if let Ok((i, changed, ci)) = res {
            if let Some(p) = prs.get_mut(i) {
                p.changed_files = changed;
                p.ci_status = ci;
            }
        }
    }
}
