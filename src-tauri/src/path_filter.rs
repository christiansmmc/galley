use crate::config::types::PathFilter;
use glob::Pattern;

pub fn match_path(filter: &PathFilter, path: &str) -> bool {
    Pattern::new(&filter.pattern)
        .map(|p| p.matches(path))
        .unwrap_or(false)
}

pub fn matching_filter<'a>(filters: &'a [PathFilter], repo: &str, path: &str) -> Option<&'a PathFilter> {
    filters.iter().find(|f| f.repo == repo && match_path(f, path))
}
