//! Repo input parser. Accepts paste-friendly forms and returns (owner, name).
//!
//! Supported:
//! - `https://github.com/owner/repo[/<anything>]` (with or without trailing `.git`)
//! - `http://github.com/owner/repo[/...]`
//! - `git@github.com:owner/repo.git`
//! - `owner/repo`
//! - `owner repo` (space-separated)

pub fn parse(input: &str) -> Option<(String, String)> {
    let s = input.trim();
    if s.is_empty() { return None; }

    if let Some(rest) = s.strip_prefix("git@github.com:") {
        return split_owner_repo(rest, '/');
    }

    let url_body = s
        .strip_prefix("https://github.com/")
        .or_else(|| s.strip_prefix("http://github.com/"));
    if let Some(rest) = url_body {
        return split_owner_repo(rest, '/');
    }

    if s.contains('/') {
        return split_owner_repo(s, '/');
    }

    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() == 2 {
        return validate_pair(parts[0], parts[1]);
    }

    None
}

fn split_owner_repo(s: &str, sep: char) -> Option<(String, String)> {
    let mut it = s.splitn(3, sep);
    let owner = it.next()?;
    let repo = it.next()?;
    validate_pair(owner, repo)
}

fn validate_pair(owner: &str, repo: &str) -> Option<(String, String)> {
    let owner = owner.trim();
    let repo = repo.trim().trim_end_matches(".git");
    if !is_valid_owner(owner) { return None; }
    if !is_valid_repo(repo) { return None; }
    Some((owner.to_string(), repo.to_string()))
}

fn is_valid_owner(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 39
        && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
        && !s.starts_with('-')
        && !s.ends_with('-')
}

fn is_valid_repo(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 100
        && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn https_url() {
        assert_eq!(parse("https://github.com/esparta/scorehub-api"), Some(("esparta".into(), "scorehub-api".into())));
    }

    #[test]
    fn https_url_with_pr_path() {
        assert_eq!(parse("https://github.com/esparta/scorehub-api/pull/42"), Some(("esparta".into(), "scorehub-api".into())));
    }

    #[test]
    fn https_url_trailing_dot_git() {
        assert_eq!(parse("https://github.com/foo/bar.git"), Some(("foo".into(), "bar".into())));
    }

    #[test]
    fn http_url() {
        assert_eq!(parse("http://github.com/foo/bar"), Some(("foo".into(), "bar".into())));
    }

    #[test]
    fn ssh_url() {
        assert_eq!(parse("git@github.com:esparta/scorehub-api.git"), Some(("esparta".into(), "scorehub-api".into())));
    }

    #[test]
    fn ssh_url_no_dot_git() {
        assert_eq!(parse("git@github.com:foo/bar"), Some(("foo".into(), "bar".into())));
    }

    #[test]
    fn slash_short() {
        assert_eq!(parse("esparta/scorehub-api"), Some(("esparta".into(), "scorehub-api".into())));
    }

    #[test]
    fn space_separated() {
        assert_eq!(parse("esparta scorehub-api"), Some(("esparta".into(), "scorehub-api".into())));
    }

    #[test]
    fn trims_whitespace() {
        assert_eq!(parse("  foo/bar  "), Some(("foo".into(), "bar".into())));
    }

    #[test]
    fn repo_dots_underscores_dashes() {
        assert_eq!(parse("foo/my.repo_name-2"), Some(("foo".into(), "my.repo_name-2".into())));
    }

    #[test]
    fn empty_input_rejected() {
        assert_eq!(parse(""), None);
        assert_eq!(parse("   "), None);
    }

    #[test]
    fn missing_repo_rejected() {
        assert_eq!(parse("owner"), None);
        assert_eq!(parse("owner/"), None);
        assert_eq!(parse("/repo"), None);
    }

    #[test]
    fn invalid_owner_chars_rejected() {
        assert_eq!(parse("owner!/repo"), None);
        assert_eq!(parse("owner_with_underscore/repo"), None);
    }

    #[test]
    fn invalid_repo_chars_rejected() {
        assert_eq!(parse("foo/repo with space"), None);
        assert_eq!(parse("foo/repo!"), None);
    }

    #[test]
    fn owner_leading_or_trailing_dash_rejected() {
        assert_eq!(parse("-foo/bar"), None);
        assert_eq!(parse("foo-/bar"), None);
    }

    #[test]
    fn three_words_rejected() {
        assert_eq!(parse("a b c"), None);
    }

    #[test]
    fn three_slash_segments_take_first_two() {
        assert_eq!(parse("foo/bar/baz"), Some(("foo".into(), "bar".into())));
    }
}
