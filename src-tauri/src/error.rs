use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "details")]
pub enum AppError {
    #[error("authentication failed: {0}")]
    Auth(String),

    #[error("rate limited until {reset_at}")]
    RateLimited { reset_at: String },

    #[error("network error: {0}")]
    Network(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("submit failed: {0}")]
    SubmitFailed(String),

    #[error("config error: {0}")]
    Config(String),

    #[error("cache error: {0}")]
    Cache(String),

    #[error("internal error: {0}")]
    Internal(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self { AppError::Internal(e.to_string()) }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self { AppError::Cache(e.to_string()) }
}

impl From<toml::de::Error> for AppError {
    fn from(e: toml::de::Error) -> Self { AppError::Config(e.to_string()) }
}

impl From<toml::ser::Error> for AppError {
    fn from(e: toml::ser::Error) -> Self { AppError::Config(e.to_string()) }
}

impl From<keyring::Error> for AppError {
    fn from(e: keyring::Error) -> Self { AppError::Auth(e.to_string()) }
}

pub type AppResult<T> = Result<T, AppError>;
