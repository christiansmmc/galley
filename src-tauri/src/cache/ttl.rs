//! TTL-aware cache helpers used by Tauri command read-throughs.
//!
//! The schema stores ISO-8601 timestamps in `fetched_at` columns; we compare
//! them with `chrono::Utc::now()` to decide if a row is fresh.
//!
//! TTLs (from the etapa 2 spec, sub-phase 2.0):
//! - list endpoints: 60 s
//! - PR detail / diff / threads: 300 s
//!
//! Helpers return `Option<T>` — `None` means "miss, you must fetch upstream."
//! Writers must invalidate before writing fresh rows (see `invalidate_pr`).

use crate::cache::Cache;
use crate::error::AppResult;
use chrono::{DateTime, Utc};
use rusqlite::params;

pub const LIST_TTL_SECS: i64 = 60;
pub const DETAIL_TTL_SECS: i64 = 300;

fn is_fresh(fetched_at: &str, max_age_secs: i64) -> bool {
    let parsed: Option<DateTime<Utc>> = DateTime::parse_from_rfc3339(fetched_at)
        .ok()
        .map(|dt| dt.with_timezone(&Utc));
    match parsed {
        Some(dt) => {
            let age = Utc::now().signed_duration_since(dt).num_seconds();
            age >= 0 && age <= max_age_secs
        }
        None => false,
    }
}

fn now_iso() -> String { Utc::now().to_rfc3339() }

/// Read a payload from the `pr_lists` table if it's still fresh.
pub fn get_fresh_list(cache: &Cache, key: &str, max_age_secs: i64) -> AppResult<Option<String>> {
    cache.with_conn(|c| {
        let row: rusqlite::Result<(String, String)> = c.query_row(
            "SELECT payload_json, fetched_at FROM pr_lists WHERE key = ?1",
            params![key],
            |r| Ok((r.get(0)?, r.get(1)?)),
        );
        match row {
            Ok((payload, fetched_at)) if is_fresh(&fetched_at, max_age_secs) => Ok(Some(payload)),
            _ => Ok(None),
        }
    })
}

pub fn put_list(cache: &Cache, key: &str, payload_json: &str) -> AppResult<()> {
    let now = now_iso();
    cache.with_conn(|c| {
        c.execute(
            "INSERT INTO pr_lists (key, payload_json, fetched_at) VALUES (?1, ?2, ?3) \
             ON CONFLICT(key) DO UPDATE SET payload_json = excluded.payload_json, fetched_at = excluded.fetched_at",
            params![key, payload_json, now],
        )?;
        Ok(())
    })
}

/// Read PR detail row if fresh; returns the cached `payload_json`.
pub fn get_fresh_pr(cache: &Cache, owner: &str, repo: &str, number: u64, max_age_secs: i64) -> AppResult<Option<String>> {
    cache.with_conn(|c| {
        let row: rusqlite::Result<(String, String)> = c.query_row(
            "SELECT payload_json, fetched_at FROM prs WHERE owner = ?1 AND repo = ?2 AND number = ?3",
            params![owner, repo, number as i64],
            |r| Ok((r.get(0).unwrap_or_default(), r.get(1).unwrap_or_default())),
        );
        match row {
            Ok((payload, fetched_at)) if !payload.is_empty() && is_fresh(&fetched_at, max_age_secs) => Ok(Some(payload)),
            _ => Ok(None),
        }
    })
}

pub fn put_pr(
    cache: &Cache,
    pr_id: i64,
    owner: &str,
    repo: &str,
    number: u64,
    payload_json: &str,
) -> AppResult<()> {
    let now = now_iso();
    cache.with_conn(|c| {
        c.execute(
            "INSERT INTO prs (id, owner, repo, number, payload_json, fetched_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6) \
             ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, repo = excluded.repo, \
             number = excluded.number, payload_json = excluded.payload_json, fetched_at = excluded.fetched_at",
            params![pr_id, owner, repo, number as i64, payload_json, now],
        )?;
        Ok(())
    })
}

/// Diff stored as a single JSON blob in the `files` table under a synthetic
/// path `__bundle__`. We picked this over per-file rows because the diff is
/// fetched & rendered as a unit anyway, and we don't need partial reads.
pub fn get_fresh_diff(cache: &Cache, pr_id: i64, max_age_secs: i64) -> AppResult<Option<String>> {
    cache.with_conn(|c| {
        let row: rusqlite::Result<(String, String)> = c.query_row(
            "SELECT patch, status FROM files WHERE pr_id = ?1 AND path = '__bundle__'",
            params![pr_id],
            |r| Ok((r.get(0).unwrap_or_default(), r.get(1).unwrap_or_default())),
        );
        match row {
            Ok((payload, fetched_at)) if !payload.is_empty() && is_fresh(&fetched_at, max_age_secs) => Ok(Some(payload)),
            _ => Ok(None),
        }
    })
}

pub fn put_diff(cache: &Cache, pr_id: i64, payload_json: &str) -> AppResult<()> {
    let now = now_iso();
    cache.with_conn(|c| {
        // We stash `fetched_at` in the `status` column for the synthetic bundle
        // row; saves us a schema migration.
        c.execute(
            "INSERT INTO files (pr_id, path, status, additions, deletions, patch) \
             VALUES (?1, '__bundle__', ?2, 0, 0, ?3) \
             ON CONFLICT(pr_id, path) DO UPDATE SET status = excluded.status, patch = excluded.patch",
            params![pr_id, now, payload_json],
        )?;
        Ok(())
    })
}

/// Threads stored under a single synthetic row in `threads` table — same
/// rationale as the diff bundle.
pub fn get_fresh_threads(cache: &Cache, pr_id: i64, max_age_secs: i64) -> AppResult<Option<String>> {
    cache.with_conn(|c| {
        let row: rusqlite::Result<(String, String)> = c.query_row(
            "SELECT payload_json, side FROM threads WHERE pr_id = ?1 AND id < 0",
            params![pr_id],
            |r| Ok((r.get(0).unwrap_or_default(), r.get(1).unwrap_or_default())),
        );
        match row {
            Ok((payload, fetched_at)) if !payload.is_empty() && is_fresh(&fetched_at, max_age_secs) => Ok(Some(payload)),
            _ => Ok(None),
        }
    })
}

pub fn put_threads(cache: &Cache, pr_id: i64, payload_json: &str) -> AppResult<()> {
    let now = now_iso();
    cache.with_conn(|c| {
        // synthetic id = -pr_id keeps the bundle row unique per PR without
        // colliding with real comment ids (always positive from GitHub).
        let synthetic_id = -(pr_id.abs());
        c.execute(
            "INSERT INTO threads (id, pr_id, path, line, side, resolved, payload_json) \
             VALUES (?1, ?2, '__bundle__', 0, ?3, 0, ?4) \
             ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, side = excluded.side",
            params![synthetic_id, pr_id, now, payload_json],
        )?;
        Ok(())
    })
}

/// Invalidate every cached row tied to a PR — used by `refresh_pr`.
pub fn invalidate_pr(cache: &Cache, pr_id: i64) -> AppResult<()> {
    cache.with_conn(|c| {
        c.execute("DELETE FROM prs WHERE id = ?1", params![pr_id])?;
        c.execute("DELETE FROM files WHERE pr_id = ?1", params![pr_id])?;
        c.execute("DELETE FROM threads WHERE pr_id = ?1", params![pr_id])?;
        Ok(())
    })
}

/// Invalidate only the threads bundle row for a PR — used after the user
/// submits a review or replies to a thread, so the next read fetches the
/// fresh server-side state instead of waiting out the 5-min TTL.
pub fn invalidate_threads(cache: &Cache, pr_id: i64) -> AppResult<()> {
    cache.with_conn(|c| {
        c.execute("DELETE FROM threads WHERE pr_id = ?1", params![pr_id])?;
        Ok(())
    })
}

/// Hash-derived synthetic PR id used by the cache for the (owner, repo,
/// number) tuple. Centralised here so every caller (prs.rs, reviews.rs)
/// derives the same value for the same PR.
///
/// Masked to a positive i64 to avoid colliding with the negative synthetic
/// ids used for threads bundle rows.
pub fn synthetic_pr_id(owner: &str, repo: &str, number: u64) -> i64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    owner.hash(&mut h);
    repo.hash(&mut h);
    number.hash(&mut h);
    (h.finish() & 0x7fff_ffff_ffff_ffff) as i64
}

/// Invalidate by (owner, repo, number) — used when we don't know the PR id yet
/// (e.g. refresh_pr is called from the UI with the numeric handle).
pub fn invalidate_pr_by_handle(cache: &Cache, owner: &str, repo: &str, number: u64) -> AppResult<()> {
    let pr_id: Option<i64> = cache.with_conn(|c| {
        let r = c.query_row(
            "SELECT id FROM prs WHERE owner = ?1 AND repo = ?2 AND number = ?3",
            params![owner, repo, number as i64],
            |row| row.get::<_, i64>(0),
        );
        Ok(r.ok())
    })?;
    if let Some(id) = pr_id {
        invalidate_pr(cache, id)?;
    }
    // Also clear PR lists since a refresh likely means the user wants list freshness too.
    cache.with_conn(|c| {
        c.execute("DELETE FROM pr_lists", [])?;
        Ok(())
    })?;
    Ok(())
}
