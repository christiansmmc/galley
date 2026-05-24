use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default)]
    pub ui: UiPrefs,
    #[serde(default)]
    pub repos: Vec<RepoConfig>,
    #[serde(default)]
    pub path_filters: Vec<PathFilter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiPrefs {
    pub theme: ThemeChoice,
    pub sidebar_collapsed: bool,
    pub filetree_collapsed: bool,
    pub sidebar_width: u32,
    pub filetree_width: u32,
    #[serde(default)]
    pub diff_render_mode: DiffRenderMode,
    #[serde(default = "default_true")]
    pub compact_paths: bool,
    #[serde(default)]
    pub density: Density,
    #[serde(default)]
    pub diff_font: DiffFont,
    #[serde(default)]
    pub palette_sources: PaletteSources,
    #[serde(default)]
    pub accent_color: AccentColor,
    #[serde(default = "default_creed")]
    pub creed: String,
}

fn default_true() -> bool { true }
fn default_creed() -> String { "lendo. sem resumos.".to_string() }

impl Default for UiPrefs {
    fn default() -> Self {
        Self {
            theme: ThemeChoice::System,
            sidebar_collapsed: false,
            filetree_collapsed: false,
            sidebar_width: 280,
            filetree_width: 320,
            diff_render_mode: DiffRenderMode::default(),
            compact_paths: true,
            density: Density::default(),
            diff_font: DiffFont::default(),
            palette_sources: PaletteSources::default(),
            accent_color: AccentColor::default(),
            creed: default_creed(),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum AccentColor {
    #[default]
    Sage,
    Ochre,
    Ink,
    Rust,
}

/// Which source types the command palette searches over.
/// Disabling a source hides its items entirely (the `>` command mode is
/// always available regardless of the toggles).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct PaletteSources {
    #[serde(default = "default_true")]
    pub prs: bool,
    #[serde(default = "default_true")]
    pub files: bool,
    #[serde(default = "default_true")]
    pub repos: bool,
    #[serde(default = "default_true")]
    pub commands: bool,
}

impl Default for PaletteSources {
    fn default() -> Self {
        Self { prs: true, files: true, repos: true, commands: true }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum Density {
    Compact,
    #[default]
    Comfortable,
    Spacious,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiffFont {
    pub size: u32,
    pub family: String,
}

impl Default for DiffFont {
    fn default() -> Self {
        Self { size: 13, family: "JetBrains Mono".into() }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ThemeChoice { Light, Dark, System }

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum DiffRenderMode {
    SideBySide,
    Inline,
    #[default]
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepoConfig {
    pub owner: String,
    pub name: String,
}

impl RepoConfig {
    pub fn full(&self) -> String { format!("{}/{}", self.owner, self.name) }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PathFilter {
    pub repo: String,
    pub pattern: String,
    pub label: String,
    pub default_hidden: bool,
}
