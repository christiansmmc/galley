use pr_reviewer::cache::Cache;
use pr_reviewer::viewed::{list, mark};

#[test]
fn viewed_files_roundtrip() {
    let cache = Cache::open_in_memory().unwrap();

    mark(&cache, 7, "src/a.rs", true).unwrap();
    mark(&cache, 7, "src/b.rs", true).unwrap();
    mark(&cache, 99, "x.rs", true).unwrap();

    let mut paths = list(&cache, 7).unwrap();
    paths.sort();
    assert_eq!(paths, vec!["src/a.rs", "src/b.rs"]);

    // Idempotent insert.
    mark(&cache, 7, "src/a.rs", true).unwrap();
    assert_eq!(list(&cache, 7).unwrap().len(), 2);

    // Unmark drops the row.
    mark(&cache, 7, "src/a.rs", false).unwrap();
    assert_eq!(list(&cache, 7).unwrap(), vec!["src/b.rs".to_string()]);
}
