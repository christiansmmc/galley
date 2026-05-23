use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewThread {
    pub id: i64,
    pub path: String,
    pub line: Option<i64>,
    pub side: String,
    pub comments: Vec<ThreadComment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadComment {
    pub id: i64,
    pub author: String,
    pub body: String,
    pub created_at: String,
    pub in_reply_to_id: Option<i64>,
}

impl GitHubClient {
    pub async fn get_pr_threads(&self, owner: &str, repo: &str, number: u64) -> AppResult<Vec<ReviewThread>> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/comments?per_page=100");
        let items: Vec<serde_json::Value> = self.inner
            .get(route, None::<&()>).await
            .map_err(|e| AppError::Network(e.to_string()))?;
        use std::collections::HashMap;
        let mut threads: HashMap<i64, ReviewThread> = HashMap::new();
        for item in items {
            let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            let in_reply_to = item.get("in_reply_to_id").and_then(|v| v.as_i64());
            let path = item.get("path").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let line = item.get("line").and_then(|v| v.as_i64())
                .or_else(|| item.get("original_line").and_then(|v| v.as_i64()));
            let side = item.get("side").and_then(|v| v.as_str()).unwrap_or("RIGHT").to_string();
            let author = item.get("user").and_then(|u| u.get("login")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let body = item.get("body").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let created_at = item.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let root_id = in_reply_to.unwrap_or(id);
            let thread = threads.entry(root_id).or_insert(ReviewThread {
                id: root_id, path: path.clone(), line, side: side.clone(), comments: vec![],
            });
            thread.comments.push(ThreadComment {
                id, author, body, created_at, in_reply_to_id: in_reply_to,
            });
        }
        let mut out: Vec<_> = threads.into_values().collect();
        out.sort_by_key(|t| t.id);
        Ok(out)
    }
}
