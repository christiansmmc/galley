pub mod diffs;
pub mod prs;
pub mod reviews;
pub mod threads;

use crate::error::{AppError, AppResult};
use octocrab::Octocrab;
use std::sync::Arc;

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
