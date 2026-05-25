pub mod ttl;

use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const SCHEMA: &str = include_str!("schema.sql");

pub struct Cache {
    conn: Mutex<Connection>,
}

impl Cache {
    pub fn open_at(path: impl AsRef<Path>) -> AppResult<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
        let conn = Connection::open(path)?;
        let cache = Self { conn: Mutex::new(conn) };
        cache.migrate()?;
        Ok(cache)
    }

    pub fn open_in_memory() -> AppResult<Self> {
        let conn = Connection::open_in_memory()?;
        let cache = Self { conn: Mutex::new(conn) };
        cache.migrate()?;
        Ok(cache)
    }

    fn migrate(&self) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        conn.execute_batch(SCHEMA)?;
        // Upgrade older `drafts` schemas missing start_line/start_side columns.
        Self::add_column_if_missing(&conn, "drafts", "start_line", "INTEGER")?;
        Self::add_column_if_missing(&conn, "drafts", "start_side", "TEXT")?;
        Ok(())
    }

    fn add_column_if_missing(conn: &Connection, table: &str, column: &str, decl: &str) -> AppResult<()> {
        let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
        let names: Vec<String> = stmt
            .query_map([], |r| r.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .collect();
        if !names.iter().any(|n| n == column) {
            conn.execute(&format!("ALTER TABLE {table} ADD COLUMN {column} {decl}"), [])?;
        }
        Ok(())
    }

    pub fn with_conn<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T>,
    {
        let conn = self.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        f(&conn)
    }
}

pub fn default_path() -> AppResult<PathBuf> {
    Ok(crate::config::data_path()?.join("cache.db"))
}
