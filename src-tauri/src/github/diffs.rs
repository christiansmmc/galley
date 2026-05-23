use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub path: String,
    pub previous_path: Option<String>,
    pub status: String,
    pub additions: i64,
    pub deletions: i64,
    pub patch: Option<String>,
}

impl GitHubClient {
    pub async fn get_pr_diff(&self, owner: &str, repo: &str, number: u64) -> AppResult<Vec<FileDiff>> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/files?per_page=300");
        let files: Vec<serde_json::Value> = self.inner
            .get(route, None::<&()>)
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        Ok(files.into_iter().map(|f| FileDiff {
            path: f.get("filename").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            previous_path: f.get("previous_filename").and_then(|v| v.as_str()).map(|s| s.to_string()),
            status: f.get("status").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            additions: f.get("additions").and_then(|v| v.as_i64()).unwrap_or(0),
            deletions: f.get("deletions").and_then(|v| v.as_i64()).unwrap_or(0),
            patch: f.get("patch").and_then(|v| v.as_str()).map(|s| s.to_string()),
        }).collect())
    }
}
