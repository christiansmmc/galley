use pr_reviewer::cache::Cache;
use pr_reviewer::drafts::{create, delete, list, update};

#[test]
fn drafts_roundtrip() {
    let cache = Cache::open_in_memory().unwrap();

    let d1 = create(&cache, 100, "src/foo.rs", 12, "RIGHT", "looks wrong", None, None).unwrap();
    let d2 = create(&cache, 100, "src/bar.rs", 4, "RIGHT", "nit", None, None).unwrap();
    let _ = create(&cache, 999, "x.rs", 1, "RIGHT", "other pr", None, None).unwrap();

    let drafts = list(&cache, 100).unwrap();
    assert_eq!(drafts.len(), 2);
    assert!(drafts.iter().any(|d| d.id == d1.id));

    let updated = update(&cache, d1.id, "actually fine").unwrap();
    assert_eq!(updated.body, "actually fine");
    assert!(updated.start_line.is_none());

    delete(&cache, d2.id).unwrap();
    let remaining = list(&cache, 100).unwrap();
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].id, d1.id);
}

#[test]
fn drafts_range_persists_start_line_and_start_side() {
    let cache = Cache::open_in_memory().unwrap();
    let d = create(&cache, 5, "src/foo.rs", 14, "RIGHT", "range nit", Some(10), Some("RIGHT")).unwrap();
    assert_eq!(d.start_line, Some(10));
    assert_eq!(d.start_side.as_deref(), Some("RIGHT"));

    let listed = list(&cache, 5).unwrap();
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].start_line, Some(10));
    assert_eq!(listed[0].start_side.as_deref(), Some("RIGHT"));
}
