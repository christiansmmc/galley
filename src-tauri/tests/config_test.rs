use pr_reviewer::config::types::{PathFilter, RepoConfig, Settings, ThemeChoice, UiPrefs};

#[test]
fn settings_default_serializes_clean() {
    let s = Settings::default();
    let toml = toml::to_string(&s).unwrap();
    assert!(toml.contains("theme = \"system\""));
}

#[test]
fn settings_roundtrips() {
    let s = Settings {
        ui: UiPrefs { theme: ThemeChoice::Dark, ..Default::default() },
        repos: vec![RepoConfig { owner: "esparta".into(), name: "scorehub-api".into() }],
        path_filters: vec![PathFilter {
            repo: "esparta/scorehub-api".into(),
            pattern: "src/test/**".into(),
            label: "Testes".into(),
            default_hidden: true,
        }],
    };
    let raw = toml::to_string(&s).unwrap();
    let parsed: Settings = toml::from_str(&raw).unwrap();
    assert_eq!(parsed.repos[0].full(), "esparta/scorehub-api");
    assert_eq!(parsed.ui.theme, ThemeChoice::Dark);
    assert_eq!(parsed.path_filters[0].default_hidden, true);
}
