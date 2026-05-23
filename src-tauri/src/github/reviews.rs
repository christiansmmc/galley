use crate::drafts::CommentDraft;
use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ReviewEvent { Approve, Comment, RequestChanges }

impl ReviewEvent {
    fn as_str(self) -> &'static str {
        match self {
            ReviewEvent::Approve => "APPROVE",
            ReviewEvent::Comment => "COMMENT",
            ReviewEvent::RequestChanges => "REQUEST_CHANGES",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewResult {
    pub review_id: i64,
    pub state: String,
    pub html_url: String,
}

impl GitHubClient {
    pub async fn submit_review(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        event: ReviewEvent,
        body: Option<&str>,
        drafts: &[CommentDraft],
    ) -> AppResult<ReviewResult> {
        let comments: Vec<serde_json::Value> = drafts.iter().map(|d| {
            let mut obj = serde_json::Map::new();
            obj.insert("path".into(), serde_json::Value::String(d.path.clone()));
            obj.insert("line".into(), serde_json::Value::from(d.line));
            obj.insert("side".into(), serde_json::Value::String(d.side.clone()));
            obj.insert("body".into(), serde_json::Value::String(d.body.clone()));
            // GitHub requires both start_line and start_side together for
            // multi-line range comments. Default start_side to `side` when
            // start_line is set but start_side isn't.
            if let Some(start_line) = d.start_line {
                obj.insert("start_line".into(), serde_json::Value::from(start_line));
                let ss = d.start_side.clone().unwrap_or_else(|| d.side.clone());
                obj.insert("start_side".into(), serde_json::Value::String(ss));
            }
            serde_json::Value::Object(obj)
        }).collect();
        let payload = serde_json::json!({
            "event": event.as_str(),
            "body": body.unwrap_or(""),
            "comments": comments,
        });
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/reviews");
        let resp: serde_json::Value = self.inner
            .post(route, Some(&payload)).await
            .map_err(|e| AppError::SubmitFailed(e.to_string()))?;
        Ok(ReviewResult {
            review_id: resp.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
            state: resp.get("state").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            html_url: resp.get("html_url").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }

    pub async fn reply_to_thread(&self, owner: &str, repo: &str, number: u64, in_reply_to: i64, body: &str) -> AppResult<()> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/comments");
        let payload = serde_json::json!({ "body": body, "in_reply_to": in_reply_to });
        let _: serde_json::Value = self.inner
            .post(route, Some(&payload)).await
            .map_err(|e| AppError::SubmitFailed(e.to_string()))?;
        Ok(())
    }
}
