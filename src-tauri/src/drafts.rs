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
}

fn now() -> String { chrono::Utc::now().to_rfc3339() }

pub fn create(cache: &Cache, pr_id: i64, path: &str, line: i64, side: &str, body: &str) -> AppResult<CommentDraft> {
    let created_at = now();
    cache.with_conn(|c| {
        c.execute(
            "INSERT INTO drafts (pr_id, path, line, side, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![pr_id, path, line, side, body, &created_at],
        )?;
        let id = c.last_insert_rowid();
        Ok(CommentDraft {
            id, pr_id,
            path: path.into(), line, side: side.into(),
            body: body.into(), created_at: created_at.clone(),
        })
    })
}

pub fn list(cache: &Cache, pr_id: i64) -> AppResult<Vec<CommentDraft>> {
    cache.with_conn(|c| {
        let mut stmt = c.prepare(
            "SELECT id, pr_id, path, line, side, body, created_at FROM drafts WHERE pr_id = ?1 ORDER BY id"
        )?;
        let rows = stmt.query_map([pr_id], |r| Ok(CommentDraft {
            id: r.get(0)?,
            pr_id: r.get(1)?,
            path: r.get(2)?,
            line: r.get(3)?,
            side: r.get(4)?,
            body: r.get(5)?,
            created_at: r.get(6)?,
        }))?;
        let out: Result<Vec<_>, _> = rows.collect();
        Ok(out?)
    })
}

pub fn update(cache: &Cache, id: i64, body: &str) -> AppResult<CommentDraft> {
    cache.with_conn(|c| {
        c.execute("UPDATE drafts SET body = ?1 WHERE id = ?2", rusqlite::params![body, id])?;
        let row = c.query_row(
            "SELECT id, pr_id, path, line, side, body, created_at FROM drafts WHERE id = ?1",
            [id],
            |r| Ok(CommentDraft {
                id: r.get(0)?, pr_id: r.get(1)?, path: r.get(2)?, line: r.get(3)?,
                side: r.get(4)?, body: r.get(5)?, created_at: r.get(6)?,
            }),
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
