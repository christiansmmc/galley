use crate::error::AppResult;
use crate::github::{map_status_error, GitHubClient};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum OwnerKind {
    #[default]
    User,
    Organization,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteRepo {
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub fork: bool,
    pub archived: bool,
    pub private: bool,
    pub owner_type: OwnerKind,
    pub updated_at: String,
    pub stargazers_count: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
pub struct RepoBrowseFilters {
    #[serde(default = "default_true")]
    pub include_orgs: bool,
    #[serde(default)]
    pub include_forks: bool,
    #[serde(default)]
    pub include_archived: bool,
}

fn default_true() -> bool { true }

impl GitHubClient {
    /// Hit `/repos/{owner}/{repo}` and verify the PAT can reach it.
    pub async fn validate_repo(&self, owner: &str, repo: &str) -> AppResult<RemoteRepo> {
        let route = format!("/repos/{owner}/{repo}");
        let v: serde_json::Value = self.inner
            .get(route, None::<&()>).await
            .map_err(map_status_error)?;
        Ok(parse_repo(&v))
    }

    /// Count PRs opened in this repo over the last 365 days via the Search API.
    ///
    /// Uses `created:>=<date>` and reads `total_count` only — `per_page=1`
    /// keeps the payload minimal since we never look at the items. Search has
    /// its own (lower) rate limit, so callers should fan these out sparingly.
    pub async fn pr_count_last_year(&self, owner: &str, name: &str) -> AppResult<i64> {
        let since = (chrono::Utc::now() - chrono::Duration::days(365))
            .format("%Y-%m-%d")
            .to_string();
        let q = format!("repo:{owner}/{name} is:pr created:>={since}");
        let page = self.inner
            .search()
            .issues_and_pull_requests(&q)
            .per_page(1)
            .send()
            .await
            .map_err(map_status_error)?;
        Ok(page.total_count.unwrap_or(0) as i64)
    }

    /// Lazy-paginated `/user/repos` fetch. Caller passes `page` (1-based);
    /// we always request `per_page=100` and sort by `updated`.
    ///
    /// Affiliation is hard-coded to owner + collaborator + organization_member —
    /// `include_orgs=false` filters org-owned repos out client-side rather than
    /// dropping affiliation (so collaborator-on-org repos stay visible).
    pub async fn list_my_repos(
        &self,
        page: u32,
        filters: RepoBrowseFilters,
    ) -> AppResult<Vec<RemoteRepo>> {
        let route = format!(
            "/user/repos?per_page=100&sort=updated&page={}&affiliation=owner,collaborator,organization_member",
            page.max(1),
        );
        let arr: serde_json::Value = self.inner
            .get(route, None::<&()>).await
            .map_err(map_status_error)?;
        let items = arr.as_array().cloned().unwrap_or_default();
        let mut out = Vec::with_capacity(items.len());
        for v in items {
            let r = parse_repo(&v);
            if !filters.include_forks && r.fork { continue; }
            if !filters.include_archived && r.archived { continue; }
            if !filters.include_orgs && matches!(r.owner_type, OwnerKind::Organization) { continue; }
            out.push(r);
        }
        Ok(out)
    }
}

fn parse_repo(v: &serde_json::Value) -> RemoteRepo {
    let owner_obj = v.get("owner");
    let owner = owner_obj.and_then(|o| o.get("login")).and_then(|x| x.as_str()).unwrap_or("").to_string();
    let owner_type = match owner_obj.and_then(|o| o.get("type")).and_then(|x| x.as_str()).unwrap_or("User") {
        "Organization" => OwnerKind::Organization,
        _ => OwnerKind::User,
    };
    let name = v.get("name").and_then(|x| x.as_str()).unwrap_or("").to_string();
    let full_name = v.get("full_name").and_then(|x| x.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("{owner}/{name}"));
    let description = v.get("description").and_then(|x| x.as_str()).map(|s| s.to_string());
    let fork = v.get("fork").and_then(|x| x.as_bool()).unwrap_or(false);
    let archived = v.get("archived").and_then(|x| x.as_bool()).unwrap_or(false);
    let private = v.get("private").and_then(|x| x.as_bool()).unwrap_or(false);
    let updated_at = v.get("updated_at").and_then(|x| x.as_str()).unwrap_or("").to_string();
    let stargazers_count = v.get("stargazers_count").and_then(|x| x.as_i64()).unwrap_or(0);
    RemoteRepo {
        owner, name, full_name, description, fork, archived, private,
        owner_type, updated_at, stargazers_count,
    }
}
