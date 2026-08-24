use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use chrono::{DateTime, Utc};
use octocrab::Octocrab;
use serde::{Deserialize, Serialize};

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
    #[serde(default)]
    pub head_ref: String,
    #[serde(default)]
    pub base_ref: String,
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

/// GraphQL document backing `list_prs`.
///
/// This replaces what used to be a REST fan-out: one Search call, then — per
/// PR — a `/pulls/{n}` fetch (for `changed_files` + head sha), a
/// `/commits/{sha}/status` fetch and usually a `/commits/{sha}/check-runs`
/// fetch too. With ~15 open PRs across the user's repos that was ~45 requests
/// per filter, and since the UI loads `mine` and `review_requested` in
/// parallel it was ~90 requests to paint one list — enough to trip GitHub's
/// secondary rate limiter, which then *deliberately* slows the responses down.
///
/// GraphQL exposes every one of those fields inline on the `PullRequest`
/// node, so the whole list collapses into a single HTTP request per filter:
///
/// - `changedFiles` replaces the per-PR `/pulls/{n}` fetch.
/// - `commits(last: 1) { … statusCheckRollup { state } }` replaces both the
///   combined-status and the check-runs fetch — the rollup is GitHub's own
///   union of commit statuses *and* check runs, which is exactly what
///   `fetch_ci_status` was hand-rolling.
/// - `repository { name owner { login } }` gives us the owner/repo split
///   directly instead of slicing it out of the html_url.
///
/// `databaseId` on a `PullRequest` is the *pull request* id (what
/// `/repos/{o}/{r}/pulls/{n}` returns), not the issue id the REST search
/// endpoint used to hand back. That makes list rows and `get_pr` detail rows
/// agree on `PrSummary.id`, which they previously did not.
const LIST_PRS_QUERY: &str = r#"
    query($q: String!) {
      search(type: ISSUE, query: $q, first: 100) {
        nodes {
          ... on PullRequest {
            databaseId
            number
            title
            url
            state
            updatedAt
            changedFiles
            author { login }
            repository {
              name
              owner { login }
            }
            commits(last: 1) {
              nodes {
                commit {
                  statusCheckRollup { state }
                }
              }
            }
          }
        }
      }
    }
"#;

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
        // Same search syntax as the REST endpoint took — GraphQL's
        // `search(type: ISSUE, query: …)` speaks the identical qualifier
        // language, so the result set is unchanged.
        let q = format!("is:pr is:open {qualifier} {repo_q}");
        let body = serde_json::json!({
            "query": LIST_PRS_QUERY,
            "variables": { "q": q },
        });
        let resp: serde_json::Value = self.inner
            .post::<_, serde_json::Value>("/graphql", Some(&body))
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        map_search_response(&resp, filter)
    }

    /// CI dot for an arbitrary commit — backs the `get_ci_status` command,
    /// which the UI polls for the currently-open PR without re-fetching the
    /// whole detail payload.
    pub async fn ci_status(&self, owner: &str, repo: &str, sha: &str) -> AppResult<CiStatus> {
        if sha.is_empty() { return Ok(CiStatus::None); }
        Ok(fetch_ci_status(self.inner.as_ref(), owner, repo, sha).await)
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
        let head_ref = pr.get("head").and_then(|h| h.get("ref")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let base_ref = pr.get("base").and_then(|b| b.get("ref")).and_then(|v| v.as_str()).unwrap_or("").to_string();
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
            body, head_sha, base_sha, head_ref, base_ref, draft, mergeable, mergeable_state,
            additions, deletions, reviewers_count,
        })
    }
}

/// Turn a raw `/graphql` response for [`LIST_PRS_QUERY`] into `PrSummary` rows.
///
/// Kept free of `self` / network so it can be unit-tested against a
/// hand-written fixture — the JSON-shape assumptions are where this rewrite
/// can realistically go wrong, and they're the only part testable offline.
///
/// `filter` is what decides `is_mine` / `review_requested`: the search query
/// already narrowed the result set to one or the other, so every row in a
/// given response carries the same pair of flags (same semantics as the REST
/// implementation this replaced).
fn map_search_response(resp: &serde_json::Value, filter: PrFilter) -> AppResult<Vec<PrSummary>> {
    // GraphQL answers 200 OK even when the query failed, putting the reason in
    // a top-level `errors` array. Surfacing it beats mapping `data: null` into
    // an empty list, which would look to the user like "no open PRs".
    if let Some(errors) = resp.get("errors") {
        let empty = errors.as_array().map(|a| a.is_empty()).unwrap_or(false);
        if !empty {
            return Err(AppError::Network(format!("list_prs graphql: {errors}")));
        }
    }
    let nodes = resp
        .pointer("/data/search/nodes")
        .and_then(|v| v.as_array())
        .ok_or_else(|| AppError::Network("list_prs graphql: missing data.search.nodes".into()))?;

    let is_mine = matches!(filter, PrFilter::Mine);
    let review_requested = matches!(filter, PrFilter::ReviewRequested);

    let mut out = Vec::with_capacity(nodes.len());
    for node in nodes {
        // `search(type: ISSUE)` can also yield Issue nodes; the inline
        // fragment leaves those as `{}`. `is:pr` should prevent it, but skip
        // anything without a number rather than emitting a bogus row.
        let number = match node.get("number").and_then(|v| v.as_u64()) {
            Some(n) => n,
            None => continue,
        };
        let owner = node
            .pointer("/repository/owner/login")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let repo = node
            .pointer("/repository/name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        // `author` is null for PRs opened by a since-deleted account.
        let author = node
            .pointer("/author/login")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let rollup = node
            .pointer("/commits/nodes/0/commit/statusCheckRollup/state")
            .and_then(|v| v.as_str());
        out.push(PrSummary {
            id: node.get("databaseId").and_then(|v| v.as_i64()).unwrap_or(0),
            owner,
            repo,
            number,
            title: node.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            author,
            // PullRequestState is SCREAMING_CASE (OPEN / CLOSED / MERGED);
            // the REST path lowercased its own enum, so keep the same casing.
            state: node.get("state").and_then(|v| v.as_str()).unwrap_or("OPEN").to_lowercase(),
            updated_at: normalize_timestamp(
                node.get("updatedAt").and_then(|v| v.as_str()).unwrap_or(""),
            ),
            html_url: node.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            is_mine,
            review_requested,
            changed_files: node.get("changedFiles").and_then(|v| v.as_i64()).unwrap_or(0),
            ci_status: rollup_state_to_ci(rollup),
        });
    }
    Ok(out)
}

/// Re-emit GitHub's `DateTime` (`2026-08-24T12:00:00Z`) in the exact RFC3339
/// spelling the REST path produced (`…+00:00`), so cached payloads written
/// before and after this rewrite compare equal and the UI's date formatting
/// sees one shape. Unparseable input is passed through untouched.
fn normalize_timestamp(raw: &str) -> String {
    DateTime::parse_from_rfc3339(raw)
        .map(|dt| dt.with_timezone(&Utc).to_rfc3339())
        .unwrap_or_else(|_| raw.to_string())
}

/// Map GraphQL's `StatusState` onto our `CiStatus` dot.
///
/// `statusCheckRollup` is `null` when the head commit has neither commit
/// statuses nor check runs — the REST path folded that into `CiStatus::None`
/// (empty `total_count`, then empty `check_runs`), so it stays `None` here.
///
/// `EXPECTED` means GitHub was told to expect a status that hasn't been
/// posted yet; the check-runs aggregation treated the equivalent state
/// (queued / in_progress) as pending, so it maps to `Pending`.
fn rollup_state_to_ci(state: Option<&str>) -> CiStatus {
    match state {
        Some("SUCCESS") => CiStatus::Passing,
        Some("PENDING") | Some("EXPECTED") => CiStatus::Pending,
        Some("FAILURE") | Some("ERROR") => CiStatus::Failing,
        _ => CiStatus::None,
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Hand-written stand-in for a real `/graphql` response to
    /// [`LIST_PRS_QUERY`], covering the three CI shapes that matter:
    /// a passing rollup, a `null` rollup (repo with no CI configured on that
    /// commit), and a pending one.
    fn fixture() -> serde_json::Value {
        serde_json::json!({
          "data": {
            "search": {
              "nodes": [
                {
                  "databaseId": 1001,
                  "number": 42,
                  "title": "feat: add widget",
                  "url": "https://github.com/esparta/scorehub-api/pull/42",
                  "state": "OPEN",
                  "updatedAt": "2026-08-24T12:00:00Z",
                  "changedFiles": 7,
                  "author": { "login": "csequeira" },
                  "repository": { "name": "scorehub-api", "owner": { "login": "esparta" } },
                  "commits": { "nodes": [
                    { "commit": { "statusCheckRollup": { "state": "SUCCESS" } } }
                  ]}
                },
                {
                  "databaseId": 1002,
                  "number": 7,
                  "title": "chore: bump deps",
                  "url": "https://github.com/esparta/galley/pull/7",
                  "state": "OPEN",
                  "updatedAt": "2026-08-23T09:30:00Z",
                  "changedFiles": 2,
                  "author": { "login": "someone-else" },
                  "repository": { "name": "galley", "owner": { "login": "esparta" } },
                  "commits": { "nodes": [
                    { "commit": { "statusCheckRollup": serde_json::Value::Null } }
                  ]}
                },
                {
                  "databaseId": 1003,
                  "number": 99,
                  "title": "fix: flaky test",
                  "url": "https://github.com/other-org/tools/pull/99",
                  "state": "OPEN",
                  "updatedAt": "2026-08-22T18:45:12Z",
                  "changedFiles": 1,
                  "author": { "login": "csequeira" },
                  "repository": { "name": "tools", "owner": { "login": "other-org" } },
                  "commits": { "nodes": [
                    { "commit": { "statusCheckRollup": { "state": "PENDING" } } }
                  ]}
                }
              ]
            }
          }
        })
    }

    #[test]
    fn maps_core_fields() {
        let out = map_search_response(&fixture(), PrFilter::Mine).unwrap();
        assert_eq!(out.len(), 3);
        let first = &out[0];
        assert_eq!(first.id, 1001);
        assert_eq!(first.owner, "esparta");
        assert_eq!(first.repo, "scorehub-api");
        assert_eq!(first.number, 42);
        assert_eq!(first.title, "feat: add widget");
        assert_eq!(first.author, "csequeira");
        assert_eq!(first.html_url, "https://github.com/esparta/scorehub-api/pull/42");
        assert_eq!(first.changed_files, 7);
    }

    #[test]
    fn lowercases_state() {
        let out = map_search_response(&fixture(), PrFilter::Mine).unwrap();
        assert!(out.iter().all(|p| p.state == "open"));
    }

    #[test]
    fn normalizes_updated_at_to_rfc3339_offset() {
        let out = map_search_response(&fixture(), PrFilter::Mine).unwrap();
        // GitHub sends `…Z`; we re-emit the `+00:00` spelling the REST path used.
        assert_eq!(out[0].updated_at, "2026-08-24T12:00:00+00:00");
        assert_eq!(out[2].updated_at, "2026-08-22T18:45:12+00:00");
    }

    #[test]
    fn maps_ci_rollup_states() {
        let out = map_search_response(&fixture(), PrFilter::Mine).unwrap();
        assert_eq!(out[0].ci_status, CiStatus::Passing);
        // null rollup == "no checks on this commit" == None, matching the
        // REST behaviour this replaced.
        assert_eq!(out[1].ci_status, CiStatus::None);
        assert_eq!(out[2].ci_status, CiStatus::Pending);
    }

    #[test]
    fn rollup_state_covers_every_status_state() {
        assert_eq!(rollup_state_to_ci(Some("SUCCESS")), CiStatus::Passing);
        assert_eq!(rollup_state_to_ci(Some("PENDING")), CiStatus::Pending);
        assert_eq!(rollup_state_to_ci(Some("EXPECTED")), CiStatus::Pending);
        assert_eq!(rollup_state_to_ci(Some("FAILURE")), CiStatus::Failing);
        assert_eq!(rollup_state_to_ci(Some("ERROR")), CiStatus::Failing);
        assert_eq!(rollup_state_to_ci(None), CiStatus::None);
        assert_eq!(rollup_state_to_ci(Some("SOMETHING_NEW")), CiStatus::None);
    }

    #[test]
    fn filter_drives_is_mine_and_review_requested() {
        let mine = map_search_response(&fixture(), PrFilter::Mine).unwrap();
        assert!(mine.iter().all(|p| p.is_mine && !p.review_requested));

        let rr = map_search_response(&fixture(), PrFilter::ReviewRequested).unwrap();
        assert!(rr.iter().all(|p| !p.is_mine && p.review_requested));
    }

    #[test]
    fn missing_author_falls_back_to_empty_string() {
        let resp = serde_json::json!({
          "data": { "search": { "nodes": [{
            "databaseId": 5, "number": 1, "title": "t", "url": "u",
            "state": "OPEN", "updatedAt": "2026-08-24T12:00:00Z", "changedFiles": 0,
            "author": serde_json::Value::Null,
            "repository": { "name": "r", "owner": { "login": "o" } },
            "commits": { "nodes": [] }
          }]}}
        });
        let out = map_search_response(&resp, PrFilter::Mine).unwrap();
        assert_eq!(out[0].author, "");
        assert_eq!(out[0].ci_status, CiStatus::None);
    }

    #[test]
    fn empty_result_set_is_ok_not_error() {
        let resp = serde_json::json!({ "data": { "search": { "nodes": [] } } });
        assert!(map_search_response(&resp, PrFilter::Mine).unwrap().is_empty());
    }

    #[test]
    fn skips_non_pull_request_nodes() {
        // Inline fragments leave non-PullRequest search hits as `{}`.
        let resp = serde_json::json!({ "data": { "search": { "nodes": [{}] } } });
        assert!(map_search_response(&resp, PrFilter::Mine).unwrap().is_empty());
    }

    #[test]
    fn graphql_errors_bubble_up_instead_of_empty_list() {
        let resp = serde_json::json!({
          "data": serde_json::Value::Null,
          "errors": [{ "message": "Field 'changedFiles' doesn't exist" }]
        });
        let err = map_search_response(&resp, PrFilter::Mine).unwrap_err();
        assert!(matches!(err, AppError::Network(_)), "got {err:?}");
        assert!(err.to_string().contains("changedFiles"));
    }

    #[test]
    fn malformed_response_is_an_error_not_an_empty_list() {
        let resp = serde_json::json!({ "data": { "search": {} } });
        assert!(map_search_response(&resp, PrFilter::Mine).is_err());
    }
}
