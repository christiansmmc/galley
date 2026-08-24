use pr_reviewer::cache::ttl::{
    get_blob, get_fresh_diff, get_fresh_list, get_fresh_pr, get_fresh_threads, invalidate_lists,
    invalidate_pr, invalidate_pr_by_handle, put_blob, put_diff, put_list, put_pr, put_threads,
    DETAIL_TTL_SECS, LIST_TTL_SECS,
};
use pr_reviewer::cache::Cache;

/// The `ttl::*` helpers are async now (they run their SQLite work on the
/// blocking pool via `Cache::with_conn_async`), so the tests need an executor.
/// `tauri::async_runtime::block_on` uses the same global runtime the app does,
/// which is also what makes `spawn_blocking` inside them resolvable.
fn block_on<F: std::future::Future>(f: F) -> F::Output {
    tauri::async_runtime::block_on(f)
}

#[test]
fn opens_in_memory_and_runs_migrations() {
    let cache = Cache::open_in_memory().unwrap();
    cache.with_conn(|c| {
        let n: i64 = c
            .query_row("SELECT count(*) FROM sqlite_master WHERE type='table'", [], |r| r.get(0))
            .unwrap();
        assert!(n >= 5, "expected >=5 tables (incl. pr_lists), got {n}");
        Ok(())
    }).unwrap();
}

#[test]
fn on_disk_cache_uses_wal_and_relaxed_sync() {
    let dir = std::env::temp_dir().join(format!("pr-reviewer-cache-test-{}", std::process::id()));
    let path = dir.join("cache.db");
    let _ = std::fs::remove_dir_all(&dir);
    let cache = Cache::open_at(&path).unwrap();
    cache.with_conn(|c| {
        let mode: String = c.query_row("PRAGMA journal_mode", [], |r| r.get(0)).unwrap();
        assert_eq!(mode.to_lowercase(), "wal");
        // synchronous NORMAL == 1
        let sync: i64 = c.query_row("PRAGMA synchronous", [], |r| r.get(0)).unwrap();
        assert_eq!(sync, 1, "expected synchronous = NORMAL (1)");
        Ok(())
    }).unwrap();
    drop(cache);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn in_memory_cache_stays_usable_without_wal() {
    // WAL needs a file to journal to; in-memory databases silently stay on
    // `memory`. Assert we didn't break them by trying.
    let cache = Cache::open_in_memory().unwrap();
    block_on(put_list(&cache, "mine", r#"[]"#)).unwrap();
    assert!(block_on(get_fresh_list(&cache, "mine", LIST_TTL_SECS)).unwrap().is_some());
}

#[test]
fn list_cache_roundtrip_within_ttl() {
    let cache = Cache::open_in_memory().unwrap();
    assert!(block_on(get_fresh_list(&cache, "mine", LIST_TTL_SECS)).unwrap().is_none());
    block_on(put_list(&cache, "mine", r#"[{"id":1}]"#)).unwrap();
    let hit = block_on(get_fresh_list(&cache, "mine", LIST_TTL_SECS)).unwrap();
    assert_eq!(hit.as_deref(), Some(r#"[{"id":1}]"#));
}

#[test]
fn list_cache_expires_when_ttl_zero() {
    let cache = Cache::open_in_memory().unwrap();
    block_on(put_list(&cache, "mine", r#"[]"#)).unwrap();
    // Force expiry by passing a TTL of -1s so the comparison fails.
    assert!(block_on(get_fresh_list(&cache, "mine", -1)).unwrap().is_none());
}

#[test]
fn pr_cache_roundtrip() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 42;
    assert!(block_on(get_fresh_pr(&cache, "o", "r", 7, DETAIL_TTL_SECS)).unwrap().is_none());
    block_on(put_pr(&cache, pr_id, "o", "r", 7, r#"{"title":"hi"}"#)).unwrap();
    let hit = block_on(get_fresh_pr(&cache, "o", "r", 7, DETAIL_TTL_SECS)).unwrap();
    assert_eq!(hit.as_deref(), Some(r#"{"title":"hi"}"#));
}

#[test]
fn diff_and_threads_roundtrip() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 99;
    block_on(put_diff(&cache, pr_id, r#"[{"path":"x"}]"#)).unwrap();
    assert_eq!(
        block_on(get_fresh_diff(&cache, pr_id, DETAIL_TTL_SECS)).unwrap().as_deref(),
        Some(r#"[{"path":"x"}]"#)
    );

    block_on(put_threads(&cache, pr_id, r#"[{"id":7}]"#)).unwrap();
    assert_eq!(
        block_on(get_fresh_threads(&cache, pr_id, DETAIL_TTL_SECS)).unwrap().as_deref(),
        Some(r#"[{"id":7}]"#)
    );
}

#[test]
fn invalidate_pr_wipes_all_rows() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 5;
    block_on(put_pr(&cache, pr_id, "o", "r", 1, r#"{}"#)).unwrap();
    block_on(put_diff(&cache, pr_id, r#"[]"#)).unwrap();
    block_on(put_threads(&cache, pr_id, r#"[]"#)).unwrap();

    block_on(invalidate_pr(&cache, pr_id)).unwrap();

    assert!(block_on(get_fresh_pr(&cache, "o", "r", 1, DETAIL_TTL_SECS)).unwrap().is_none());
    assert!(block_on(get_fresh_diff(&cache, pr_id, DETAIL_TTL_SECS)).unwrap().is_none());
    assert!(block_on(get_fresh_threads(&cache, pr_id, DETAIL_TTL_SECS)).unwrap().is_none());
}

/// Regression guard for the "opening a PR wipes the whole list cache" bug:
/// `invalidate_pr_by_handle` used to end with `DELETE FROM pr_lists`, so the
/// `refresh_pr` the UI fires on every PR open destroyed the (expensive) list
/// cache every single time. Its scope is now exactly one PR.
#[test]
fn invalidate_pr_by_handle_leaves_lists_alone() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 11;
    block_on(put_pr(&cache, pr_id, "o", "r", 3, r#"{}"#)).unwrap();
    block_on(put_list(&cache, "mine", r#"[]"#)).unwrap();

    block_on(invalidate_pr_by_handle(&cache, "o", "r", 3)).unwrap();

    assert!(block_on(get_fresh_pr(&cache, "o", "r", 3, DETAIL_TTL_SECS)).unwrap().is_none());
    assert!(
        block_on(get_fresh_list(&cache, "mine", LIST_TTL_SECS)).unwrap().is_some(),
        "invalidating one PR must not drop the list cache"
    );
}

#[test]
fn invalidate_lists_clears_every_list_key() {
    let cache = Cache::open_in_memory().unwrap();
    block_on(put_list(&cache, "mine|o/r", r#"[]"#)).unwrap();
    block_on(put_list(&cache, "review_requested|o/r", r#"[]"#)).unwrap();

    block_on(invalidate_lists(&cache)).unwrap();

    assert!(block_on(get_fresh_list(&cache, "mine|o/r", LIST_TTL_SECS)).unwrap().is_none());
    assert!(block_on(get_fresh_list(&cache, "review_requested|o/r", LIST_TTL_SECS)).unwrap().is_none());
}

#[test]
fn blob_round_trips_and_is_keyed_by_sha() {
    let cache = Cache::open_in_memory().unwrap();
    assert_eq!(block_on(get_blob(&cache, "abc", "src/x.rs")).unwrap(), None);
    block_on(put_blob(&cache, "abc", "src/x.rs", "hello\nworld")).unwrap();
    assert_eq!(
        block_on(get_blob(&cache, "abc", "src/x.rs")).unwrap(),
        Some("hello\nworld".to_string())
    );
    // Different sha for the same path is a miss (blobs are per-SHA).
    assert_eq!(block_on(get_blob(&cache, "def", "src/x.rs")).unwrap(), None);
}
