use pr_reviewer::cache::Cache;
use pr_reviewer::drafts::{create, delete, list, update};

#[test]
fn drafts_roundtrip() {
    let cache = Cache::open_in_memory().unwrap();

    let d1 = create(&cache, 100, "src/foo.rs", 12, "RIGHT", "looks wrong").unwrap();
    let d2 = create(&cache, 100, "src/bar.rs", 4, "RIGHT", "nit").unwrap();
    let _ = create(&cache, 999, "x.rs", 1, "RIGHT", "other pr").unwrap();

    let drafts = list(&cache, 100).unwrap();
    assert_eq!(drafts.len(), 2);
    assert!(drafts.iter().any(|d| d.id == d1.id));

    let updated = update(&cache, d1.id, "actually fine").unwrap();
    assert_eq!(updated.body, "actually fine");

    delete(&cache, d2.id).unwrap();
    let remaining = list(&cache, 100).unwrap();
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].id, d1.id);
}
