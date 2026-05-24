use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewThread {
    pub id: i64,
    pub path: String,
    pub line: Option<i64>,
    pub side: String,
    /// For range threads, the file line where the range starts (inclusive).
    /// `None` for single-line threads. Both `start_line` and `start_side`
    /// are emitted by GitHub on the *first* comment of a range thread, so
    /// we read them only from that root comment.
    pub start_line: Option<i64>,
    pub start_side: Option<String>,
    /// GraphQL node id of the review thread. Required by the
    /// `resolveReviewThread` mutation; the REST endpoint doesn't surface it,
    /// so we enrich via a parallel GraphQL fetch in `get_pr_threads`.
    pub node_id: Option<String>,
    /// `true` when GitHub has the thread marked as resolved. Resolved threads
    /// are filtered out of the returned list by default.
    pub resolved: bool,
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
        let mut threads: HashMap<i64, ReviewThread> = HashMap::new();
        for item in items {
            let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            let in_reply_to = item.get("in_reply_to_id").and_then(|v| v.as_i64());
            let path = item.get("path").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let line = item.get("line").and_then(|v| v.as_i64())
                .or_else(|| item.get("original_line").and_then(|v| v.as_i64()));
            let side = item.get("side").and_then(|v| v.as_str()).unwrap_or("RIGHT").to_string();
            // start_line / start_side are only present on the root comment of
            // a range thread. We read them here and seed them into the entry
            // below; reply comments never carry them.
            let start_line = item.get("start_line").and_then(|v| v.as_i64())
                .or_else(|| item.get("original_start_line").and_then(|v| v.as_i64()));
            let start_side = item.get("start_side").and_then(|v| v.as_str()).map(|s| s.to_string());
            let author = item.get("user").and_then(|u| u.get("login")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let body = item.get("body").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let created_at = item.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let root_id = in_reply_to.unwrap_or(id);
            let thread = threads.entry(root_id).or_insert(ReviewThread {
                id: root_id, path: path.clone(), line,
                side: side.clone(),
                start_line, start_side: start_side.clone(),
                node_id: None,
                resolved: false,
                comments: vec![],
            });
            // If this is the root comment (id == root_id) and the entry
            // didn't already pick up start_line (e.g. a reply was inserted
            // first), backfill it here.
            if id == root_id {
                if thread.start_line.is_none() { thread.start_line = start_line; }
                if thread.start_side.is_none() { thread.start_side = start_side; }
            }
            thread.comments.push(ThreadComment {
                id, author, body, created_at, in_reply_to_id: in_reply_to,
            });
        }
        // Enrich threads with GraphQL-only fields (node_id + isResolved).
        // We map by the first comment's databaseId because that's the stable
        // root id we already keyed on above. Best-effort: if GraphQL fails
        // (network, scope, …) we serve the REST-only data and the resolve
        // button just won't fire.
        if let Ok(map) = self.fetch_thread_meta(owner, repo, number).await {
            for (root_id, meta) in map {
                if let Some(t) = threads.get_mut(&root_id) {
                    t.node_id = Some(meta.node_id);
                    t.resolved = meta.resolved;
                }
            }
        }

        // Etapa 3 · S6: keep resolved threads in the response. The UI dims
        // them (opacity 0.7) with a RESOLVIDO tag instead of hiding them,
        // so the reader sees prior conversation context without re-toggling
        // a filter.
        let mut out: Vec<_> = threads.into_values().collect();
        out.sort_by_key(|t| t.id);
        Ok(out)
    }

    async fn fetch_thread_meta(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> AppResult<HashMap<i64, ThreadMeta>> {
        let query = r#"
            query($owner: String!, $name: String!, $number: Int!) {
              repository(owner: $owner, name: $name) {
                pullRequest(number: $number) {
                  reviewThreads(first: 100) {
                    nodes {
                      id
                      isResolved
                      comments(first: 1) { nodes { databaseId } }
                    }
                  }
                }
              }
            }
        "#;
        let body = serde_json::json!({
            "query": query,
            "variables": { "owner": owner, "name": repo, "number": number },
        });
        let resp: serde_json::Value = self.inner
            .post::<_, serde_json::Value>("/graphql", Some(&body))
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        let mut out = HashMap::new();
        let nodes = resp
            .pointer("/data/repository/pullRequest/reviewThreads/nodes")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        for node in nodes {
            let node_id = node.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
            let resolved = node.get("isResolved").and_then(|v| v.as_bool()).unwrap_or(false);
            let root_db_id = node
                .pointer("/comments/nodes/0/databaseId")
                .and_then(|v| v.as_i64());
            if let (Some(id), Some(node_id)) = (root_db_id, node_id) {
                out.insert(id, ThreadMeta { node_id, resolved });
            }
        }
        Ok(out)
    }

    pub async fn resolve_thread(&self, thread_node_id: &str) -> AppResult<()> {
        let mutation = r#"
            mutation($id: ID!) {
              resolveReviewThread(input: { threadId: $id }) {
                thread { id isResolved }
              }
            }
        "#;
        let body = serde_json::json!({
            "query": mutation,
            "variables": { "id": thread_node_id },
        });
        let resp: serde_json::Value = self.inner
            .post::<_, serde_json::Value>("/graphql", Some(&body))
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        if let Some(errors) = resp.get("errors") {
            return Err(AppError::SubmitFailed(format!("resolve_thread: {errors}")));
        }
        Ok(())
    }
}

struct ThreadMeta {
    node_id: String,
    resolved: bool,
}
