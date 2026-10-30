use pr_reviewer::config::types::{PathFilter, PrListTab, RepoConfig, Settings, ThemeChoice, UiPrefs};

#[test]
fn settings_default_serializes_clean() {
    let s = Settings::default();
    let toml = toml::to_string(&s).unwrap();
    assert!(toml.contains("theme = \"system\""));
}

const PREFS_WITHOUT_TAB: &str = r#"
    [ui]
    theme = "dark"
    sidebar_collapsed = false
    filetree_collapsed = false
    sidebar_width = 280
    filetree_width = 320

    [[repos]]
    owner = "esparta"
    name = "scorehub-api"
"#;

#[test]
fn settings_saved_before_pr_list_tab_existed_keep_loading() {
    let parsed: Settings = toml::from_str(PREFS_WITHOUT_TAB).unwrap();
    assert_eq!(parsed.ui.pr_list_tab, PrListTab::ReviewRequested);
    assert_eq!(parsed.repos[0].full(), "esparta/scorehub-api");
}

#[test]
fn pr_list_tab_uses_the_frontend_spelling() {
    for (raw, want) in [("mine", PrListTab::Mine), ("review_requested", PrListTab::ReviewRequested)] {
        let parsed: UiPrefs = toml::from_str(&format!(
            "theme = \"dark\"\nsidebar_collapsed = false\nfiletree_collapsed = false\nsidebar_width = 1\nfiletree_width = 1\npr_list_tab = \"{raw}\"\n",
        )).unwrap();
        assert_eq!(parsed.pr_list_tab, want);
    }
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
