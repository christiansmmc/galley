use crate::error::{AppError, AppResult};
use crate::github::{extract_github_error, GitHubClient};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MergeMethod {
    Merge,
    Squash,
    Rebase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeResult {
    pub merged: bool,
    pub sha: String,
    pub message: String,
}

impl GitHubClient {
    /// Merge a PR via `PUT /repos/{owner}/{repo}/pulls/{number}/merge`.
    ///
    /// `head_sha` is sent as `sha` so GitHub rejects the merge with 409 if the
    /// branch advanced since the PR was loaded (stale-head guard). Admin bypass
    /// is implicit: the endpoint applies this token's permissions, so a repo
    /// admin can merge a protection-blocked PR exactly as on the web UI; when
    /// bypass isn't allowed GitHub returns 405 and we surface the message.
    pub async fn merge_pr(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        method: MergeMethod,
        head_sha: &str,
    ) -> AppResult<MergeResult> {
        let payload = serde_json::json!({
            "merge_method": method,
            "sha": head_sha,
        });
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/merge");
        let resp: serde_json::Value = self
            .inner
            .put(route, Some(&payload))
            .await
            .map_err(|e| {
                let msg = extract_github_error(&e);
                tracing::error!(target: "pr_reviewer::github", error = %msg, "merge_pr failed");
                AppError::SubmitFailed(msg)
            })?;
        Ok(MergeResult {
            merged: resp.get("merged").and_then(|v| v.as_bool()).unwrap_or(false),
            sha: resp.get("sha").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            message: resp.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merge_method_serializes_lowercase() {
        assert_eq!(serde_json::to_string(&MergeMethod::Merge).unwrap(), "\"merge\"");
        assert_eq!(serde_json::to_string(&MergeMethod::Squash).unwrap(), "\"squash\"");
        assert_eq!(serde_json::to_string(&MergeMethod::Rebase).unwrap(), "\"rebase\"");
    }
}
