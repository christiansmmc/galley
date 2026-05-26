use crate::error::{AppError, AppResult};
use crate::github::{map_status_error, GitHubClient};
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

    /// Fetch the full UTF-8 text of a file at a given git ref. Returns `None`
    /// when the file does not exist at that ref (404) or has no decodable text
    /// content (binary / too large). Used by the whole-file diff view.
    pub async fn get_file_content(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        git_ref: &str,
    ) -> AppResult<Option<String>> {
        let result = self
            .inner
            .repos(owner, repo)
            .get_content()
            .path(path)
            .r#ref(git_ref)
            .send()
            .await;
        let mut items = match result {
            Ok(items) => items,
            // Missing file at this ref (e.g. the head side of a deleted file) → no content.
            Err(octocrab::Error::GitHub { source, .. }) if source.status_code.as_u16() == 404 => {
                return Ok(None);
            }
            Err(e) => return Err(map_status_error(e)),
        };
        Ok(items
            .take_items()
            .into_iter()
            .next()
            .and_then(|c| c.decoded_content()))
    }
}
