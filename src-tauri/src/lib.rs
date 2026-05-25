pub mod cache;
pub mod commands;
pub mod config;
pub mod drafts;
pub mod error;
pub mod github;
pub mod logging;
pub mod oauth;
pub mod path_filter;
pub mod repo_input;
pub mod secrets;
pub mod viewed;

use crate::cache::Cache;
use crate::config::types::Settings;
use crate::github::GitHubClient;
use octocrab::auth::DeviceCodes;
use octocrab::Octocrab;
use secrecy::SecretString;
use tokio::sync::RwLock;

/// In-flight OAuth device-login state.
///
/// Stashed by `start_device_login` (step 1) so `poll_device_login` (step 2)
/// can resume polling with the same configured client + device code. Cleared
/// once login succeeds or is abandoned.
pub struct PendingDeviceLogin {
    pub crab: Octocrab,
    pub client_id: SecretString,
    pub codes: DeviceCodes,
}

pub struct AppState {
    pub cache: Cache,
    pub settings: RwLock<Settings>,
    pub client: RwLock<Option<GitHubClient>>,
    pub device_login: RwLock<Option<PendingDeviceLogin>>,
}

impl AppState {
    pub fn new() -> crate::error::AppResult<Self> {
        Ok(Self {
            cache: Cache::open_at(crate::cache::default_path()?)?,
            settings: RwLock::new(crate::config::load()?),
            client: RwLock::new(None),
            device_login: RwLock::new(None),
        })
    }
}
