pub mod diffs;
pub mod prs;
pub mod repos;
pub mod reviews;
pub mod threads;

use crate::error::{AppError, AppResult};
use octocrab::Octocrab;
use std::sync::Arc;

/// Pull the human-readable message out of an octocrab error.
///
/// Octocrab's Debug-formatting includes the GitHub JSON body when the
/// request hit a 4xx/5xx; Display often loses that detail.
pub(crate) fn extract_github_error(e: &octocrab::Error) -> String {
    let dbg = format!("{e:?}");
    if let octocrab::Error::GitHub { source, .. } = e {
        let msg = &source.message;
        let mut out = msg.clone();
        if !source.errors.as_ref().map(|v| v.is_empty()).unwrap_or(true) {
            if let Ok(detail) = serde_json::to_string(&source.errors) {
                out.push_str(" — ");
                out.push_str(&detail);
            }
        }
        return out;
    }
    dbg
}

/// Map an octocrab error's HTTP status into the closest AppError variant.
///
/// Used by repo lookup flows where 404 / 403 should bubble up as
/// `NotFound` (translated by the UI to "Repo não acessível com seu PAT")
/// rather than a generic `Network` error.
pub(crate) fn map_status_error(e: octocrab::Error) -> AppError {
    let msg = extract_github_error(&e);
    if let octocrab::Error::GitHub { source, .. } = &e {
        let code = source.status_code.as_u16();
        if code == 404 || code == 403 { return AppError::NotFound(msg); }
        if code == 401 { return AppError::Auth(msg); }
    }
    AppError::Network(msg)
}

#[derive(Clone)]
pub struct GitHubClient {
    pub(crate) inner: Arc<Octocrab>,
    pub(crate) user_login: String,
}

impl GitHubClient {
    pub async fn new(pat: &str) -> AppResult<Self> {
        let inner = Octocrab::builder()
            .personal_token(pat.to_string())
            .build()
            .map_err(|e| AppError::Auth(e.to_string()))?;
        let me = inner.current().user().await
            .map_err(|e| AppError::Auth(e.to_string()))?;
        Ok(Self { inner: Arc::new(inner), user_login: me.login })
    }

    #[doc(hidden)]
    pub fn test_with(oct: Octocrab, user_login: String) -> Self {
        Self { inner: Arc::new(oct), user_login }
    }
}
