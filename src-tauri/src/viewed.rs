use crate::cache::Cache;
use crate::error::AppResult;

pub fn list(cache: &Cache, pr_id: i64) -> AppResult<Vec<String>> {
    cache.with_conn(|c| {
        let mut stmt = c.prepare("SELECT path FROM viewed_files WHERE pr_id = ?1")?;
        let rows = stmt.query_map([pr_id], |r| r.get::<_, String>(0))?;
        let out: Result<Vec<_>, _> = rows.collect();
        Ok(out?)
    })
}

pub fn mark(cache: &Cache, pr_id: i64, path: &str, viewed: bool) -> AppResult<()> {
    cache.with_conn(|c| {
        if viewed {
            c.execute(
                "INSERT OR IGNORE INTO viewed_files (pr_id, path) VALUES (?1, ?2)",
                rusqlite::params![pr_id, path],
            )?;
        } else {
            c.execute(
                "DELETE FROM viewed_files WHERE pr_id = ?1 AND path = ?2",
                rusqlite::params![pr_id, path],
            )?;
        }
        Ok(())
    })
}
