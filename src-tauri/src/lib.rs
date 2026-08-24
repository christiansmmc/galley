pub mod cache;
pub mod commands;
pub mod config;
pub mod drafts;
pub mod error;
pub mod github;
pub mod logging;
pub mod path_filter;
pub mod repo_input;
pub mod secrets;
pub mod viewed;

use crate::cache::Cache;
use crate::config::types::Settings;
use crate::github::GitHubClient;
use std::time::Duration;
use tokio::sync::{watch, RwLock};

/// Upper bound on how long a command will sit waiting for the background
/// GitHub-client init before giving up and reporting "no client".
///
/// Only reachable in the first moments after launch, and only if the
/// `GET /user` call is genuinely slow. Bounded so a hung network can't wedge
/// an IPC command forever — the user gets a real error instead of a spinner
/// that never resolves.
const CLIENT_INIT_TIMEOUT: Duration = Duration::from_secs(15);

pub struct AppState {
    pub cache: Cache,
    pub settings: RwLock<Settings>,
    pub client: RwLock<Option<GitHubClient>>,
    /// Flips to `true` once the startup task has *finished trying* to build
    /// the GitHub client — success, failure, or "no PAT stored" alike.
    ///
    /// A `watch` channel rather than a `Notify` because it is level- not
    /// edge-triggered: a waiter that subscribes after the flip still sees
    /// `true` immediately, whereas a `Notify` signal fired before anyone
    /// waited would be lost and every later command would eat the full
    /// timeout.
    client_init: watch::Sender<bool>,
}

impl AppState {
    pub fn new() -> crate::error::AppResult<Self> {
        Ok(Self {
            cache: Cache::open_at(crate::cache::default_path()?)?,
            settings: RwLock::new(crate::config::load()?),
            client: RwLock::new(None),
            client_init: watch::channel(false).0,
        })
    }

    /// Called by the startup task once it has finished its attempt at building
    /// the GitHub client. Must run on every exit path, including the failure
    /// ones — otherwise commands would wait out [`CLIENT_INIT_TIMEOUT`] before
    /// reporting an error they could have reported instantly.
    pub fn mark_client_init_done(&self) {
        self.client_init.send_replace(true);
    }

    /// Resolve once the startup client init has settled (or the timeout hits).
    ///
    /// Returns immediately when init is already done, which is the case for
    /// all but the first fraction of a second of the app's life.
    pub async fn await_client_init(&self) {
        let mut rx = self.client_init.subscribe();
        // `borrow_and_update` marks the current value seen, so the `changed()`
        // below can't miss a flip that lands between these two lines.
        if *rx.borrow_and_update() {
            return;
        }
        let _ = tokio::time::timeout(CLIENT_INIT_TIMEOUT, rx.changed()).await;
    }
}
