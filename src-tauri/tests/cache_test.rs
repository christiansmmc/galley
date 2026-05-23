use pr_reviewer::cache::Cache;

#[test]
fn opens_in_memory_and_runs_migrations() {
    let cache = Cache::open_in_memory().unwrap();
    cache.with_conn(|c| {
        let n: i64 = c
            .query_row("SELECT count(*) FROM sqlite_master WHERE type='table'", [], |r| r.get(0))
            .unwrap();
        assert!(n >= 4, "expected >=4 tables, got {n}");
        Ok(())
    }).unwrap();
}
