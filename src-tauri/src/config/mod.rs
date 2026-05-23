pub mod types;
pub use types::*;

use crate::error::{AppError, AppResult};
use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

fn project_dirs() -> AppResult<ProjectDirs> {
    ProjectDirs::from("dev", "csequeira", "pr-reviewer")
        .ok_or_else(|| AppError::Config("no project dirs".into()))
}

pub fn config_path() -> AppResult<PathBuf> {
    let dirs = project_dirs()?;
    Ok(dirs.config_dir().join("config.toml"))
}

pub fn data_path() -> AppResult<PathBuf> {
    let dirs = project_dirs()?;
    Ok(dirs.data_dir().to_path_buf())
}

pub fn state_path() -> AppResult<PathBuf> {
    let dirs = project_dirs()?;
    Ok(dirs.state_dir()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| dirs.data_dir().to_path_buf()))
}

pub fn load() -> AppResult<Settings> {
    let p = config_path()?;
    if !p.exists() {
        return Ok(Settings::default());
    }
    let raw = fs::read_to_string(&p)?;
    Ok(toml::from_str(&raw)?)
}

pub fn save(settings: &Settings) -> AppResult<()> {
    let p = config_path()?;
    if let Some(parent) = p.parent() { fs::create_dir_all(parent)?; }
    let raw = toml::to_string_pretty(settings)?;
    fs::write(&p, raw)?;
    Ok(())
}
