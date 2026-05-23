use pr_reviewer::config::types::PathFilter;
use pr_reviewer::path_filter::match_path;

fn filter(pattern: &str) -> PathFilter {
    PathFilter {
        repo: "x/y".into(),
        pattern: pattern.into(),
        label: "G".into(),
        default_hidden: true,
    }
}

#[test]
fn matches_prefix_glob() {
    let f = filter("src/test/**");
    assert!(match_path(&f, "src/test/foo.rs"));
    assert!(match_path(&f, "src/test/nested/bar.rs"));
    assert!(!match_path(&f, "src/main.rs"));
}

#[test]
fn matches_extension_glob() {
    let f = filter("**/*.lock");
    assert!(match_path(&f, "Cargo.lock"));
    assert!(match_path(&f, "deep/nested/yarn.lock"));
    assert!(!match_path(&f, "src/main.rs"));
}

#[test]
fn no_match_when_pattern_invalid() {
    let f = filter("[invalid");
    assert!(!match_path(&f, "anything"));
}
