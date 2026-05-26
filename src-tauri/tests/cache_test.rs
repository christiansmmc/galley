use pr_reviewer::cache::ttl::{
    get_blob, get_fresh_diff, get_fresh_list, get_fresh_pr, get_fresh_threads, invalidate_pr,
    invalidate_pr_by_handle, put_blob, put_diff, put_list, put_pr, put_threads, DETAIL_TTL_SECS,
    LIST_TTL_SECS,
};
use pr_reviewer::cache::Cache;

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
fn list_cache_roundtrip_within_ttl() {
    let cache = Cache::open_in_memory().unwrap();
    assert!(get_fresh_list(&cache, "mine", LIST_TTL_SECS).unwrap().is_none());
    put_list(&cache, "mine", r#"[{"id":1}]"#).unwrap();
    let hit = get_fresh_list(&cache, "mine", LIST_TTL_SECS).unwrap();
    assert_eq!(hit.as_deref(), Some(r#"[{"id":1}]"#));
}

#[test]
fn list_cache_expires_when_ttl_zero() {
    let cache = Cache::open_in_memory().unwrap();
    put_list(&cache, "mine", r#"[]"#).unwrap();
    // Force expiry by passing a TTL of -1s so the comparison fails.
    assert!(get_fresh_list(&cache, "mine", -1).unwrap().is_none());
}

#[test]
fn pr_cache_roundtrip() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 42;
    assert!(get_fresh_pr(&cache, "o", "r", 7, DETAIL_TTL_SECS).unwrap().is_none());
    put_pr(&cache, pr_id, "o", "r", 7, r#"{"title":"hi"}"#).unwrap();
    let hit = get_fresh_pr(&cache, "o", "r", 7, DETAIL_TTL_SECS).unwrap();
    assert_eq!(hit.as_deref(), Some(r#"{"title":"hi"}"#));
}

#[test]
fn diff_and_threads_roundtrip() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 99;
    put_diff(&cache, pr_id, r#"[{"path":"x"}]"#).unwrap();
    assert_eq!(get_fresh_diff(&cache, pr_id, DETAIL_TTL_SECS).unwrap().as_deref(), Some(r#"[{"path":"x"}]"#));

    put_threads(&cache, pr_id, r#"[{"id":7}]"#).unwrap();
    assert_eq!(get_fresh_threads(&cache, pr_id, DETAIL_TTL_SECS).unwrap().as_deref(), Some(r#"[{"id":7}]"#));
}

#[test]
fn invalidate_pr_wipes_all_rows() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 5;
    put_pr(&cache, pr_id, "o", "r", 1, r#"{}"#).unwrap();
    put_diff(&cache, pr_id, r#"[]"#).unwrap();
    put_threads(&cache, pr_id, r#"[]"#).unwrap();

    invalidate_pr(&cache, pr_id).unwrap();

    assert!(get_fresh_pr(&cache, "o", "r", 1, DETAIL_TTL_SECS).unwrap().is_none());
    assert!(get_fresh_diff(&cache, pr_id, DETAIL_TTL_SECS).unwrap().is_none());
    assert!(get_fresh_threads(&cache, pr_id, DETAIL_TTL_SECS).unwrap().is_none());
}

#[test]
fn invalidate_pr_by_handle_clears_lists_too() {
    let cache = Cache::open_in_memory().unwrap();
    let pr_id = 11;
    put_pr(&cache, pr_id, "o", "r", 3, r#"{}"#).unwrap();
    put_list(&cache, "mine", r#"[]"#).unwrap();

    invalidate_pr_by_handle(&cache, "o", "r", 3).unwrap();

    assert!(get_fresh_pr(&cache, "o", "r", 3, DETAIL_TTL_SECS).unwrap().is_none());
    assert!(get_fresh_list(&cache, "mine", LIST_TTL_SECS).unwrap().is_none());
}

#[test]
fn blob_round_trips_and_is_keyed_by_sha() {
    let cache = Cache::open_in_memory().unwrap();
    assert_eq!(get_blob(&cache, "abc", "src/x.rs").unwrap(), None);
    put_blob(&cache, "abc", "src/x.rs", "hello\nworld").unwrap();
    assert_eq!(
        get_blob(&cache, "abc", "src/x.rs").unwrap(),
        Some("hello\nworld".to_string())
    );
    // Different sha for the same path is a miss (blobs are per-SHA).
    assert_eq!(get_blob(&cache, "def", "src/x.rs").unwrap(), None);
}
