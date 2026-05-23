use crate::cache::Cache;
use crate::error::AppResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentDraft {
    pub id: i64,
    pub pr_id: i64,
    pub path: String,
    pub line: i64,
    pub side: String,
    pub body: String,
    pub created_at: String,
    /// For multi-line range comments. None for single-line drafts.
    pub start_line: Option<i64>,
    /// Defaults to the same side as `side` if not set. None for single-line drafts.
    pub start_side: Option<String>,
}

fn now() -> String { chrono::Utc::now().to_rfc3339() }

fn row_to_draft(r: &rusqlite::Row) -> rusqlite::Result<CommentDraft> {
    Ok(CommentDraft {
        id: r.get(0)?,
        pr_id: r.get(1)?,
        path: r.get(2)?,
        line: r.get(3)?,
        side: r.get(4)?,
        body: r.get(5)?,
        created_at: r.get(6)?,
        start_line: r.get(7)?,
        start_side: r.get(8)?,
    })
}

pub fn create(
    cache: &Cache,
    pr_id: i64,
    path: &str,
    line: i64,
    side: &str,
    body: &str,
    start_line: Option<i64>,
    start_side: Option<&str>,
) -> AppResult<CommentDraft> {
    let created_at = now();
    let start_side_owned = start_side.map(|s| s.to_string());
    cache.with_conn(|c| {
        c.execute(
            "INSERT INTO drafts (pr_id, path, line, side, body, created_at, start_line, start_side) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![pr_id, path, line, side, body, &created_at, start_line, &start_side_owned],
        )?;
        let id = c.last_insert_rowid();
        Ok(CommentDraft {
            id, pr_id,
            path: path.into(), line, side: side.into(),
            body: body.into(), created_at: created_at.clone(),
            start_line,
            start_side: start_side_owned.clone(),
        })
    })
}

pub fn list(cache: &Cache, pr_id: i64) -> AppResult<Vec<CommentDraft>> {
    cache.with_conn(|c| {
        let mut stmt = c.prepare(
            "SELECT id, pr_id, path, line, side, body, created_at, start_line, start_side \
             FROM drafts WHERE pr_id = ?1 ORDER BY id"
        )?;
        let rows = stmt.query_map([pr_id], row_to_draft)?;
        let out: Result<Vec<_>, _> = rows.collect();
        Ok(out?)
    })
}

pub fn update(cache: &Cache, id: i64, body: &str) -> AppResult<CommentDraft> {
    cache.with_conn(|c| {
        c.execute("UPDATE drafts SET body = ?1 WHERE id = ?2", rusqlite::params![body, id])?;
        let row = c.query_row(
            "SELECT id, pr_id, path, line, side, body, created_at, start_line, start_side \
             FROM drafts WHERE id = ?1",
            [id],
            row_to_draft,
        )?;
        Ok(row)
    })
}

pub fn delete(cache: &Cache, id: i64) -> AppResult<()> {
    cache.with_conn(|c| {
        c.execute("DELETE FROM drafts WHERE id = ?1", [id])?;
        Ok(())
    })
}
