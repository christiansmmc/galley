pub mod cache;
pub mod commands;
pub mod config;
pub mod drafts;
pub mod error;
pub mod github;
pub mod logging;
pub mod path_filter;
pub mod secrets;

use crate::cache::Cache;
use crate::config::types::Settings;
use crate::github::GitHubClient;
use tokio::sync::RwLock;

pub struct AppState {
    pub cache: Cache,
    pub settings: RwLock<Settings>,
    pub client: RwLock<Option<GitHubClient>>,
}

impl AppState {
    pub fn new() -> crate::error::AppResult<Self> {
        Ok(Self {
            cache: Cache::open_at(crate::cache::default_path()?)?,
            settings: RwLock::new(crate::config::load()?),
            client: RwLock::new(None),
        })
    }
}
