pub mod models;
pub mod ttl;

use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

const SCHEMA: &str = include_str!("schema.sql");

/// How long SQLite will retry a locked database before giving up. Only
/// meaningful if a second connection ever appears (today there's exactly one,
/// serialised by the mutex), but it costs nothing and turns a future
/// `SQLITE_BUSY` into a wait instead of an error.
const BUSY_TIMEOUT_MS: u32 = 5_000;

pub struct Cache {
    /// `Arc` (not a bare `Mutex`) because [`Cache::with_conn_async`] hands the
    /// handle to a `spawn_blocking` task, which needs `'static` ownership.
    conn: Arc<Mutex<Connection>>,
}

impl Cache {
    pub fn open_at(path: impl AsRef<Path>) -> AppResult<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
        let conn = Connection::open(path)?;
        Self::apply_file_pragmas(&conn)?;
        let cache = Self { conn: Arc::new(Mutex::new(conn)) };
        cache.migrate()?;
        Ok(cache)
    }

    pub fn open_in_memory() -> AppResult<Self> {
        let conn = Connection::open_in_memory()?;
        // No WAL / no `synchronous` here: an in-memory database has no file to
        // journal to, so SQLite ignores `journal_mode = WAL` (it stays
        // `memory`) and `synchronous` is a no-op. Only the busy timeout has
        // any meaning, and even that is academic with a single connection.
        conn.busy_timeout(std::time::Duration::from_millis(BUSY_TIMEOUT_MS as u64))?;
        let cache = Self { conn: Arc::new(Mutex::new(conn)) };
        cache.migrate()?;
        Ok(cache)
    }

    /// Durability / concurrency pragmas for the on-disk cache.
    ///
    /// This database is a *cache*: every row is re-fetchable from GitHub, so
    /// trading crash-durability for latency is the right call.
    ///
    /// - `journal_mode = WAL`: writers stop blocking readers, and a commit
    ///   appends to the WAL instead of rewriting the rollback journal. Matters
    ///   here because `blobs` rows hold whole file contents.
    /// - `synchronous = NORMAL`: with WAL this skips the fsync on every
    ///   commit (checkpoints still sync). A power cut can lose the last few
    ///   commits — i.e. a few cache rows we'd refetch anyway.
    /// - `busy_timeout`: see [`BUSY_TIMEOUT_MS`].
    ///
    /// `journal_mode` is a query (it returns the resulting mode), so it goes
    /// through `execute_batch`, which steps over returned rows — `execute`
    /// would reject it with `ExecuteReturnedResults`.
    fn apply_file_pragmas(conn: &Connection) -> AppResult<()> {
        conn.execute_batch(&format!(
            "PRAGMA journal_mode = WAL;\n\
             PRAGMA synchronous = NORMAL;\n\
             PRAGMA busy_timeout = {BUSY_TIMEOUT_MS};"
        ))?;
        Ok(())
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

    /// Run `f` against the connection on the calling thread.
    ///
    /// Blocking. Fine from sync code and from tests; from an `async` Tauri
    /// command handler prefer [`Cache::with_conn_async`], which moves the work
    /// off the Tokio worker pool.
    pub fn with_conn<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T>,
    {
        let conn = self.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        f(&conn)
    }

    /// Async sibling of [`Cache::with_conn`]: runs `f` on a blocking thread.
    ///
    /// rusqlite is synchronous file I/O, and the mutex around the connection
    /// serialises every caller. Calling it straight from an `async fn` parks a
    /// Tokio *worker* thread — of which there are only as many as CPU cores —
    /// so one slow blob write stalls unrelated in-flight IPC commands. Pushing
    /// the closure onto the blocking pool keeps the async workers free.
    ///
    /// The closure must be `'static`, so callers pass owned values (e.g.
    /// `key.to_string()`) rather than borrowed `&str` parameters.
    pub async fn with_conn_async<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T> + Send + 'static,
        T: Send + 'static,
    {
        let conn = Arc::clone(&self.conn);
        tauri::async_runtime::spawn_blocking(move || {
            let guard = conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
            f(&guard)
        })
        .await
        .map_err(|e| AppError::Internal(format!("cache task panicked: {e}")))?
    }
}

pub fn default_path() -> AppResult<PathBuf> {
    Ok(crate::config::data_path()?.join("cache.db"))
}
