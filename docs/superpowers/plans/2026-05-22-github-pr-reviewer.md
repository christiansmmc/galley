# PR Reviewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Linux desktop app (Tauri + React) that lists GitHub PRs the user authored or is requested to review, with a Monaco side-by-side diff, inline draft comments, batched review submission, and per-repo path filters.

**Architecture:** Tauri 2 shell with a Rust backend (octocrab, rusqlite, keyring, tracing) exposing typed IPC commands to a React + TypeScript frontend. The frontend renders a three-panel resizable layout (PR list / file tree / diff) using `react-resizable-panels` and Monaco's `DiffEditor`. State persistence and caching live in SQLite under `~/.local/share/pr-reviewer/cache.db`; configuration lives in `~/.config/pr-reviewer/config.toml`; the PAT lives in the OS keyring.

**Tech Stack:** Tauri 2.x, Rust 2021 (`octocrab`, `rusqlite` bundled, `keyring`, `tracing`, `tracing-subscriber`, `serde`, `toml`, `glob`, `thiserror`, `tokio`), React 18 + TypeScript, Vite, `react-resizable-panels`, `@monaco-editor/react`, `lucide-react`, Catppuccin (Latte + Mocha).

**Spec:** `docs/superpowers/specs/2026-05-22-github-pr-reviewer-design.md`

---

## File Structure

### Backend (`src-tauri/`)

```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── build.rs
└── src/
    ├── main.rs                 # tauri::Builder, command registration, app state
    ├── error.rs                # AppError enum + serde mapping for IPC
    ├── config/
    │   ├── mod.rs              # load/save config.toml, default config
    │   └── types.rs            # Settings, RepoConfig, PathFilter, UiPrefs
    ├── secrets.rs              # keyring wrapper (get/set/clear PAT)
    ├── cache/
    │   ├── mod.rs              # pool, migrations, read-through helpers
    │   ├── schema.sql          # CREATE TABLE statements
    │   └── models.rs           # rust structs <-> sqlite rows
    ├── github/
    │   ├── mod.rs              # GitHubClient (octocrab wrapper)
    │   ├── prs.rs              # list_prs / get_pr
    │   ├── diffs.rs            # get_pr_diff
    │   ├── threads.rs          # get_pr_threads
    │   └── reviews.rs          # submit_review, reply_to_thread
    ├── drafts.rs               # CRUD on the drafts table
    ├── path_filter.rs          # glob matching for path filters
    ├── logging.rs              # tracing setup + log path discovery
    └── commands/
        ├── mod.rs              # re-exports
        ├── prs.rs              # list_prs, get_pr, get_pr_diff, get_pr_threads, refresh_pr
        ├── drafts.rs           # draft_comment, list_drafts, update_draft, delete_draft
        ├── reviews.rs          # submit_review
        ├── repos.rs            # list_repos, add_repo, remove_repo
        ├── filters.rs          # get_path_filters, set_path_filters
        ├── settings.rs         # get_settings, set_settings
        └── secrets.rs          # set_pat, clear_pat
```

### Frontend (`src/`)

```
src/
├── main.tsx                    # React root + theme provider
├── App.tsx                     # top-level layout switch (Auth vs Main)
├── theme/
│   ├── catppuccin.ts           # palette tokens (Latte + Mocha)
│   ├── ThemeProvider.tsx       # provider + system preference watcher
│   └── monaco-themes.ts        # Monaco theme objects derived from Catppuccin
├── ipc/
│   ├── client.ts               # typed invoke<T>(cmd, args) wrapper
│   ├── types.ts                # mirrors backend serde types
│   └── errors.ts               # AppError tag → user message mapping
├── state/
│   ├── prsStore.ts             # zustand store: lists, current PR, selected file
│   ├── draftsStore.ts          # zustand store: drafts for current PR
│   └── settingsStore.ts        # zustand store: theme, repos, filters
├── components/
│   ├── layout/
│   │   ├── Layout.tsx          # three resizable panels + collapse logic
│   │   ├── PanelHeader.tsx     # title + collapse button
│   │   └── shortcuts.ts        # Ctrl+1/2/3 wiring
│   ├── prs/
│   │   ├── PrListPanel.tsx     # tabs (Mine, Review Requested) + groups + refresh
│   │   ├── PrListItem.tsx      # one PR row
│   │   └── PrHeader.tsx        # title, author, status, base/head
│   ├── files/
│   │   ├── FileTreePanel.tsx   # tree with path-filter groups
│   │   └── FileTreeNode.tsx    # recursive node
│   ├── diff/
│   │   ├── DiffPanel.tsx       # Monaco DiffEditor + view zones
│   │   ├── CommentViewZone.tsx # draft input rendered into a Monaco view zone
│   │   └── ThreadViewZone.tsx  # existing thread rendered into a Monaco view zone
│   ├── review/
│   │   └── ReviewSubmitModal.tsx
│   ├── settings/
│   │   ├── SettingsModal.tsx
│   │   ├── ReposSection.tsx
│   │   ├── FiltersSection.tsx
│   │   └── PatSection.tsx
│   └── common/
│       ├── Banner.tsx
│       ├── Toast.tsx
│       ├── Modal.tsx
│       └── Spinner.tsx
└── styles/
    └── globals.css             # Catppuccin CSS variables + Inter/JetBrains Mono
```

### Tests

```
src-tauri/tests/
├── config_test.rs
├── path_filter_test.rs
├── cache_test.rs
├── drafts_test.rs
└── github_test.rs              # uses wiremock

src/__tests__/
├── FileTreePanel.test.tsx
├── PrListPanel.test.tsx
└── ReviewSubmitModal.test.tsx
```

---

## Phase 0 — Bootstrap

### Task 1: Initialize Tauri 2 + React + TS project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/build.rs`

- [ ] **Step 1: Verify Rust + Node toolchain**

Run: `rustc --version && cargo --version && node --version && pnpm --version || npm --version`
Expected: rustc ≥ 1.75, node ≥ 20, pnpm or npm present.

- [ ] **Step 2: Scaffold Tauri project**

Run from `/home/christian/projects/pr-reviewer`:
```bash
pnpm create tauri-app@latest -- --template react-ts --manager pnpm --name pr-reviewer --identifier dev.csequeira.prreviewer --yes
```
This creates `package.json`, Vite config, `src-tauri/`, etc. Move generated files to the project root if scaffold creates a subdirectory; preserve the existing `docs/`.

- [ ] **Step 3: Verify dev build runs**

Run: `pnpm install && pnpm tauri dev`
Expected: Window opens with the Tauri default page. Close it.

- [ ] **Step 4: Replace default greet command with a healthcheck**

Replace `src-tauri/src/main.rs` body with:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn healthcheck() -> &'static str {
    "ok"
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![healthcheck])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Replace `src/App.tsx` body with:
```tsx
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("…");
  useEffect(() => {
    invoke<string>("healthcheck").then(setStatus);
  }, []);
  return <main style={{ padding: 16 }}>healthcheck: {status}</main>;
}
```

- [ ] **Step 5: Verify healthcheck works end-to-end**

Run: `pnpm tauri dev`
Expected: Window shows `healthcheck: ok`. Close it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri 2 + React + TS project"
```

---

### Task 2: Add backend dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add dependencies**

Edit `src-tauri/Cargo.toml` and add under `[dependencies]`:
```toml
octocrab = "0.42"
rusqlite = { version = "0.32", features = ["bundled"] }
keyring = "3"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-appender = "0.2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
glob = "0.3"
thiserror = "1"
tokio = { version = "1", features = ["full"] }
directories = "5"
chrono = { version = "0.4", features = ["serde"] }
async-trait = "0.1"
```

- [ ] **Step 2: Verify cargo builds**

Run: `cd src-tauri && cargo build`
Expected: clean build, possibly warnings about unused deps (acceptable for now).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: add backend dependencies"
```

---

### Task 3: Add frontend dependencies + global styles

**Files:**
- Modify: `package.json`
- Create: `src/styles/globals.css`, `src/theme/catppuccin.ts`
- Modify: `src/main.tsx`, `index.html`

- [ ] **Step 1: Install frontend deps**

Run:
```bash
pnpm add react-resizable-panels @monaco-editor/react monaco-editor lucide-react zustand
pnpm add -D @types/node vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create Catppuccin palette tokens**

Create `src/theme/catppuccin.ts`:
```ts
export const latte = {
  base: "#eff1f5", mantle: "#e6e9ef", crust: "#dce0e8",
  text: "#4c4f69", subtext1: "#5c5f77", subtext0: "#6c6f85",
  overlay2: "#7c7f93", overlay1: "#8c8fa1", overlay0: "#9ca0b0",
  surface2: "#acb0be", surface1: "#bcc0cc", surface0: "#ccd0da",
  rosewater: "#dc8a78", flamingo: "#dd7878", pink: "#ea76cb",
  mauve: "#8839ef", red: "#d20f39", maroon: "#e64553",
  peach: "#fe640b", yellow: "#df8e1d", green: "#40a02b",
  teal: "#179299", sky: "#04a5e5", sapphire: "#209fb5",
  blue: "#1e66f5", lavender: "#7287fd",
} as const;

export const mocha = {
  base: "#1e1e2e", mantle: "#181825", crust: "#11111b",
  text: "#cdd6f4", subtext1: "#bac2de", subtext0: "#a6adc8",
  overlay2: "#9399b2", overlay1: "#7f849c", overlay0: "#6c7086",
  surface2: "#585b70", surface1: "#45475a", surface0: "#313244",
  rosewater: "#f5e0dc", flamingo: "#f2cdcd", pink: "#f5c2e7",
  mauve: "#cba6f7", red: "#f38ba8", maroon: "#eba0ac",
  peach: "#fab387", yellow: "#f9e2af", green: "#a6e3a1",
  teal: "#94e2d5", sky: "#89dceb", sapphire: "#74c7ec",
  blue: "#89b4fa", lavender: "#b4befe",
} as const;

export type Palette = typeof latte;
```

- [ ] **Step 3: Create globals.css**

Create `src/styles/globals.css`:
```css
:root {
  --font-ui: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --radius: 5px;
  --pad: 12px;
  --gap: 8px;
  --transition: 150ms ease;
}

* { box-sizing: border-box; }

html, body, #root {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--font-ui);
  color: var(--c-text);
  background: var(--c-base);
}

body[data-theme="latte"] {
  --c-base: #eff1f5; --c-mantle: #e6e9ef; --c-crust: #dce0e8;
  --c-text: #4c4f69; --c-subtext: #5c5f77;
  --c-surface0: #ccd0da; --c-surface1: #bcc0cc; --c-surface2: #acb0be;
  --c-overlay: #8c8fa1;
  --c-accent: #8839ef; --c-blue: #1e66f5;
  --c-green: #40a02b; --c-amber: #df8e1d; --c-red: #d20f39;
}

body[data-theme="mocha"] {
  --c-base: #1e1e2e; --c-mantle: #181825; --c-crust: #11111b;
  --c-text: #cdd6f4; --c-subtext: #bac2de;
  --c-surface0: #313244; --c-surface1: #45475a; --c-surface2: #585b70;
  --c-overlay: #7f849c;
  --c-accent: #cba6f7; --c-blue: #89b4fa;
  --c-green: #a6e3a1; --c-amber: #f9e2af; --c-red: #f38ba8;
}
```

- [ ] **Step 4: Import globals in main.tsx**

Edit `src/main.tsx` to add `import "./styles/globals.css";` after the React import.

- [ ] **Step 5: Add web fonts**

Edit `index.html`, add inside `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 6: Verify it still runs**

Run: `pnpm tauri dev`
Expected: window opens, font is Inter, no console errors. Close.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add frontend deps, Catppuccin palette, globals.css"
```

---

## Phase 1 — Backend foundations

### Task 4: Error type

**Files:**
- Create: `src-tauri/src/error.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Create error module**

Create `src-tauri/src/error.rs`:
```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "details")]
pub enum AppError {
    #[error("authentication failed: {0}")]
    Auth(String),

    #[error("rate limited until {reset_at}")]
    RateLimited { reset_at: String },

    #[error("network error: {0}")]
    Network(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("submit failed: {0}")]
    SubmitFailed(String),

    #[error("config error: {0}")]
    Config(String),

    #[error("cache error: {0}")]
    Cache(String),

    #[error("internal error: {0}")]
    Internal(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self { AppError::Internal(e.to_string()) }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self { AppError::Cache(e.to_string()) }
}

impl From<toml::de::Error> for AppError {
    fn from(e: toml::de::Error) -> Self { AppError::Config(e.to_string()) }
}

impl From<toml::ser::Error> for AppError {
    fn from(e: toml::ser::Error) -> Self { AppError::Config(e.to_string()) }
}

impl From<keyring::Error> for AppError {
    fn from(e: keyring::Error) -> Self { AppError::Auth(e.to_string()) }
}

pub type AppResult<T> = Result<T, AppError>;
```

- [ ] **Step 2: Register module in main.rs**

Add `mod error;` near the top of `src-tauri/src/main.rs`.

- [ ] **Step 3: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/error.rs src-tauri/src/main.rs
git commit -m "feat(backend): add AppError enum with serde tag/content"
```

---

### Task 5: Config module — types + paths

**Files:**
- Create: `src-tauri/src/config/mod.rs`, `src-tauri/src/config/types.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Define config types**

Create `src-tauri/src/config/types.rs`:
```rust
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
}

impl Default for UiPrefs {
    fn default() -> Self {
        Self {
            theme: ThemeChoice::System,
            sidebar_collapsed: false,
            filetree_collapsed: false,
            sidebar_width: 280,
            filetree_width: 320,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ThemeChoice { Light, Dark, System }

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
    pub repo: String,           // "owner/name"
    pub pattern: String,        // glob pattern
    pub label: String,
    pub default_hidden: bool,
}
```

- [ ] **Step 2: Define load/save**

Create `src-tauri/src/config/mod.rs`:
```rust
pub mod types;
pub use types::*;

use crate::error::{AppError, AppResult};
use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

fn project_dirs() -> AppResult<ProjectDirs> {
    ProjectDirs::from("dev", "csequeira", "pr-reviewer")
        .ok_or_else(|| AppError::Config("no project dirs".into()))
}

pub fn config_path() -> AppResult<PathBuf> {
    let dirs = project_dirs()?;
    Ok(dirs.config_dir().join("config.toml"))
}

pub fn data_path() -> AppResult<PathBuf> {
    let dirs = project_dirs()?;
    Ok(dirs.data_dir().to_path_buf())
}

pub fn state_path() -> AppResult<PathBuf> {
    let dirs = project_dirs()?;
    Ok(dirs.state_dir()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| dirs.data_dir().to_path_buf()))
}

pub fn load() -> AppResult<Settings> {
    let p = config_path()?;
    if !p.exists() {
        return Ok(Settings::default());
    }
    let raw = fs::read_to_string(&p)?;
    Ok(toml::from_str(&raw)?)
}

pub fn save(settings: &Settings) -> AppResult<()> {
    let p = config_path()?;
    if let Some(parent) = p.parent() { fs::create_dir_all(parent)?; }
    let raw = toml::to_string_pretty(settings)?;
    fs::write(&p, raw)?;
    Ok(())
}
```

- [ ] **Step 3: Register module**

Add `mod config;` to `src-tauri/src/main.rs`.

- [ ] **Step 4: Write tests**

Create `src-tauri/tests/config_test.rs`:
```rust
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
```

For these tests to compile, expose the crate as a library. Edit `src-tauri/Cargo.toml`, add:
```toml
[lib]
name = "pr_reviewer"
path = "src/lib.rs"
```
Create `src-tauri/src/lib.rs`:
```rust
pub mod config;
pub mod error;
```
Then in `src-tauri/src/main.rs` replace `mod error;` and `mod config;` with `use pr_reviewer::{config, error};`.

- [ ] **Step 5: Run tests**

Run: `cd src-tauri && cargo test --test config_test`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(backend): config module with TOML load/save + tests"
```

---

### Task 6: Path filter module

**Files:**
- Create: `src-tauri/src/path_filter.rs`, `src-tauri/tests/path_filter_test.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write tests first**

Create `src-tauri/tests/path_filter_test.rs`:
```rust
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
```

- [ ] **Step 2: Run tests, watch them fail**

Run: `cd src-tauri && cargo test --test path_filter_test`
Expected: FAIL — `match_path` doesn't exist.

- [ ] **Step 3: Implement match_path**

Create `src-tauri/src/path_filter.rs`:
```rust
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
```

Add `pub mod path_filter;` to `src-tauri/src/lib.rs`.

- [ ] **Step 4: Run tests**

Run: `cd src-tauri && cargo test --test path_filter_test`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(backend): path_filter module + glob matching tests"
```

---

### Task 7: Secrets module (keyring PAT)

**Files:**
- Create: `src-tauri/src/secrets.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Implement secrets**

Create `src-tauri/src/secrets.rs`:
```rust
use crate::error::AppResult;
use keyring::Entry;

const SERVICE: &str = "pr-reviewer";
const ACCOUNT: &str = "github";

fn entry() -> AppResult<Entry> {
    Ok(Entry::new(SERVICE, ACCOUNT)?)
}

pub fn get_pat() -> AppResult<Option<String>> {
    match entry()?.get_password() {
        Ok(p) => Ok(Some(p)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn set_pat(token: &str) -> AppResult<()> {
    entry()?.set_password(token)?;
    Ok(())
}

pub fn clear_pat() -> AppResult<()> {
    match entry()?.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.into()),
    }
}
```

Add `pub mod secrets;` to `src-tauri/src/lib.rs`.

- [ ] **Step 2: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build.

- [ ] **Step 3: Commit**

(Skipping unit tests — keyring requires a live OS secret service which CI doesn't provide; covered by manual smoke.)

```bash
git add -A
git commit -m "feat(backend): secrets module wrapping OS keyring"
```

---

### Task 8: Cache module — schema + migrations

**Files:**
- Create: `src-tauri/src/cache/mod.rs`, `src-tauri/src/cache/schema.sql`, `src-tauri/src/cache/models.rs`, `src-tauri/tests/cache_test.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write the schema**

Create `src-tauri/src/cache/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS prs (
    id               INTEGER PRIMARY KEY,
    owner            TEXT NOT NULL,
    repo             TEXT NOT NULL,
    number           INTEGER NOT NULL,
    title            TEXT,
    state            TEXT,
    author           TEXT,
    is_mine          INTEGER,
    review_requested INTEGER,
    head_sha         TEXT,
    base_sha         TEXT,
    updated_at       TEXT,
    payload_json     TEXT,
    fetched_at       TEXT
);

CREATE TABLE IF NOT EXISTS files (
    pr_id      INTEGER,
    path       TEXT,
    status     TEXT,
    additions  INTEGER,
    deletions  INTEGER,
    patch      TEXT,
    PRIMARY KEY (pr_id, path)
);

CREATE TABLE IF NOT EXISTS threads (
    id           INTEGER PRIMARY KEY,
    pr_id        INTEGER,
    path         TEXT,
    line         INTEGER,
    side         TEXT,
    resolved     INTEGER,
    payload_json TEXT
);

CREATE TABLE IF NOT EXISTS drafts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id       INTEGER NOT NULL,
    path        TEXT NOT NULL,
    line        INTEGER NOT NULL,
    side        TEXT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prs_state    ON prs(state, is_mine, review_requested);
CREATE INDEX IF NOT EXISTS idx_threads_pr   ON threads(pr_id);
CREATE INDEX IF NOT EXISTS idx_drafts_pr    ON drafts(pr_id);
```

- [ ] **Step 2: Implement Cache struct**

Create `src-tauri/src/cache/mod.rs`:
```rust
pub mod models;

use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const SCHEMA: &str = include_str!("schema.sql");

pub struct Cache {
    conn: Mutex<Connection>,
}

impl Cache {
    pub fn open_at(path: impl AsRef<Path>) -> AppResult<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
        let conn = Connection::open(path)?;
        let cache = Self { conn: Mutex::new(conn) };
        cache.migrate()?;
        Ok(cache)
    }

    pub fn open_in_memory() -> AppResult<Self> {
        let conn = Connection::open_in_memory()?;
        let cache = Self { conn: Mutex::new(conn) };
        cache.migrate()?;
        Ok(cache)
    }

    fn migrate(&self) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        conn.execute_batch(SCHEMA)?;
        Ok(())
    }

    pub fn with_conn<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T>,
    {
        let conn = self.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        f(&conn)
    }
}

pub fn default_path() -> AppResult<PathBuf> {
    Ok(crate::config::data_path()?.join("cache.db"))
}
```

- [ ] **Step 3: Create models stub**

Create `src-tauri/src/cache/models.rs`:
```rust
// Row structs are added as each query is introduced. Empty for now.
```

Add `pub mod cache;` to `src-tauri/src/lib.rs`.

- [ ] **Step 4: Write cache test**

Create `src-tauri/tests/cache_test.rs`:
```rust
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
```

- [ ] **Step 5: Run tests**

Run: `cd src-tauri && cargo test --test cache_test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(backend): SQLite cache with schema migrations"
```

---

### Task 9: Logging module

**Files:**
- Create: `src-tauri/src/logging.rs`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`

- [ ] **Step 1: Implement logging setup**

Create `src-tauri/src/logging.rs`:
```rust
use crate::config;
use crate::error::AppResult;
use std::path::PathBuf;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

pub fn log_dir() -> AppResult<PathBuf> { config::state_path() }

pub fn init() -> AppResult<tracing_appender::non_blocking::WorkerGuard> {
    let dir = log_dir()?;
    std::fs::create_dir_all(&dir)?;
    let appender = RollingFileAppender::new(Rotation::NEVER, &dir, "log.txt");
    let (nb, guard) = tracing_appender::non_blocking(appender);
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(fmt::layer().with_writer(nb).with_ansi(false))
        .with(fmt::layer().with_writer(std::io::stderr))
        .init();
    Ok(guard)
}
```

Add `pub mod logging;` to `src-tauri/src/lib.rs`.

- [ ] **Step 2: Call init from main**

Edit `src-tauri/src/main.rs` `fn main()`:
```rust
fn main() {
    let _guard = pr_reviewer::logging::init().expect("logging init failed");
    tracing::info!("starting pr-reviewer");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![healthcheck])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Smoke check**

Run: `pnpm tauri dev`
Expected: window opens; `~/.local/state/pr-reviewer/log.txt` exists and contains `starting pr-reviewer`. Close.

Check: `cat ~/.local/state/pr-reviewer/log.txt`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(backend): tracing logger writing to XDG state dir"
```

---

## Phase 2 — GitHub client

### Task 10: GitHubClient skeleton

**Files:**
- Create: `src-tauri/src/github/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Implement client wrapper**

Create `src-tauri/src/github/mod.rs`:
```rust
pub mod prs;
pub mod diffs;
pub mod threads;
pub mod reviews;

use crate::error::{AppError, AppResult};
use octocrab::Octocrab;
use std::sync::Arc;

#[derive(Clone)]
pub struct GitHubClient {
    pub(crate) inner: Arc<Octocrab>,
    pub(crate) user_login: String,
}

impl GitHubClient {
    pub async fn new(pat: &str) -> AppResult<Self> {
        let inner = Octocrab::builder()
            .personal_token(pat.to_string())
            .build()
            .map_err(|e| AppError::Auth(e.to_string()))?;
        let me = inner.current().user().await
            .map_err(|e| AppError::Auth(e.to_string()))?;
        Ok(Self { inner: Arc::new(inner), user_login: me.login })
    }
}
```

Create empty placeholder files:
- `src-tauri/src/github/prs.rs`: `// see task 11`
- `src-tauri/src/github/diffs.rs`: `// see task 13`
- `src-tauri/src/github/threads.rs`: `// see task 14`
- `src-tauri/src/github/reviews.rs`: `// see task 17`

Add `pub mod github;` to `src-tauri/src/lib.rs`.

- [ ] **Step 2: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build (warnings allowed).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): GitHubClient skeleton with authenticated user fetch"
```

---

### Task 11: list_prs implementation

**Files:**
- Modify: `src-tauri/src/github/prs.rs`
- Modify: `src-tauri/src/github/mod.rs`

- [ ] **Step 1: Define DTOs**

Replace `src-tauri/src/github/prs.rs`:
```rust
use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrSummary {
    pub id: i64,
    pub owner: String,
    pub repo: String,
    pub number: u64,
    pub title: String,
    pub author: String,
    pub state: String,
    pub updated_at: String,
    pub html_url: String,
    pub is_mine: bool,
    pub review_requested: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum PrFilter { Mine, ReviewRequested }

impl GitHubClient {
    pub async fn list_prs(&self, filter: PrFilter, repos: &[(String, String)]) -> AppResult<Vec<PrSummary>> {
        if repos.is_empty() { return Ok(vec![]); }
        let qualifier = match filter {
            PrFilter::Mine => format!("author:{}", self.user_login),
            PrFilter::ReviewRequested => format!("review-requested:{}", self.user_login),
        };
        let repo_q = repos.iter()
            .map(|(o, n)| format!("repo:{o}/{n}"))
            .collect::<Vec<_>>()
            .join(" ");
        let q = format!("is:pr is:open {qualifier} {repo_q}");
        let page = self.inner
            .search()
            .issues_and_pull_requests(&q)
            .per_page(100)
            .send()
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        let mut out = Vec::with_capacity(page.items.len());
        for item in page.items {
            let url = item.html_url.to_string();
            let parts: Vec<&str> = url.split('/').collect();
            let owner = parts.get(3).copied().unwrap_or("").to_string();
            let repo = parts.get(4).copied().unwrap_or("").to_string();
            let is_mine = matches!(filter, PrFilter::Mine);
            let review_requested = matches!(filter, PrFilter::ReviewRequested);
            out.push(PrSummary {
                id: item.id.0 as i64,
                owner,
                repo,
                number: item.number,
                title: item.title,
                author: item.user.map(|u| u.login).unwrap_or_default(),
                state: format!("{:?}", item.state).to_lowercase(),
                updated_at: item.updated_at.to_rfc3339(),
                html_url: url,
                is_mine,
                review_requested,
            });
        }
        Ok(out)
    }
}
```

- [ ] **Step 2: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build. If octocrab API has changed for any field, adjust to current crate version (check `cargo doc --open --package octocrab` if needed).

- [ ] **Step 3: Commit**

(Integration test is added in Task 12 with wiremock.)

```bash
git add -A
git commit -m "feat(github): list_prs via search API"
```

---

### Task 12: list_prs integration test with wiremock

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/tests/github_test.rs`, `src-tauri/tests/fixtures/search_issues_mine.json`

- [ ] **Step 1: Add wiremock dev-dep**

Edit `src-tauri/Cargo.toml`, add:
```toml
[dev-dependencies]
wiremock = "0.6"
tokio = { version = "1", features = ["full", "macros"] }
```

- [ ] **Step 2: Create fixture**

Create `src-tauri/tests/fixtures/search_issues_mine.json`:
```json
{
  "total_count": 1,
  "incomplete_results": false,
  "items": [
    {
      "id": 1,
      "node_id": "n1",
      "number": 42,
      "title": "Test PR",
      "state": "open",
      "html_url": "https://github.com/esparta/scorehub-api/pull/42",
      "url": "https://api.github.com/repos/esparta/scorehub-api/issues/42",
      "user": { "login": "csequeira", "id": 1, "node_id": "u1", "avatar_url": "https://x", "url": "https://api.github.com/users/csequeira", "html_url": "https://github.com/csequeira", "type": "User", "site_admin": false, "events_url": "", "followers_url": "", "following_url": "", "gists_url": "", "gravatar_id": "", "organizations_url": "", "received_events_url": "", "repos_url": "", "starred_url": "", "subscriptions_url": "" },
      "labels": [],
      "comments": 0,
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-21T10:00:00Z",
      "closed_at": null,
      "pull_request": { "url": "https://api.github.com/repos/esparta/scorehub-api/pulls/42", "html_url": "https://github.com/esparta/scorehub-api/pull/42", "diff_url": "https://github.com/esparta/scorehub-api/pull/42.diff", "patch_url": "https://github.com/esparta/scorehub-api/pull/42.patch", "merged_at": null },
      "score": 1.0,
      "locked": false,
      "author_association": "OWNER",
      "events_url": "",
      "labels_url": "",
      "comments_url": "",
      "repository_url": "https://api.github.com/repos/esparta/scorehub-api"
    }
  ]
}
```

- [ ] **Step 3: Write integration test**

Create `src-tauri/tests/github_test.rs`:
```rust
use pr_reviewer::github::prs::PrFilter;
use pr_reviewer::github::GitHubClient;
use wiremock::matchers::{method, path, query_param_contains};
use wiremock::{Mock, MockServer, ResponseTemplate};

async fn client_against(server: &MockServer) -> GitHubClient {
    // Override the base URL by constructing octocrab manually.
    let oct = octocrab::Octocrab::builder()
        .base_uri(server.uri()).unwrap()
        .personal_token("test_pat".to_string())
        .build().unwrap();
    let me = serde_json::json!({ "login": "csequeira", "id": 1 });
    Mock::given(method("GET")).and(path("/user"))
        .respond_with(ResponseTemplate::new(200).set_body_json(me))
        .mount(server).await;
    GitHubClient::test_with(oct, "csequeira".into())
}

#[tokio::test]
async fn list_prs_mine_parses_fixture() {
    let server = MockServer::start().await;
    let body = include_str!("fixtures/search_issues_mine.json");
    Mock::given(method("GET")).and(path("/search/issues"))
        .and(query_param_contains("q", "author:csequeira"))
        .respond_with(ResponseTemplate::new(200).set_body_string(body))
        .mount(&server).await;

    let client = client_against(&server).await;
    let prs = client.list_prs(
        PrFilter::Mine,
        &[("esparta".into(), "scorehub-api".into())],
    ).await.unwrap();

    assert_eq!(prs.len(), 1);
    assert_eq!(prs[0].number, 42);
    assert_eq!(prs[0].owner, "esparta");
    assert_eq!(prs[0].repo, "scorehub-api");
    assert!(prs[0].is_mine);
}
```

- [ ] **Step 4: Add test-only constructor**

Edit `src-tauri/src/github/mod.rs`, append inside the `impl GitHubClient` block:
```rust
    #[doc(hidden)]
    pub fn test_with(oct: octocrab::Octocrab, user_login: String) -> Self {
        Self { inner: std::sync::Arc::new(oct), user_login }
    }
```

- [ ] **Step 5: Run the test**

Run: `cd src-tauri && cargo test --test github_test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test(github): list_prs integration test with wiremock"
```

---

### Task 13: get_pr_diff implementation

**Files:**
- Modify: `src-tauri/src/github/diffs.rs`

- [ ] **Step 1: Implement**

Replace `src-tauri/src/github/diffs.rs`:
```rust
use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub path: String,
    pub previous_path: Option<String>,
    pub status: String,
    pub additions: i64,
    pub deletions: i64,
    pub patch: Option<String>,
}

impl GitHubClient {
    pub async fn get_pr_diff(&self, owner: &str, repo: &str, number: u64) -> AppResult<Vec<FileDiff>> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/files?per_page=300");
        let files: Vec<serde_json::Value> = self.inner
            .get(route, None::<&()>)
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        Ok(files.into_iter().map(|f| FileDiff {
            path: f.get("filename").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            previous_path: f.get("previous_filename").and_then(|v| v.as_str()).map(|s| s.to_string()),
            status: f.get("status").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            additions: f.get("additions").and_then(|v| v.as_i64()).unwrap_or(0),
            deletions: f.get("deletions").and_then(|v| v.as_i64()).unwrap_or(0),
            patch: f.get("patch").and_then(|v| v.as_str()).map(|s| s.to_string()),
        }).collect())
    }
}
```

- [ ] **Step 2: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(github): get_pr_diff returning unified patches per file"
```

---

### Task 14: get_pr + get_pr_threads

**Files:**
- Modify: `src-tauri/src/github/prs.rs`, `src-tauri/src/github/threads.rs`

- [ ] **Step 1: Add get_pr method**

Append to `src-tauri/src/github/prs.rs`:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrDetail {
    pub summary: PrSummary,
    pub body: Option<String>,
    pub head_sha: String,
    pub base_sha: String,
    pub draft: bool,
    pub mergeable: Option<bool>,
}

impl GitHubClient {
    pub async fn get_pr(&self, owner: &str, repo: &str, number: u64) -> AppResult<PrDetail> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}");
        let pr: serde_json::Value = self.inner
            .get(route, None::<&()>).await
            .map_err(|e| AppError::Network(e.to_string()))?;
        let id = pr.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
        let updated_at = pr.get("updated_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let title = pr.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let author = pr.get("user").and_then(|u| u.get("login")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let head_sha = pr.get("head").and_then(|h| h.get("sha")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let base_sha = pr.get("base").and_then(|b| b.get("sha")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let body = pr.get("body").and_then(|v| v.as_str()).map(|s| s.to_string());
        let state = pr.get("state").and_then(|v| v.as_str()).unwrap_or("open").to_string();
        let draft = pr.get("draft").and_then(|v| v.as_bool()).unwrap_or(false);
        let mergeable = pr.get("mergeable").and_then(|v| v.as_bool());
        let html_url = pr.get("html_url").and_then(|v| v.as_str()).unwrap_or("").to_string();
        Ok(PrDetail {
            summary: PrSummary {
                id, owner: owner.into(), repo: repo.into(), number,
                title, author, state, updated_at, html_url,
                is_mine: false, review_requested: false,
            },
            body, head_sha, base_sha, draft, mergeable,
        })
    }
}
```

- [ ] **Step 2: Add threads module**

Replace `src-tauri/src/github/threads.rs`:
```rust
use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewThread {
    pub id: i64,
    pub path: String,
    pub line: Option<i64>,
    pub side: String,
    pub comments: Vec<ThreadComment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadComment {
    pub id: i64,
    pub author: String,
    pub body: String,
    pub created_at: String,
    pub in_reply_to_id: Option<i64>,
}

impl GitHubClient {
    pub async fn get_pr_threads(&self, owner: &str, repo: &str, number: u64) -> AppResult<Vec<ReviewThread>> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/comments?per_page=100");
        let items: Vec<serde_json::Value> = self.inner
            .get(route, None::<&()>).await
            .map_err(|e| AppError::Network(e.to_string()))?;
        // Group by in_reply_to chain.
        use std::collections::HashMap;
        let mut threads: HashMap<i64, ReviewThread> = HashMap::new();
        for item in items {
            let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            let in_reply_to = item.get("in_reply_to_id").and_then(|v| v.as_i64());
            let path = item.get("path").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let line = item.get("line").and_then(|v| v.as_i64())
                .or_else(|| item.get("original_line").and_then(|v| v.as_i64()));
            let side = item.get("side").and_then(|v| v.as_str()).unwrap_or("RIGHT").to_string();
            let author = item.get("user").and_then(|u| u.get("login")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let body = item.get("body").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let created_at = item.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let root_id = in_reply_to.unwrap_or(id);
            let thread = threads.entry(root_id).or_insert(ReviewThread {
                id: root_id, path: path.clone(), line, side: side.clone(), comments: vec![],
            });
            thread.comments.push(ThreadComment {
                id, author, body, created_at, in_reply_to_id: in_reply_to,
            });
        }
        let mut out: Vec<_> = threads.into_values().collect();
        out.sort_by_key(|t| t.id);
        Ok(out)
    }
}
```

- [ ] **Step 3: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(github): get_pr + get_pr_threads grouped by reply chain"
```

---

## Phase 3 — Drafts + reviews

### Task 15: Drafts CRUD

**Files:**
- Create: `src-tauri/src/drafts.rs`, `src-tauri/tests/drafts_test.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write tests first**

Create `src-tauri/tests/drafts_test.rs`:
```rust
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
```

- [ ] **Step 2: Run, watch fail**

Run: `cd src-tauri && cargo test --test drafts_test`
Expected: FAIL — `drafts` module missing.

- [ ] **Step 3: Implement drafts**

Create `src-tauri/src/drafts.rs`:
```rust
use crate::cache::Cache;
use crate::error::AppResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentDraft {
    pub id: i64,
    pub pr_id: i64,
    pub path: String,
    pub line: i64,
    pub side: String,
    pub body: String,
    pub created_at: String,
}

fn now() -> String { chrono::Utc::now().to_rfc3339() }

pub fn create(cache: &Cache, pr_id: i64, path: &str, line: i64, side: &str, body: &str) -> AppResult<CommentDraft> {
    let created_at = now();
    cache.with_conn(|c| {
        c.execute(
            "INSERT INTO drafts (pr_id, path, line, side, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![pr_id, path, line, side, body, created_at],
        )?;
        let id = c.last_insert_rowid();
        Ok(CommentDraft {
            id, pr_id,
            path: path.into(), line, side: side.into(),
            body: body.into(), created_at: created_at.clone(),
        })
    })
}

pub fn list(cache: &Cache, pr_id: i64) -> AppResult<Vec<CommentDraft>> {
    cache.with_conn(|c| {
        let mut stmt = c.prepare(
            "SELECT id, pr_id, path, line, side, body, created_at FROM drafts WHERE pr_id = ?1 ORDER BY id"
        )?;
        let rows = stmt.query_map([pr_id], |r| Ok(CommentDraft {
            id: r.get(0)?,
            pr_id: r.get(1)?,
            path: r.get(2)?,
            line: r.get(3)?,
            side: r.get(4)?,
            body: r.get(5)?,
            created_at: r.get(6)?,
        }))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn update(cache: &Cache, id: i64, body: &str) -> AppResult<CommentDraft> {
    cache.with_conn(|c| {
        c.execute("UPDATE drafts SET body = ?1 WHERE id = ?2", rusqlite::params![body, id])?;
        let row = c.query_row(
            "SELECT id, pr_id, path, line, side, body, created_at FROM drafts WHERE id = ?1",
            [id],
            |r| Ok(CommentDraft {
                id: r.get(0)?, pr_id: r.get(1)?, path: r.get(2)?, line: r.get(3)?,
                side: r.get(4)?, body: r.get(5)?, created_at: r.get(6)?,
            }),
        )?;
        Ok(row)
    })
}

pub fn delete(cache: &Cache, id: i64) -> AppResult<()> {
    cache.with_conn(|c| {
        c.execute("DELETE FROM drafts WHERE id = ?1", [id])?;
        Ok(())
    })
}
```

Add `pub mod drafts;` to `src-tauri/src/lib.rs`.

- [ ] **Step 4: Run tests**

Run: `cd src-tauri && cargo test --test drafts_test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(backend): drafts CRUD with SQLite"
```

---

### Task 16: submit_review

**Files:**
- Modify: `src-tauri/src/github/reviews.rs`

- [ ] **Step 1: Implement submit**

Replace `src-tauri/src/github/reviews.rs`:
```rust
use crate::drafts::CommentDraft;
use crate::error::{AppError, AppResult};
use crate::github::GitHubClient;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ReviewEvent { Approve, Comment, RequestChanges }

impl ReviewEvent {
    fn as_str(self) -> &'static str {
        match self {
            ReviewEvent::Approve => "APPROVE",
            ReviewEvent::Comment => "COMMENT",
            ReviewEvent::RequestChanges => "REQUEST_CHANGES",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewResult {
    pub review_id: i64,
    pub state: String,
    pub html_url: String,
}

impl GitHubClient {
    pub async fn submit_review(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        event: ReviewEvent,
        body: Option<&str>,
        drafts: &[CommentDraft],
    ) -> AppResult<ReviewResult> {
        let comments: Vec<serde_json::Value> = drafts.iter().map(|d| serde_json::json!({
            "path": d.path,
            "line": d.line,
            "side": d.side,
            "body": d.body,
        })).collect();
        let payload = serde_json::json!({
            "event": event.as_str(),
            "body": body.unwrap_or(""),
            "comments": comments,
        });
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/reviews");
        let resp: serde_json::Value = self.inner
            .post(route, Some(&payload)).await
            .map_err(|e| AppError::SubmitFailed(e.to_string()))?;
        Ok(ReviewResult {
            review_id: resp.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
            state: resp.get("state").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            html_url: resp.get("html_url").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }

    pub async fn reply_to_thread(&self, owner: &str, repo: &str, number: u64, in_reply_to: i64, body: &str) -> AppResult<()> {
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/comments");
        let payload = serde_json::json!({ "body": body, "in_reply_to": in_reply_to });
        let _: serde_json::Value = self.inner
            .post(route, Some(&payload)).await
            .map_err(|e| AppError::SubmitFailed(e.to_string()))?;
        Ok(())
    }
}
```

- [ ] **Step 2: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(github): submit_review + reply_to_thread"
```

---

## Phase 4 — Tauri commands + app state

### Task 17: AppState + command modules

**Files:**
- Create: `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/prs.rs`, `src-tauri/src/commands/drafts.rs`, `src-tauri/src/commands/reviews.rs`, `src-tauri/src/commands/repos.rs`, `src-tauri/src/commands/filters.rs`, `src-tauri/src/commands/settings.rs`, `src-tauri/src/commands/secrets.rs`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`

- [ ] **Step 1: Define AppState**

Add to `src-tauri/src/lib.rs`:
```rust
pub mod commands;

use crate::cache::Cache;
use crate::config::types::Settings;
use crate::github::GitHubClient;
use tokio::sync::RwLock;

pub struct AppState {
    pub cache: Cache,
    pub settings: RwLock<Settings>,
    pub client: RwLock<Option<GitHubClient>>,
}

impl AppState {
    pub fn new() -> crate::error::AppResult<Self> {
        Ok(Self {
            cache: Cache::open_at(crate::cache::default_path()?)?,
            settings: RwLock::new(crate::config::load()?),
            client: RwLock::new(None),
        })
    }
}
```

- [ ] **Step 2: Create commands/mod.rs**

Create `src-tauri/src/commands/mod.rs`:
```rust
pub mod prs;
pub mod drafts;
pub mod reviews;
pub mod repos;
pub mod filters;
pub mod settings;
pub mod secrets;
```

- [ ] **Step 3: Implement PRs commands**

Create `src-tauri/src/commands/prs.rs`:
```rust
use crate::error::{AppError, AppResult};
use crate::github::diffs::FileDiff;
use crate::github::prs::{PrDetail, PrFilter, PrSummary};
use crate::github::threads::ReviewThread;
use crate::AppState;
use tauri::State;

async fn client(state: &State<'_, AppState>) -> AppResult<crate::github::GitHubClient> {
    let guard = state.client.read().await;
    guard.clone().ok_or_else(|| AppError::Auth("no GitHub client; set PAT first".into()))
}

#[tauri::command]
pub async fn list_prs(filter: String, state: State<'_, AppState>) -> AppResult<Vec<PrSummary>> {
    let f = match filter.as_str() {
        "mine" => PrFilter::Mine,
        "review_requested" => PrFilter::ReviewRequested,
        _ => return Err(AppError::Internal(format!("unknown filter: {filter}"))),
    };
    let repos: Vec<(String, String)> = {
        let s = state.settings.read().await;
        s.repos.iter().map(|r| (r.owner.clone(), r.name.clone())).collect()
    };
    let c = client(&state).await?;
    c.list_prs(f, &repos).await
}

#[tauri::command]
pub async fn get_pr(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<PrDetail> {
    let c = client(&state).await?;
    c.get_pr(&owner, &repo, number).await
}

#[tauri::command]
pub async fn get_pr_diff(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<Vec<FileDiff>> {
    let c = client(&state).await?;
    c.get_pr_diff(&owner, &repo, number).await
}

#[tauri::command]
pub async fn get_pr_threads(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<Vec<ReviewThread>> {
    let c = client(&state).await?;
    c.get_pr_threads(&owner, &repo, number).await
}

#[tauri::command]
pub async fn refresh_pr(owner: String, repo: String, number: u64, state: State<'_, AppState>) -> AppResult<PrDetail> {
    // Phase 1 has no read-through cache yet; refresh == get_pr.
    get_pr(owner, repo, number, state).await
}
```

- [ ] **Step 4: Implement drafts commands**

Create `src-tauri/src/commands/drafts.rs`:
```rust
use crate::drafts::{create, delete, list, update, CommentDraft};
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn draft_comment(pr_id: i64, path: String, line: i64, side: String, body: String, state: State<'_, AppState>) -> AppResult<CommentDraft> {
    create(&state.cache, pr_id, &path, line, &side, &body)
}

#[tauri::command]
pub async fn list_drafts(pr_id: i64, state: State<'_, AppState>) -> AppResult<Vec<CommentDraft>> {
    list(&state.cache, pr_id)
}

#[tauri::command]
pub async fn update_draft(draft_id: i64, body: String, state: State<'_, AppState>) -> AppResult<CommentDraft> {
    update(&state.cache, draft_id, &body)
}

#[tauri::command]
pub async fn delete_draft(draft_id: i64, state: State<'_, AppState>) -> AppResult<()> {
    delete(&state.cache, draft_id)
}
```

- [ ] **Step 5: Implement reviews command**

Create `src-tauri/src/commands/reviews.rs`:
```rust
use crate::drafts;
use crate::error::{AppError, AppResult};
use crate::github::reviews::{ReviewEvent, ReviewResult};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn submit_review(
    owner: String,
    repo: String,
    number: u64,
    event: ReviewEvent,
    body: Option<String>,
    draft_ids: Vec<i64>,
    state: State<'_, AppState>,
) -> AppResult<ReviewResult> {
    let all = drafts::list(&state.cache, 0)?;
    // Caller passes PR-scoped draft_ids; we read them from the DB.
    let selected: Vec<_> = if draft_ids.is_empty() {
        vec![]
    } else {
        let ids: std::collections::HashSet<i64> = draft_ids.into_iter().collect();
        all.into_iter().filter(|d| ids.contains(&d.id)).collect()
    };
    // Re-fetch PR-scoped drafts when caller passed none but expects all of this PR.
    let drafts = if selected.is_empty() {
        // Look them all up: the frontend always supplies draft_ids in this flow;
        // empty means "no inline drafts, just a top-level review".
        vec![]
    } else { selected };

    let client = state.client.read().await
        .clone()
        .ok_or_else(|| AppError::Auth("no GitHub client".into()))?;
    let result = client.submit_review(&owner, &repo, number, event, body.as_deref(), &drafts).await?;
    // On success, delete the submitted drafts.
    for d in &drafts { let _ = crate::drafts::delete(&state.cache, d.id); }
    Ok(result)
}
```

- [ ] **Step 6: Implement repos / filters / settings / secrets commands**

Create `src-tauri/src/commands/repos.rs`:
```rust
use crate::config;
use crate::config::types::RepoConfig;
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_repos(state: State<'_, AppState>) -> AppResult<Vec<RepoConfig>> {
    Ok(state.settings.read().await.repos.clone())
}

#[tauri::command]
pub async fn add_repo(owner: String, name: String, state: State<'_, AppState>) -> AppResult<RepoConfig> {
    let mut s = state.settings.write().await;
    let r = RepoConfig { owner, name };
    if !s.repos.contains(&r) { s.repos.push(r.clone()); }
    config::save(&s)?;
    Ok(r)
}

#[tauri::command]
pub async fn remove_repo(owner: String, name: String, state: State<'_, AppState>) -> AppResult<()> {
    let mut s = state.settings.write().await;
    s.repos.retain(|r| !(r.owner == owner && r.name == name));
    config::save(&s)?;
    Ok(())
}
```

Create `src-tauri/src/commands/filters.rs`:
```rust
use crate::config;
use crate::config::types::PathFilter;
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_path_filters(repo: String, state: State<'_, AppState>) -> AppResult<Vec<PathFilter>> {
    Ok(state.settings.read().await.path_filters.iter()
        .filter(|f| f.repo == repo).cloned().collect())
}

#[tauri::command]
pub async fn set_path_filters(repo: String, filters: Vec<PathFilter>, state: State<'_, AppState>) -> AppResult<()> {
    let mut s = state.settings.write().await;
    s.path_filters.retain(|f| f.repo != repo);
    s.path_filters.extend(filters);
    config::save(&s)?;
    Ok(())
}
```

Create `src-tauri/src/commands/settings.rs`:
```rust
use crate::config;
use crate::config::types::Settings;
use crate::error::AppResult;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    Ok(state.settings.read().await.clone())
}

#[tauri::command]
pub async fn set_settings(settings: Settings, state: State<'_, AppState>) -> AppResult<()> {
    {
        let mut s = state.settings.write().await;
        *s = settings.clone();
    }
    config::save(&settings)?;
    Ok(())
}
```

Create `src-tauri/src/commands/secrets.rs`:
```rust
use crate::error::AppResult;
use crate::github::GitHubClient;
use crate::secrets;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn set_pat(token: String, state: State<'_, AppState>) -> AppResult<()> {
    secrets::set_pat(&token)?;
    let client = GitHubClient::new(&token).await?;
    *state.client.write().await = Some(client);
    Ok(())
}

#[tauri::command]
pub async fn clear_pat(state: State<'_, AppState>) -> AppResult<()> {
    secrets::clear_pat()?;
    *state.client.write().await = None;
    Ok(())
}

#[tauri::command]
pub async fn has_pat() -> AppResult<bool> {
    Ok(crate::secrets::get_pat()?.is_some())
}
```

- [ ] **Step 7: Wire commands and AppState into main.rs**

Replace `src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pr_reviewer::commands::{drafts, filters, prs, repos, reviews, secrets, settings};
use pr_reviewer::AppState;

fn main() {
    let _guard = pr_reviewer::logging::init().expect("logging init");
    tracing::info!("starting pr-reviewer");

    let state = AppState::new().expect("app state init");

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            prs::list_prs, prs::get_pr, prs::get_pr_diff, prs::get_pr_threads, prs::refresh_pr,
            drafts::draft_comment, drafts::list_drafts, drafts::update_draft, drafts::delete_draft,
            reviews::submit_review,
            repos::list_repos, repos::add_repo, repos::remove_repo,
            filters::get_path_filters, filters::set_path_filters,
            settings::get_settings, settings::set_settings,
            secrets::set_pat, secrets::clear_pat, secrets::has_pat,
        ])
        .setup(|app| {
            tauri::async_runtime::block_on(async move {
                let state: tauri::State<AppState> = app.state();
                if let Ok(Some(pat)) = pr_reviewer::secrets::get_pat() {
                    match pr_reviewer::github::GitHubClient::new(&pat).await {
                        Ok(client) => *state.client.write().await = Some(client),
                        Err(e) => tracing::warn!("failed to init GitHub client: {e}"),
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 8: Verify build**

Run: `cd src-tauri && cargo build`
Expected: clean build (warnings allowed).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(backend): wire Tauri commands + AppState"
```

---

## Phase 5 — Frontend foundation

### Task 18: IPC client + types

**Files:**
- Create: `src/ipc/client.ts`, `src/ipc/types.ts`, `src/ipc/errors.ts`

- [ ] **Step 1: Mirror backend types**

Create `src/ipc/types.ts`:
```ts
export type ThemeChoice = "light" | "dark" | "system";

export interface UiPrefs {
  theme: ThemeChoice;
  sidebar_collapsed: boolean;
  filetree_collapsed: boolean;
  sidebar_width: number;
  filetree_width: number;
}

export interface RepoConfig { owner: string; name: string; }

export interface PathFilter {
  repo: string;
  pattern: string;
  label: string;
  default_hidden: boolean;
}

export interface Settings {
  ui: UiPrefs;
  repos: RepoConfig[];
  path_filters: PathFilter[];
}

export interface PrSummary {
  id: number;
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: string;
  updated_at: string;
  html_url: string;
  is_mine: boolean;
  review_requested: boolean;
}

export interface PrDetail {
  summary: PrSummary;
  body: string | null;
  head_sha: string;
  base_sha: string;
  draft: boolean;
  mergeable: boolean | null;
}

export interface FileDiff {
  path: string;
  previous_path: string | null;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface ThreadComment {
  id: number;
  author: string;
  body: string;
  created_at: string;
  in_reply_to_id: number | null;
}

export interface ReviewThread {
  id: number;
  path: string;
  line: number | null;
  side: string;
  comments: ThreadComment[];
}

export interface CommentDraft {
  id: number;
  pr_id: number;
  path: string;
  line: number;
  side: string;
  body: string;
  created_at: string;
}

export type ReviewEvent = "APPROVE" | "COMMENT" | "REQUEST_CHANGES";

export interface ReviewResult {
  review_id: number;
  state: string;
  html_url: string;
}

export type AppError =
  | { kind: "Auth"; details: string }
  | { kind: "RateLimited"; details: { reset_at: string } }
  | { kind: "Network"; details: string }
  | { kind: "NotFound"; details: string }
  | { kind: "Conflict"; details: string }
  | { kind: "SubmitFailed"; details: string }
  | { kind: "Config"; details: string }
  | { kind: "Cache"; details: string }
  | { kind: "Internal"; details: string };
```

- [ ] **Step 2: Typed invoke wrapper**

Create `src/ipc/client.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";
import type {
  CommentDraft, FileDiff, PathFilter, PrDetail, PrSummary, RepoConfig,
  ReviewEvent, ReviewResult, ReviewThread, Settings,
} from "./types";

export const api = {
  listPrs: (filter: "mine" | "review_requested") =>
    invoke<PrSummary[]>("list_prs", { filter }),
  getPr: (owner: string, repo: string, number: number) =>
    invoke<PrDetail>("get_pr", { owner, repo, number }),
  getPrDiff: (owner: string, repo: string, number: number) =>
    invoke<FileDiff[]>("get_pr_diff", { owner, repo, number }),
  getPrThreads: (owner: string, repo: string, number: number) =>
    invoke<ReviewThread[]>("get_pr_threads", { owner, repo, number }),
  refreshPr: (owner: string, repo: string, number: number) =>
    invoke<PrDetail>("refresh_pr", { owner, repo, number }),

  draftComment: (prId: number, path: string, line: number, side: string, body: string) =>
    invoke<CommentDraft>("draft_comment", { prId, path, line, side, body }),
  listDrafts: (prId: number) =>
    invoke<CommentDraft[]>("list_drafts", { prId }),
  updateDraft: (draftId: number, body: string) =>
    invoke<CommentDraft>("update_draft", { draftId, body }),
  deleteDraft: (draftId: number) =>
    invoke<void>("delete_draft", { draftId }),

  submitReview: (owner: string, repo: string, number: number, event: ReviewEvent, body: string | null, draftIds: number[]) =>
    invoke<ReviewResult>("submit_review", { owner, repo, number, event, body, draftIds }),

  listRepos: () => invoke<RepoConfig[]>("list_repos"),
  addRepo: (owner: string, name: string) => invoke<RepoConfig>("add_repo", { owner, name }),
  removeRepo: (owner: string, name: string) => invoke<void>("remove_repo", { owner, name }),

  getPathFilters: (repo: string) => invoke<PathFilter[]>("get_path_filters", { repo }),
  setPathFilters: (repo: string, filters: PathFilter[]) => invoke<void>("set_path_filters", { repo, filters }),

  getSettings: () => invoke<Settings>("get_settings"),
  setSettings: (settings: Settings) => invoke<void>("set_settings", { settings }),

  setPat: (token: string) => invoke<void>("set_pat", { token }),
  clearPat: () => invoke<void>("clear_pat"),
  hasPat: () => invoke<boolean>("has_pat"),
};
```

- [ ] **Step 3: Error mapping**

Create `src/ipc/errors.ts`:
```ts
import type { AppError } from "./types";

export function isAppError(e: unknown): e is AppError {
  return !!e && typeof e === "object" && "kind" in (e as object);
}

export function userMessage(e: unknown): string {
  if (!isAppError(e)) return String(e ?? "Erro desconhecido");
  switch (e.kind) {
    case "Auth": return "Token inválido ou expirado. Reautentique nas configurações.";
    case "RateLimited": return `Limite da API atingido até ${e.details.reset_at}. Tente novamente depois.`;
    case "Network": return "Sem conexão com o GitHub. Mostrando dados em cache.";
    case "NotFound": return "Recurso não encontrado.";
    case "Conflict": return "O diff mudou desde o rascunho.";
    case "SubmitFailed": return `Falha ao enviar review: ${e.details}`;
    case "Config": return `Erro de configuração: ${e.details}`;
    case "Cache": return `Erro de cache: ${e.details}`;
    case "Internal": return `Erro interno: ${e.details}`;
  }
}
```

- [ ] **Step 4: Verify type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): typed IPC client + AppError mapping"
```

---

### Task 19: Theme provider

**Files:**
- Create: `src/theme/ThemeProvider.tsx`, `src/theme/monaco-themes.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement ThemeProvider**

Create `src/theme/ThemeProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeChoice } from "../ipc/types";

type ResolvedTheme = "latte" | "mocha";

interface Ctx {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (c: ThemeChoice) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved: ResolvedTheme = useMemo(() => {
    if (choice === "system") return systemDark ? "mocha" : "latte";
    return choice === "dark" ? "mocha" : "latte";
  }, [choice, systemDark]);

  useEffect(() => {
    document.body.dataset.theme = resolved;
  }, [resolved]);

  return (
    <ThemeCtx.Provider value={{ choice, resolved, setChoice }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
```

- [ ] **Step 2: Monaco theme objects**

Create `src/theme/monaco-themes.ts`:
```ts
import type { editor } from "monaco-editor";
import { latte, mocha } from "./catppuccin";

function build(p: typeof latte, base: "vs" | "vs-dark"): editor.IStandaloneThemeData {
  return {
    base,
    inherit: true,
    rules: [
      { token: "", foreground: p.text.slice(1), background: p.base.slice(1) },
      { token: "comment", foreground: p.overlay1.slice(1), fontStyle: "italic" },
      { token: "string", foreground: p.green.slice(1) },
      { token: "number", foreground: p.peach.slice(1) },
      { token: "keyword", foreground: p.mauve.slice(1) },
      { token: "type", foreground: p.yellow.slice(1) },
      { token: "function", foreground: p.blue.slice(1) },
    ],
    colors: {
      "editor.background": p.base,
      "editor.foreground": p.text,
      "editorLineNumber.foreground": p.overlay0,
      "editorLineNumber.activeForeground": p.text,
      "editorCursor.foreground": p.rosewater,
      "editor.selectionBackground": p.surface2,
      "editor.lineHighlightBackground": p.mantle,
      "diffEditor.insertedTextBackground": "#a6e3a133",
      "diffEditor.removedTextBackground": "#f38ba833",
    },
  };
}

export const monacoLatte = build(latte, "vs");
export const monacoMocha = build(mocha, "vs-dark");
```

- [ ] **Step 3: Wrap app with ThemeProvider**

Edit `src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Verify**

Run: `pnpm tauri dev`
Expected: window opens, theme follows OS preference. Body should have `data-theme="mocha"` or `"latte"` in devtools.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): ThemeProvider + Monaco theme objects"
```

---

### Task 20: State stores

**Files:**
- Create: `src/state/prsStore.ts`, `src/state/draftsStore.ts`, `src/state/settingsStore.ts`

- [ ] **Step 1: Create prsStore**

Create `src/state/prsStore.ts`:
```ts
import { create } from "zustand";
import { api } from "../ipc/client";
import type { FileDiff, PrDetail, PrSummary, ReviewThread } from "../ipc/types";

interface PrsState {
  mine: PrSummary[];
  reviewRequested: PrSummary[];
  loadingLists: boolean;
  listError: unknown | null;

  currentPr: PrDetail | null;
  diff: FileDiff[];
  threads: ReviewThread[];
  selectedFile: string | null;
  loadingPr: boolean;
  prError: unknown | null;

  refreshLists: () => Promise<void>;
  openPr: (owner: string, repo: string, number: number) => Promise<void>;
  selectFile: (path: string) => void;
  refreshThreads: () => Promise<void>;
}

export const usePrsStore = create<PrsState>((set, get) => ({
  mine: [],
  reviewRequested: [],
  loadingLists: false,
  listError: null,

  currentPr: null,
  diff: [],
  threads: [],
  selectedFile: null,
  loadingPr: false,
  prError: null,

  refreshLists: async () => {
    set({ loadingLists: true, listError: null });
    try {
      const [mine, rr] = await Promise.all([
        api.listPrs("mine"),
        api.listPrs("review_requested"),
      ]);
      set({ mine, reviewRequested: rr });
    } catch (e) {
      set({ listError: e });
    } finally {
      set({ loadingLists: false });
    }
  },

  openPr: async (owner, repo, number) => {
    set({ loadingPr: true, prError: null, currentPr: null, diff: [], threads: [], selectedFile: null });
    try {
      const [pr, diff, threads] = await Promise.all([
        api.getPr(owner, repo, number),
        api.getPrDiff(owner, repo, number),
        api.getPrThreads(owner, repo, number),
      ]);
      set({
        currentPr: pr,
        diff,
        threads,
        selectedFile: diff[0]?.path ?? null,
      });
    } catch (e) {
      set({ prError: e });
    } finally {
      set({ loadingPr: false });
    }
  },

  selectFile: (path) => set({ selectedFile: path }),

  refreshThreads: async () => {
    const pr = get().currentPr;
    if (!pr) return;
    const threads = await api.getPrThreads(pr.summary.owner, pr.summary.repo, pr.summary.number);
    set({ threads });
  },
}));
```

- [ ] **Step 2: Create draftsStore**

Create `src/state/draftsStore.ts`:
```ts
import { create } from "zustand";
import { api } from "../ipc/client";
import type { CommentDraft } from "../ipc/types";

interface DraftsState {
  drafts: CommentDraft[];
  load: (prId: number) => Promise<void>;
  add: (prId: number, path: string, line: number, side: string, body: string) => Promise<void>;
  edit: (id: number, body: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clear: () => void;
}

export const useDraftsStore = create<DraftsState>((set, get) => ({
  drafts: [],
  load: async (prId) => set({ drafts: await api.listDrafts(prId) }),
  add: async (prId, path, line, side, body) => {
    const d = await api.draftComment(prId, path, line, side, body);
    set({ drafts: [...get().drafts, d] });
  },
  edit: async (id, body) => {
    const updated = await api.updateDraft(id, body);
    set({ drafts: get().drafts.map(d => d.id === id ? updated : d) });
  },
  remove: async (id) => {
    await api.deleteDraft(id);
    set({ drafts: get().drafts.filter(d => d.id !== id) });
  },
  clear: () => set({ drafts: [] }),
}));
```

- [ ] **Step 3: Create settingsStore**

Create `src/state/settingsStore.ts`:
```ts
import { create } from "zustand";
import { api } from "../ipc/client";
import type { Settings } from "../ipc/types";

interface SettingsState {
  settings: Settings | null;
  hasPat: boolean;
  load: () => Promise<void>;
  save: (s: Settings) => Promise<void>;
  checkPat: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  hasPat: false,
  load: async () => set({ settings: await api.getSettings() }),
  save: async (s) => { await api.setSettings(s); set({ settings: s }); },
  checkPat: async () => set({ hasPat: await api.hasPat() }),
}));
```

- [ ] **Step 4: Verify type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): zustand stores for PRs, drafts, settings"
```

---

## Phase 6 — Layout + PR list

### Task 21: Three-panel layout with collapse

**Files:**
- Create: `src/components/layout/Layout.tsx`, `src/components/layout/PanelHeader.tsx`, `src/components/layout/shortcuts.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: PanelHeader**

Create `src/components/layout/PanelHeader.tsx`:
```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  onCollapse?: () => void;
  side: "left" | "right";
}

export function PanelHeader({ title, onCollapse, side }: Props) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "var(--pad)", borderBottom: "1px solid var(--c-surface0)",
      background: "var(--c-mantle)",
    }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
      {onCollapse && (
        <button onClick={onCollapse} style={{
          background: "transparent", border: 0, color: "var(--c-subtext)",
          cursor: "pointer", padding: 4, borderRadius: 4,
        }}>
          <Icon size={16} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Layout**

Create `src/components/layout/Layout.tsx`:
```tsx
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useRef } from "react";
import { PanelHeader } from "./PanelHeader";
import { useShortcuts } from "./shortcuts";

interface Props {
  prList: React.ReactNode;
  fileTree: React.ReactNode;
  diff: React.ReactNode;
}

export function Layout({ prList, fileTree, diff }: Props) {
  const prListRef = useRef<ImperativePanelHandle>(null);
  const fileTreeRef = useRef<ImperativePanelHandle>(null);

  const togglePrList = () => prListRef.current?.isCollapsed() ? prListRef.current?.expand() : prListRef.current?.collapse();
  const toggleFileTree = () => fileTreeRef.current?.isCollapsed() ? fileTreeRef.current?.expand() : fileTreeRef.current?.collapse();

  useShortcuts({ togglePrList, toggleFileTree });

  return (
    <PanelGroup direction="horizontal" style={{ height: "100vh" }}>
      <Panel ref={prListRef} defaultSize={22} minSize={15} collapsible collapsedSize={0} order={1}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--c-base)" }}>
          <PanelHeader title="Pull Requests" onCollapse={togglePrList} side="left" />
          <div style={{ flex: 1, overflow: "auto" }}>{prList}</div>
        </div>
      </Panel>
      <PanelResizeHandle style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
      <Panel ref={fileTreeRef} defaultSize={20} minSize={12} collapsible collapsedSize={0} order={2}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--c-base)" }}>
          <PanelHeader title="Files" onCollapse={toggleFileTree} side="left" />
          <div style={{ flex: 1, overflow: "auto" }}>{fileTree}</div>
        </div>
      </Panel>
      <PanelResizeHandle style={{ width: 1, background: "var(--c-surface0)", cursor: "col-resize" }} />
      <Panel defaultSize={58} minSize={30} order={3}>
        <div style={{ height: "100%", background: "var(--c-base)" }}>{diff}</div>
      </Panel>
    </PanelGroup>
  );
}
```

- [ ] **Step 3: Shortcuts**

Create `src/components/layout/shortcuts.ts`:
```ts
import { useEffect } from "react";

interface Cfg {
  togglePrList: () => void;
  toggleFileTree: () => void;
}

export function useShortcuts({ togglePrList, toggleFileTree }: Cfg) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      if (e.key === "1") { e.preventDefault(); togglePrList(); }
      else if (e.key === "2") { e.preventDefault(); toggleFileTree(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePrList, toggleFileTree]);
}
```

- [ ] **Step 4: Use Layout in App**

Replace `src/App.tsx`:
```tsx
import { Layout } from "./components/layout/Layout";

export default function App() {
  return (
    <Layout
      prList={<div style={{ padding: 12 }}>PR list (TBD)</div>}
      fileTree={<div style={{ padding: 12 }}>File tree (TBD)</div>}
      diff={<div style={{ padding: 12 }}>Diff (TBD)</div>}
    />
  );
}
```

Note: the "(TBD)" labels here are placeholder content for the running app while building out the next tasks — not plan placeholders. They are replaced in Tasks 23, 24, and 26.

- [ ] **Step 5: Verify visually**

Run: `pnpm tauri dev`
Expected: three resizable columns, collapse buttons work, `Ctrl+1` / `Ctrl+2` toggle panels.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(frontend): three-panel resizable layout with collapse + shortcuts"
```

---

### Task 22: PAT setup screen

**Files:**
- Create: `src/components/settings/PatSection.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: PatSection component**

Create `src/components/settings/PatSection.tsx`:
```tsx
import { useState } from "react";
import { api } from "../../ipc/client";
import { useSettingsStore } from "../../state/settingsStore";

export function PatSection({ onDone }: { onDone?: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const checkPat = useSettingsStore(s => s.checkPat);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.setPat(token.trim());
      await checkPat();
      setToken("");
      onDone?.();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "10vh auto" }}>
      <h2 style={{ marginTop: 0 }}>Conectar ao GitHub</h2>
      <p style={{ color: "var(--c-subtext)" }}>
        Cole seu Personal Access Token (escopo <code>repo</code>). O token fica guardado no keyring do sistema.
      </p>
      <input
        type="password"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="ghp_..."
        style={{
          width: "100%", padding: 10, borderRadius: 5,
          border: "1px solid var(--c-surface1)", background: "var(--c-mantle)",
          color: "var(--c-text)", fontFamily: "var(--font-mono)",
        }}
      />
      {err && <div style={{ color: "var(--c-red)", marginTop: 8 }}>{err}</div>}
      <button
        onClick={submit}
        disabled={busy || !token.trim()}
        style={{
          marginTop: 12, padding: "8px 14px", borderRadius: 5,
          border: 0, background: "var(--c-accent)", color: "white",
          cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Gate App on PAT presence**

Replace `src/App.tsx`:
```tsx
import { useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { PatSection } from "./components/settings/PatSection";
import { useSettingsStore } from "./state/settingsStore";

export default function App() {
  const { hasPat, checkPat, load } = useSettingsStore();

  useEffect(() => {
    checkPat();
    load();
  }, [checkPat, load]);

  if (!hasPat) return <PatSection onDone={checkPat} />;

  return (
    <Layout
      prList={<div style={{ padding: 12 }}>PR list (Task 23)</div>}
      fileTree={<div style={{ padding: 12 }}>File tree (Task 24)</div>}
      diff={<div style={{ padding: 12 }}>Diff (Task 26)</div>}
    />
  );
}
```

- [ ] **Step 3: Smoke test**

Run: `pnpm tauri dev`
Expected: first run shows PAT screen. Paste a valid PAT → after click "Salvar", layout appears.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(frontend): PAT setup screen gating the main layout"
```

---

### Task 23: PrListPanel

**Files:**
- Create: `src/components/prs/PrListPanel.tsx`, `src/components/prs/PrListItem.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: PrListItem**

Create `src/components/prs/PrListItem.tsx`:
```tsx
import type { PrSummary } from "../../ipc/types";

interface Props { pr: PrSummary; selected: boolean; onClick: () => void; }

export function PrListItem({ pr, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "8px 12px", border: 0,
        background: selected ? "var(--c-surface0)" : "transparent",
        color: "var(--c-text)", cursor: "pointer",
        borderBottom: "1px solid var(--c-mantle)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{pr.title}</div>
      <div style={{ fontSize: 11, color: "var(--c-subtext)" }}>
        {pr.owner}/{pr.repo}#{pr.number} · {pr.author}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: PrListPanel**

Create `src/components/prs/PrListPanel.tsx`:
```tsx
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { PrSummary } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";
import { PrListItem } from "./PrListItem";

type Tab = "mine" | "review_requested";

function groupByRepo(prs: PrSummary[]): Record<string, PrSummary[]> {
  const out: Record<string, PrSummary[]> = {};
  for (const p of prs) {
    const k = `${p.owner}/${p.repo}`;
    (out[k] ||= []).push(p);
  }
  return out;
}

export function PrListPanel() {
  const { mine, reviewRequested, loadingLists, refreshLists, openPr, currentPr } = usePrsStore();
  const [tab, setTab] = useState<Tab>("review_requested");

  useEffect(() => { refreshLists(); }, [refreshLists]);

  const list = tab === "mine" ? mine : reviewRequested;
  const groups = groupByRepo(list);
  const selectedNum = currentPr?.summary.number ?? null;

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid var(--c-surface0)" }}>
        {(["review_requested", "mine"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "8px 0", border: 0,
              background: tab === t ? "var(--c-base)" : "var(--c-mantle)",
              color: tab === t ? "var(--c-text)" : "var(--c-subtext)",
              cursor: "pointer", fontSize: 12, fontWeight: 500,
              borderBottom: tab === t ? "2px solid var(--c-accent)" : "2px solid transparent",
            }}
          >
            {t === "mine" ? "Meus" : "Pra revisar"}
          </button>
        ))}
        <button
          onClick={refreshLists}
          disabled={loadingLists}
          title="Refresh"
          style={{
            padding: "0 10px", border: 0, background: "var(--c-mantle)",
            color: "var(--c-subtext)", cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={loadingLists ? "spin" : undefined} />
        </button>
      </div>

      {Object.entries(groups).map(([repo, prs]) => (
        <div key={repo}>
          <div style={{
            padding: "6px 12px", fontSize: 11, fontWeight: 600,
            color: "var(--c-subtext)", background: "var(--c-mantle)",
            textTransform: "uppercase", letterSpacing: 0.4,
          }}>{repo}</div>
          {prs.map(p => (
            <PrListItem
              key={p.id}
              pr={p}
              selected={selectedNum === p.number && currentPr?.summary.owner === p.owner && currentPr?.summary.repo === p.repo}
              onClick={() => openPr(p.owner, p.repo, p.number)}
            />
          ))}
        </div>
      ))}

      {!loadingLists && list.length === 0 && (
        <div style={{ padding: 24, color: "var(--c-subtext)", fontSize: 12 }}>
          Nenhum PR. Adicione repos em Configurações.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into App**

Edit `src/App.tsx`, replace the `prList` prop:
```tsx
prList={<PrListPanel />}
```
Add the import: `import { PrListPanel } from "./components/prs/PrListPanel";`

- [ ] **Step 4: Smoke test**

Pre-req: add at least one repo via SQLite (Task 27 will add UI for repos; for now insert manually):
```bash
sqlite3 ~/.config/pr-reviewer/config.toml || true  # config is TOML; edit by hand
```
Edit `~/.config/pr-reviewer/config.toml` and add:
```toml
[[repos]]
owner = "your-github-user"
name  = "some-repo"
```
Run `pnpm tauri dev`. Expected: PR list panel renders with tabs and refresh button; both lists populate.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): PrListPanel with Mine/Review-requested tabs and grouping"
```

---

### Task 24: FileTreePanel with path filters

**Files:**
- Create: `src/components/files/FileTreePanel.tsx`, `src/components/files/FileTreeNode.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Tree node**

Create `src/components/files/FileTreeNode.tsx`:
```tsx
import { ChevronDown, ChevronRight, File } from "lucide-react";
import { useState } from "react";

interface DirNode {
  type: "dir";
  name: string;
  children: TreeNode[];
}
interface FileNode {
  type: "file";
  path: string;
  status: string;
  additions: number;
  deletions: number;
}
export type TreeNode = DirNode | FileNode;

interface Props {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}

const STATUS_COLORS: Record<string, string> = {
  added: "var(--c-green)", modified: "var(--c-amber)",
  removed: "var(--c-red)", renamed: "var(--c-blue)",
};

export function FileTreeNode({ node, selectedPath, onSelect, depth = 0 }: Props) {
  const [open, setOpen] = useState(true);
  const pad = 8 + depth * 12;

  if (node.type === "file") {
    return (
      <button
        onClick={() => onSelect(node.path)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", textAlign: "left",
          padding: `4px 8px 4px ${pad}px`, border: 0,
          background: selectedPath === node.path ? "var(--c-surface0)" : "transparent",
          color: "var(--c-text)", cursor: "pointer", fontSize: 12,
        }}
      >
        <File size={12} style={{ color: STATUS_COLORS[node.status] ?? "var(--c-subtext)" }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.path.split("/").pop()}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--c-subtext)" }}>
          +{node.additions} −{node.deletions}
        </span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          width: "100%", textAlign: "left",
          padding: `4px 8px 4px ${pad}px`, border: 0,
          background: "transparent", color: "var(--c-subtext)",
          cursor: "pointer", fontSize: 12, fontWeight: 500,
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {node.name}
      </button>
      {open && node.children.map((child, i) => (
        <FileTreeNode key={i} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: FileTreePanel with path filters**

Create `src/components/files/FileTreePanel.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../ipc/client";
import type { FileDiff, PathFilter } from "../../ipc/types";
import { usePrsStore } from "../../state/prsStore";
import { FileTreeNode, TreeNode } from "./FileTreeNode";

function matchesGlob(pattern: string, path: string): boolean {
  // simple glob → regex: ** any segments, * any chars except '/'
  const re = "^" + pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    + "$";
  try { return new RegExp(re).test(path); } catch { return false; }
}

function classify(files: FileDiff[], filters: PathFilter[]) {
  const matched: Record<string, FileDiff[]> = {};
  const unmatched: FileDiff[] = [];
  for (const f of files) {
    const hit = filters.find(fl => matchesGlob(fl.pattern, f.path));
    if (hit) (matched[hit.label] ||= []).push(f);
    else unmatched.push(f);
  }
  return { matched, unmatched };
}

function buildTree(files: FileDiff[]): TreeNode[] {
  const root: TreeNode = { type: "dir", name: "", children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let cur: TreeNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur.type !== "dir") break;
      let next = cur.children.find(c => c.type === "dir" && c.name === parts[i]) as TreeNode | undefined;
      if (!next) {
        next = { type: "dir", name: parts[i], children: [] };
        cur.children.push(next);
      }
      cur = next;
    }
    if (cur.type === "dir") {
      cur.children.push({
        type: "file", path: f.path,
        status: f.status, additions: f.additions, deletions: f.deletions,
      });
    }
  }
  return (root as Extract<TreeNode, { type: "dir" }>).children;
}

export function FileTreePanel() {
  const { diff, currentPr, selectedFile, selectFile } = usePrsStore();
  const [filters, setFilters] = useState<PathFilter[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    if (!currentPr) { setFilters([]); return; }
    const repo = `${currentPr.summary.owner}/${currentPr.summary.repo}`;
    api.getPathFilters(repo).then(setFilters).catch(() => setFilters([]));
  }, [currentPr]);

  const { matched, unmatched } = useMemo(() => classify(diff, filters), [diff, filters]);
  const unmatchedTree = useMemo(() => buildTree(unmatched), [unmatched]);

  if (!currentPr) return <div style={{ padding: 12, color: "var(--c-subtext)", fontSize: 12 }}>Selecione um PR.</div>;

  return (
    <div style={{ padding: "6px 0" }}>
      {unmatchedTree.map((n, i) => (
        <FileTreeNode key={i} node={n} selectedPath={selectedFile} onSelect={selectFile} />
      ))}

      {Object.entries(matched).map(([label, files]) => {
        const groupOpen = showHidden;
        return (
          <GroupNode
            key={label}
            label={label}
            files={files}
            open={groupOpen}
            onToggle={() => setShowHidden(s => !s)}
            selectedFile={selectedFile}
            onSelect={selectFile}
          />
        );
      })}
    </div>
  );
}

function GroupNode({ label, files, open, onToggle, selectedFile, onSelect }: {
  label: string;
  files: FileDiff[];
  open: boolean;
  onToggle: () => void;
  selectedFile: string | null;
  onSelect: (p: string) => void;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--c-mantle)", marginTop: 6, paddingTop: 6 }}>
      <button onClick={onToggle} style={{
        display: "flex", width: "100%", textAlign: "left", border: 0,
        padding: "6px 10px", background: "transparent",
        color: "var(--c-subtext)", fontSize: 11, fontWeight: 600,
        cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.4,
      }}>
        {open ? "▾" : "▸"} {label} ({files.length})
      </button>
      {open && files.map(f => (
        <FileTreeNode
          key={f.path}
          node={{ type: "file", path: f.path, status: f.status, additions: f.additions, deletions: f.deletions }}
          selectedPath={selectedFile}
          onSelect={onSelect}
          depth={1}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Use in App**

Edit `src/App.tsx`:
```tsx
fileTree={<FileTreePanel />}
```
Import: `import { FileTreePanel } from "./components/files/FileTreePanel";`

- [ ] **Step 4: Smoke test**

Run: `pnpm tauri dev`. Pick a PR. Expected: file tree populated; path filter groups (if configured in `config.toml`) render collapsed at the bottom.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): FileTreePanel with path-filter grouping"
```

---

### Task 25: FileTreePanel component test

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `src/__tests__/FileTreePanel.test.tsx`, `vitest.setup.ts`

- [ ] **Step 1: Configure Vitest**

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Edit `vite.config.ts`, extend the config to add a `test` block (Vite's defineConfig supports a `test` property from vitest/config):
```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
});
```

Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 2: Write test**

Create `src/__tests__/FileTreePanel.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { FileTreePanel } from "../components/files/FileTreePanel";
import { usePrsStore } from "../state/prsStore";

vi.mock("../ipc/client", () => ({
  api: {
    getPathFilters: vi.fn().mockResolvedValue([
      { repo: "x/y", pattern: "src/test/**", label: "Testes", default_hidden: true },
    ]),
  },
}));

beforeEach(() => {
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 1, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true },
      body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
    },
    diff: [
      { path: "src/main.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
      { path: "src/test/foo.rs", previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null },
    ],
    threads: [],
    selectedFile: null,
  });
});

describe("FileTreePanel", () => {
  it("groups filtered paths into a collapsed group", async () => {
    render(<FileTreePanel />);
    expect(await screen.findByText(/Testes \(1\)/)).toBeInTheDocument();
    expect(screen.getByText("main.rs")).toBeInTheDocument();
    expect(screen.queryByText("foo.rs")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Testes \(1\)/));
    expect(screen.getByText("foo.rs")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test**

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(frontend): FileTreePanel path-filter grouping"
```

---

## Phase 7 — Diff + comments

### Task 26: DiffPanel with Monaco

**Files:**
- Create: `src/components/diff/DiffPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement DiffPanel**

Create `src/components/diff/DiffPanel.tsx`:
```tsx
import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import { usePrsStore } from "../../state/prsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { monacoLatte, monacoMocha } from "../../theme/monaco-themes";

function parsePatchSides(patch: string | null): { original: string; modified: string } {
  if (!patch) return { original: "", modified: "" };
  const orig: string[] = [];
  const mod: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) { orig.push(""); mod.push(""); continue; }
    if (line.startsWith("+")) mod.push(line.slice(1));
    else if (line.startsWith("-")) orig.push(line.slice(1));
    else { orig.push(line.startsWith(" ") ? line.slice(1) : line); mod.push(line.startsWith(" ") ? line.slice(1) : line); }
  }
  return { original: orig.join("\n"), modified: mod.join("\n") };
}

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", java: "java", kt: "kotlin",
    rb: "ruby", php: "php", c: "c", cpp: "cpp", h: "c", hpp: "cpp",
    json: "json", yml: "yaml", yaml: "yaml", toml: "toml", md: "markdown",
    sh: "shell", sql: "sql", html: "html", css: "css", scss: "scss",
  };
  return map[ext ?? ""] ?? "plaintext";
}

export function DiffPanel() {
  const { diff, selectedFile } = usePrsStore();
  const { resolved } = useTheme();
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const [ready, setReady] = useState(false);

  const file = diff.find(f => f.path === selectedFile);
  const { original, modified } = useMemo(() => parsePatchSides(file?.patch ?? null), [file?.patch]);

  useEffect(() => {
    if (!ready || !editorRef.current) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;
    monaco.editor.defineTheme("cat-latte", monacoLatte);
    monaco.editor.defineTheme("cat-mocha", monacoMocha);
    monaco.editor.setTheme(resolved === "mocha" ? "cat-mocha" : "cat-latte");
  }, [resolved, ready]);

  if (!file) return <div style={{ padding: 16, color: "var(--c-subtext)" }}>Selecione um arquivo.</div>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "8px 12px", borderBottom: "1px solid var(--c-surface0)",
        background: "var(--c-mantle)", fontSize: 12, color: "var(--c-subtext)",
        fontFamily: "var(--font-mono)",
      }}>
        {file.path}
        <span style={{ marginLeft: 8, color: "var(--c-green)" }}>+{file.additions}</span>
        <span style={{ marginLeft: 4, color: "var(--c-red)" }}>−{file.deletions}</span>
      </div>
      <div style={{ flex: 1 }}>
        <DiffEditor
          original={original}
          modified={modified}
          language={languageFor(file.path)}
          theme={resolved === "mocha" ? "vs-dark" : "vs"}
          options={{
            renderSideBySide: true,
            readOnly: true,
            originalEditable: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: "JetBrains Mono, Fira Code, monospace",
            fontSize: 13,
          }}
          onMount={(ed) => { editorRef.current = ed; setReady(true); }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into App**

Edit `src/App.tsx`:
```tsx
diff={<DiffPanel />}
```
Import: `import { DiffPanel } from "./components/diff/DiffPanel";`

- [ ] **Step 3: Smoke test**

Run: `pnpm tauri dev`. Pick a PR + a file. Expected: Monaco side-by-side diff renders with Catppuccin colors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(frontend): DiffPanel using Monaco DiffEditor"
```

---

### Task 27: Inline comment view zones (drafts + threads)

**Files:**
- Create: `src/components/diff/CommentViewZone.tsx`, `src/components/diff/ThreadViewZone.tsx`
- Modify: `src/components/diff/DiffPanel.tsx`

- [ ] **Step 1: CommentViewZone (draft input)**

Create `src/components/diff/CommentViewZone.tsx`:
```tsx
import { useState } from "react";

interface Props {
  initialBody?: string;
  onSave: (body: string) => void;
  onCancel: () => void;
}

export function CommentViewZone({ initialBody = "", onSave, onCancel }: Props) {
  const [body, setBody] = useState(initialBody);
  return (
    <div style={{
      margin: "4px 16px", padding: 8,
      background: "var(--c-mantle)",
      border: "1px solid var(--c-surface1)",
      borderRadius: 5,
    }}>
      <textarea
        autoFocus
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={3}
        placeholder="Comentário"
        style={{
          width: "100%", resize: "vertical",
          background: "var(--c-base)",
          border: "1px solid var(--c-surface0)", borderRadius: 4,
          color: "var(--c-text)", padding: 6,
          fontFamily: "var(--font-ui)", fontSize: 13,
        }}
      />
      <div style={{ marginTop: 6, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={btn("ghost")}>Cancelar</button>
        <button onClick={() => body.trim() && onSave(body.trim())} disabled={!body.trim()} style={btn("primary")}>Salvar rascunho</button>
      </div>
    </div>
  );
}

function btn(variant: "ghost" | "primary"): React.CSSProperties {
  if (variant === "primary") return {
    padding: "6px 10px", borderRadius: 4, border: 0,
    background: "var(--c-accent)", color: "white", cursor: "pointer", fontSize: 12,
  };
  return {
    padding: "6px 10px", borderRadius: 4,
    border: "1px solid var(--c-surface1)",
    background: "transparent", color: "var(--c-subtext)", cursor: "pointer", fontSize: 12,
  };
}
```

- [ ] **Step 2: ThreadViewZone (read existing comments)**

Create `src/components/diff/ThreadViewZone.tsx`:
```tsx
import type { ReviewThread } from "../../ipc/types";

export function ThreadViewZone({ thread }: { thread: ReviewThread }) {
  return (
    <div style={{
      margin: "4px 16px", padding: 8,
      background: "var(--c-mantle)",
      border: "1px solid var(--c-surface1)",
      borderRadius: 5,
    }}>
      {thread.comments.map(c => (
        <div key={c.id} style={{
          padding: "4px 0",
          borderBottom: "1px solid var(--c-surface0)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-subtext)" }}>
            {c.author}
          </div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.body}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire view zones into DiffPanel**

Edit `src/components/diff/DiffPanel.tsx` to add view zones. Append imports at top:
```tsx
import { createRoot, Root } from "react-dom/client";
import { CommentViewZone } from "./CommentViewZone";
import { ThreadViewZone } from "./ThreadViewZone";
import { useDraftsStore } from "../../state/draftsStore";
```

Inside the `DiffPanel` component, after `const file = ...`, add:

```tsx
const { drafts, add } = useDraftsStore();
const threadsForFile = usePrsStore(s => s.threads).filter(t => t.path === file.path);
const draftsForFile = drafts.filter(d => d.path === file.path);

useEffect(() => {
  if (!ready || !editorRef.current) return;
  const modEd = editorRef.current.getModifiedEditor();
  const zones: { id: string; root: Root; dom: HTMLDivElement }[] = [];

  modEd.changeViewZones((accessor: any) => {
    for (const t of threadsForFile) {
      if (t.line == null) continue;
      const dom = document.createElement("div");
      const root = createRoot(dom);
      root.render(<ThreadViewZone thread={t} />);
      const id = accessor.addZone({ afterLineNumber: t.line, heightInLines: Math.max(2, t.comments.length * 2 + 1), domNode: dom });
      zones.push({ id, root, dom });
    }
    for (const d of draftsForFile) {
      const dom = document.createElement("div");
      const root = createRoot(dom);
      root.render(
        <CommentViewZone
          initialBody={d.body}
          onSave={() => { /* edit path: see SettingsModal/drafts list */ }}
          onCancel={() => { /* no-op for rendered draft */ }}
        />
      );
      const id = accessor.addZone({ afterLineNumber: d.line, heightInLines: 4, domNode: dom });
      zones.push({ id, root, dom });
    }
  });

  return () => {
    modEd.changeViewZones((accessor: any) => {
      for (const z of zones) accessor.removeZone(z.id);
    });
    for (const z of zones) z.root.unmount();
  };
}, [ready, threadsForFile, draftsForFile]);

useEffect(() => {
  if (!ready || !editorRef.current) return;
  const modEd = editorRef.current.getModifiedEditor();
  const disposable = modEd.onMouseDown((e: any) => {
    if (e.target.type !== /* GUTTER_LINE_NUMBERS */ 2) return;
    const line = e.target.position?.lineNumber;
    const prId = usePrsStore.getState().currentPr?.summary.id;
    if (!line || !prId) return;
    // Mount a transient zone for the input.
    modEd.changeViewZones((accessor: any) => {
      const dom = document.createElement("div");
      const root = createRoot(dom);
      let zoneId: string;
      root.render(
        <CommentViewZone
          onSave={async (body) => {
            await add(prId, file.path, line, "RIGHT", body);
            modEd.changeViewZones((a: any) => a.removeZone(zoneId));
            root.unmount();
          }}
          onCancel={() => {
            modEd.changeViewZones((a: any) => a.removeZone(zoneId));
            root.unmount();
          }}
        />
      );
      zoneId = accessor.addZone({ afterLineNumber: line, heightInLines: 4, domNode: dom });
    });
  });
  return () => disposable.dispose();
}, [ready, file.path, add]);
```

- [ ] **Step 4: Load drafts when PR changes**

Edit `src/App.tsx` to load drafts whenever `currentPr` changes. Replace the body of the `App` function:
```tsx
import { useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { PatSection } from "./components/settings/PatSection";
import { PrListPanel } from "./components/prs/PrListPanel";
import { FileTreePanel } from "./components/files/FileTreePanel";
import { DiffPanel } from "./components/diff/DiffPanel";
import { useSettingsStore } from "./state/settingsStore";
import { usePrsStore } from "./state/prsStore";
import { useDraftsStore } from "./state/draftsStore";

export default function App() {
  const { hasPat, checkPat, load } = useSettingsStore();
  const currentPr = usePrsStore(s => s.currentPr);
  const loadDrafts = useDraftsStore(s => s.load);
  const clearDrafts = useDraftsStore(s => s.clear);

  useEffect(() => { checkPat(); load(); }, [checkPat, load]);
  useEffect(() => {
    if (currentPr) loadDrafts(currentPr.summary.id);
    else clearDrafts();
  }, [currentPr, loadDrafts, clearDrafts]);

  if (!hasPat) return <PatSection onDone={checkPat} />;
  return (
    <Layout
      prList={<PrListPanel />}
      fileTree={<FileTreePanel />}
      diff={<DiffPanel />}
    />
  );
}
```

- [ ] **Step 5: Smoke test**

Run: `pnpm tauri dev`. Pick a PR with existing review threads. Click a line number → input appears → save → draft persists across file changes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(frontend): inline comment + thread view zones in DiffPanel"
```

---

### Task 28: ReviewSubmitModal

**Files:**
- Create: `src/components/review/ReviewSubmitModal.tsx`, `src/components/common/Modal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Modal primitive**

Create `src/components/common/Modal.tsx`:
```tsx
import { X } from "lucide-react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ title, open, onClose, children, footer }: Props) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--c-base)", color: "var(--c-text)",
        borderRadius: 6, minWidth: 480, maxWidth: 720,
        border: "1px solid var(--c-surface1)",
      }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--c-surface0)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <strong>{title}</strong>
          <button onClick={onClose} style={{
            background: "transparent", border: 0, color: "var(--c-subtext)", cursor: "pointer",
          }}><X size={16} /></button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        {footer && (
          <div style={{
            padding: "10px 16px", borderTop: "1px solid var(--c-surface0)",
            display: "flex", justifyContent: "flex-end", gap: 8,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ReviewSubmitModal**

Create `src/components/review/ReviewSubmitModal.tsx`:
```tsx
import { useState } from "react";
import { Modal } from "../common/Modal";
import { api } from "../../ipc/client";
import { userMessage } from "../../ipc/errors";
import { useDraftsStore } from "../../state/draftsStore";
import { usePrsStore } from "../../state/prsStore";
import type { ReviewEvent } from "../../ipc/types";

interface Props { open: boolean; onClose: () => void; }

export function ReviewSubmitModal({ open, onClose }: Props) {
  const { drafts, clear } = useDraftsStore();
  const { currentPr, refreshThreads } = usePrsStore();
  const [event, setEvent] = useState<ReviewEvent>("COMMENT");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!currentPr) return null;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.submitReview(
        currentPr.summary.owner, currentPr.summary.repo, currentPr.summary.number,
        event, body || null, drafts.map(d => d.id),
      );
      clear();
      await refreshThreads();
      onClose();
    } catch (e) {
      setErr(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Enviar review"
      open={open}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} disabled={busy} style={ghost()}>Cancelar</button>
          <button onClick={submit} disabled={busy} style={primary()}>{busy ? "Enviando…" : "Enviar"}</button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["APPROVE", "COMMENT", "REQUEST_CHANGES"] as ReviewEvent[]).map(ev => (
          <label key={ev} style={{
            flex: 1, padding: 10, border: "1px solid var(--c-surface1)",
            borderRadius: 5, cursor: "pointer", fontSize: 13, textAlign: "center",
            background: event === ev ? "var(--c-surface0)" : "transparent",
          }}>
            <input type="radio" name="event" checked={event === ev} onChange={() => setEvent(ev)} style={{ display: "none" }} />
            {ev === "APPROVE" ? "Aprovar" : ev === "COMMENT" ? "Comentar" : "Pedir mudanças"}
          </label>
        ))}
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        placeholder="Resumo (opcional)"
        style={{
          width: "100%", padding: 8, borderRadius: 5,
          border: "1px solid var(--c-surface1)",
          background: "var(--c-mantle)", color: "var(--c-text)",
          fontFamily: "var(--font-ui)", fontSize: 13, resize: "vertical",
        }}
      />
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--c-subtext)" }}>
        {drafts.length} rascunho{drafts.length === 1 ? "" : "s"} inline.
      </div>
      {err && <div style={{ color: "var(--c-red)", marginTop: 8, fontSize: 12 }}>{err}</div>}
    </Modal>
  );
}

function ghost(): React.CSSProperties {
  return { padding: "8px 12px", borderRadius: 5, border: "1px solid var(--c-surface1)", background: "transparent", color: "var(--c-subtext)", cursor: "pointer" };
}
function primary(): React.CSSProperties {
  return { padding: "8px 14px", borderRadius: 5, border: 0, background: "var(--c-accent)", color: "white", cursor: "pointer" };
}
```

- [ ] **Step 3: Add floating button to App**

Edit `src/App.tsx`, inside `<Layout … />` return, wrap with a fragment and add:
```tsx
import { useState } from "react";
import { ReviewSubmitModal } from "./components/review/ReviewSubmitModal";

// inside the component, near useEffects:
const [submitOpen, setSubmitOpen] = useState(false);
const draftCount = useDraftsStore(s => s.drafts.length);

// in the JSX:
<>
  <Layout prList={<PrListPanel />} fileTree={<FileTreePanel />} diff={<DiffPanel />} />
  {currentPr && (
    <button
      onClick={() => setSubmitOpen(true)}
      style={{
        position: "fixed", bottom: 16, right: 16, padding: "10px 16px",
        borderRadius: 999, border: 0, background: "var(--c-accent)",
        color: "white", cursor: "pointer", fontWeight: 500,
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
      }}
    >
      Enviar review{draftCount > 0 ? ` (${draftCount})` : ""}
    </button>
  )}
  <ReviewSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
</>
```

- [ ] **Step 4: Smoke test**

Run: `pnpm tauri dev`. Open a PR. Add a draft. Click "Enviar review". Pick Comment + submit. Expected: GitHub PR shows the review with the inline comment.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): ReviewSubmitModal + floating submit button"
```

---

### Task 29: ReviewSubmitModal test

**Files:**
- Create: `src/__tests__/ReviewSubmitModal.test.tsx`

- [ ] **Step 1: Write test**

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ReviewSubmitModal } from "../components/review/ReviewSubmitModal";
import { useDraftsStore } from "../state/draftsStore";
import { usePrsStore } from "../state/prsStore";

const submitReview = vi.fn().mockResolvedValue({ review_id: 1, state: "submitted", html_url: "" });

vi.mock("../ipc/client", () => ({
  api: {
    submitReview: (...args: unknown[]) => submitReview(...args),
  },
}));

beforeEach(() => {
  submitReview.mockClear();
  usePrsStore.setState({
    currentPr: {
      summary: { id: 1, owner: "x", repo: "y", number: 42, title: "t", author: "a", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true },
      body: null, head_sha: "", base_sha: "", draft: false, mergeable: null,
    },
    diff: [], threads: [], selectedFile: null,
    refreshThreads: vi.fn().mockResolvedValue(undefined),
  } as any);
  useDraftsStore.setState({
    drafts: [{ id: 9, pr_id: 1, path: "a", line: 1, side: "RIGHT", body: "hi", created_at: "" }],
    clear: vi.fn(),
  } as any);
});

describe("ReviewSubmitModal", () => {
  it("submits with selected event and draft ids", async () => {
    const onClose = vi.fn();
    render(<ReviewSubmitModal open onClose={onClose} />);
    fireEvent.click(screen.getByText("Aprovar"));
    fireEvent.click(screen.getByText("Enviar"));
    await waitFor(() => expect(submitReview).toHaveBeenCalled());
    expect(submitReview).toHaveBeenCalledWith("x", "y", 42, "APPROVE", null, [9]);
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run**

Run: `pnpm test`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(frontend): ReviewSubmitModal submits with event + draft ids"
```

---

## Phase 8 — Settings UI + error UX

### Task 30: SettingsModal (repos + filters + theme)

**Files:**
- Create: `src/components/settings/SettingsModal.tsx`, `src/components/settings/ReposSection.tsx`, `src/components/settings/FiltersSection.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: ReposSection**

Create `src/components/settings/ReposSection.tsx`:
```tsx
import { useEffect, useState } from "react";
import { api } from "../../ipc/client";
import type { RepoConfig } from "../../ipc/types";
import { Trash2 } from "lucide-react";

export function ReposSection() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");

  const refresh = () => api.listRepos().then(setRepos);
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!owner.trim() || !name.trim()) return;
    await api.addRepo(owner.trim(), name.trim());
    setOwner(""); setName("");
    refresh();
  };

  return (
    <section style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>Repositórios</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {repos.map(r => (
          <div key={`${r.owner}/${r.name}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "var(--c-mantle)", borderRadius: 4 }}>
            <code style={{ flex: 1, fontSize: 12 }}>{r.owner}/{r.name}</code>
            <button onClick={async () => { await api.removeRepo(r.owner, r.name); refresh(); }} style={{ border: 0, background: "transparent", color: "var(--c-red)", cursor: "pointer" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" style={input()} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="repo" style={input()} />
        <button onClick={add} style={addBtn()}>+</button>
      </div>
    </section>
  );
}

function input(): React.CSSProperties {
  return { flex: 1, padding: "6px 8px", borderRadius: 4, border: "1px solid var(--c-surface1)", background: "var(--c-base)", color: "var(--c-text)", fontFamily: "var(--font-mono)", fontSize: 12 };
}
function addBtn(): React.CSSProperties {
  return { padding: "6px 12px", borderRadius: 4, border: 0, background: "var(--c-accent)", color: "white", cursor: "pointer" };
}
```

- [ ] **Step 2: FiltersSection**

Create `src/components/settings/FiltersSection.tsx`:
```tsx
import { useEffect, useState } from "react";
import { api } from "../../ipc/client";
import type { PathFilter, RepoConfig } from "../../ipc/types";
import { Trash2 } from "lucide-react";

export function FiltersSection() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [filters, setFilters] = useState<PathFilter[]>([]);

  useEffect(() => { api.listRepos().then(r => { setRepos(r); if (r[0]) setSelectedRepo(`${r[0].owner}/${r[0].name}`); }); }, []);
  useEffect(() => {
    if (!selectedRepo) return;
    api.getPathFilters(selectedRepo).then(setFilters);
  }, [selectedRepo]);

  const save = async (next: PathFilter[]) => {
    setFilters(next);
    await api.setPathFilters(selectedRepo, next);
  };

  const add = () => save([...filters, { repo: selectedRepo, pattern: "**/*.lock", label: "Novo filtro", default_hidden: true }]);
  const remove = (i: number) => save(filters.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<PathFilter>) => save(filters.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  return (
    <section style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>Filtros de path</h4>
      <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)} style={{ marginBottom: 8, padding: 6, background: "var(--c-base)", color: "var(--c-text)", border: "1px solid var(--c-surface1)", borderRadius: 4 }}>
        {repos.map(r => <option key={`${r.owner}/${r.name}`} value={`${r.owner}/${r.name}`}>{r.owner}/{r.name}</option>)}
      </select>
      {filters.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <input value={f.pattern} onChange={e => update(i, { pattern: e.target.value })} placeholder="glob" style={inp()} />
          <input value={f.label} onChange={e => update(i, { label: e.target.value })} placeholder="rótulo" style={inp()} />
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--c-subtext)" }}>
            <input type="checkbox" checked={f.default_hidden} onChange={e => update(i, { default_hidden: e.target.checked })} />
            esconder
          </label>
          <button onClick={() => remove(i)} style={{ border: 0, background: "transparent", color: "var(--c-red)", cursor: "pointer" }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={add} disabled={!selectedRepo} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--c-surface1)", background: "transparent", color: "var(--c-text)", cursor: "pointer", fontSize: 12 }}>
        + Filtro
      </button>
    </section>
  );
}

function inp(): React.CSSProperties {
  return { flex: 1, padding: "6px 8px", borderRadius: 4, border: "1px solid var(--c-surface1)", background: "var(--c-base)", color: "var(--c-text)", fontFamily: "var(--font-mono)", fontSize: 12 };
}
```

- [ ] **Step 3: SettingsModal**

Create `src/components/settings/SettingsModal.tsx`:
```tsx
import { Modal } from "../common/Modal";
import { ReposSection } from "./ReposSection";
import { FiltersSection } from "./FiltersSection";
import { PatSection } from "./PatSection";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeChoice } from "../../ipc/types";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { choice, setChoice } = useTheme();

  return (
    <Modal title="Configurações" open={open} onClose={onClose}>
      <ReposSection />
      <FiltersSection />
      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 8px" }}>Tema</h4>
        <div style={{ display: "flex", gap: 6 }}>
          {(["system", "light", "dark"] as ThemeChoice[]).map(t => (
            <button
              key={t}
              onClick={() => setChoice(t)}
              style={{
                flex: 1, padding: 8, borderRadius: 4,
                border: "1px solid var(--c-surface1)",
                background: choice === t ? "var(--c-surface0)" : "transparent",
                color: "var(--c-text)", cursor: "pointer", fontSize: 12,
              }}
            >{t}</button>
          ))}
        </div>
      </section>
      <section>
        <h4 style={{ margin: "0 0 8px" }}>Token</h4>
        <PatSection />
      </section>
    </Modal>
  );
}
```

- [ ] **Step 4: Wire button into App header**

Edit `src/App.tsx` to add a Settings gear in a top bar. Replace the JSX with:
```tsx
<>
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "flex-end",
    padding: "6px 12px", borderBottom: "1px solid var(--c-surface0)",
    background: "var(--c-mantle)",
  }}>
    <button onClick={() => setSettingsOpen(true)} title="Configurações" style={{ background: "transparent", border: 0, color: "var(--c-subtext)", cursor: "pointer" }}>
      <Settings size={16} />
    </button>
  </div>
  <Layout prList={<PrListPanel />} fileTree={<FileTreePanel />} diff={<DiffPanel />} />
  {/* keep submit button + modal as in Task 28 */}
  <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
</>
```
Add: `import { Settings } from "lucide-react"; import { SettingsModal } from "./components/settings/SettingsModal";` and `const [settingsOpen, setSettingsOpen] = useState(false);`.

Wrap the existing layout in a flex column container so the top bar sits above:
```tsx
<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
  {/* top bar */}
  {/* layout (flex:1 inside) */}
</div>
```

You will need to give `Layout` a wrapper with `flex: 1, minHeight: 0` for it to share the column.

- [ ] **Step 5: Smoke test**

Run: `pnpm tauri dev`. Open settings, add a repo, add a filter, switch theme, change PAT. Verify each persists to `~/.config/pr-reviewer/config.toml`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(frontend): SettingsModal with repos, filters, theme, PAT sections"
```

---

### Task 31: Error UX (banner + toasts)

**Files:**
- Create: `src/components/common/Banner.tsx`, `src/components/common/Toast.tsx`, `src/state/uiStore.ts`
- Modify: `src/App.tsx`, `src/state/prsStore.ts`, `src/state/draftsStore.ts`

- [ ] **Step 1: uiStore**

Create `src/state/uiStore.ts`:
```ts
import { create } from "zustand";

interface Toast { id: number; kind: "info" | "error"; message: string; }
interface UiState {
  authBanner: boolean;
  toasts: Toast[];
  setAuthBanner: (b: boolean) => void;
  pushToast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
}

let nextId = 1;

export const useUiStore = create<UiState>((set, get) => ({
  authBanner: false,
  toasts: [],
  setAuthBanner: (b) => set({ authBanner: b }),
  pushToast: (kind, message) => {
    const t = { id: nextId++, kind, message };
    set({ toasts: [...get().toasts, t] });
    setTimeout(() => get().dismissToast(t.id), 5000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));
```

- [ ] **Step 2: Banner + Toast components**

Create `src/components/common/Banner.tsx`:
```tsx
export function Banner({ children, kind = "warn", onAction }: { children: React.ReactNode; kind?: "warn" | "error"; onAction?: { label: string; onClick: () => void } }) {
  return (
    <div style={{
      padding: "8px 12px",
      background: kind === "error" ? "var(--c-red)" : "var(--c-amber)",
      color: "var(--c-base)", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onAction && <button onClick={onAction.onClick} style={{ background: "transparent", border: "1px solid currentColor", color: "inherit", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>{onAction.label}</button>}
    </div>
  );
}
```

Create `src/components/common/Toast.tsx`:
```tsx
import { useUiStore } from "../../state/uiStore";

export function ToastStack() {
  const { toasts, dismissToast } = useUiStore();
  return (
    <div style={{ position: "fixed", bottom: 80, right: 16, display: "flex", flexDirection: "column", gap: 6, zIndex: 200 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => dismissToast(t.id)} style={{
          padding: "8px 12px", borderRadius: 5,
          background: t.kind === "error" ? "var(--c-red)" : "var(--c-surface0)",
          color: t.kind === "error" ? "white" : "var(--c-text)",
          cursor: "pointer", fontSize: 12, maxWidth: 320,
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}>{t.message}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Map errors to UX in stores**

Edit `src/state/prsStore.ts`. Replace the `refreshLists` and `openPr` bodies to dispatch UI state:

```ts
import { isAppError, userMessage } from "../ipc/errors";
import { useUiStore } from "./uiStore";

// inside refreshLists, replace the catch:
catch (e) {
  set({ listError: e });
  if (isAppError(e) && e.kind === "Auth") useUiStore.getState().setAuthBanner(true);
  else useUiStore.getState().pushToast("error", userMessage(e));
}

// inside openPr, replace the catch the same way.
```

Edit `src/state/draftsStore.ts`. Wrap each `await api.*` call in try/catch that pushes a toast:

```ts
import { userMessage } from "../ipc/errors";
import { useUiStore } from "./uiStore";

// example for load:
load: async (prId) => {
  try { set({ drafts: await api.listDrafts(prId) }); }
  catch (e) { useUiStore.getState().pushToast("error", userMessage(e)); }
},
// repeat the pattern for add, edit, remove.
```

- [ ] **Step 4: Render banner + toast stack in App**

Edit `src/App.tsx`, add inside the root fragment, above the top bar:
```tsx
import { Banner } from "./components/common/Banner";
import { ToastStack } from "./components/common/Toast";
import { useUiStore } from "./state/uiStore";

// inside the component:
const { authBanner, setAuthBanner } = useUiStore();

// in JSX, just under <div style={{ display:flex, ... }}>:
{authBanner && (
  <Banner kind="error" onAction={{ label: "Configurar", onClick: () => { setSettingsOpen(true); setAuthBanner(false); } }}>
    Token inválido. Reautentique nas configurações.
  </Banner>
)}

// before closing fragment:
<ToastStack />
```

- [ ] **Step 5: Smoke test**

Run with an invalid PAT: should show the banner, click "Configurar" → opens settings. Trigger a network error (turn off wifi) and refresh: toast appears.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(frontend): auth banner + toast stack for AppError UX"
```

---

## Phase 9 — Polish + release

### Task 32: PrListPanel component test

**Files:**
- Create: `src/__tests__/PrListPanel.test.tsx`

- [ ] **Step 1: Write test**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PrListPanel } from "../components/prs/PrListPanel";
import { usePrsStore } from "../state/prsStore";

vi.mock("../ipc/client", () => ({
  api: { listPrs: vi.fn().mockResolvedValue([]) },
}));

beforeEach(() => {
  usePrsStore.setState({
    mine: [
      { id: 1, owner: "x", repo: "y", number: 1, title: "Mine 1", author: "me", state: "open", updated_at: "", html_url: "", is_mine: true, review_requested: false },
    ],
    reviewRequested: [
      { id: 2, owner: "x", repo: "y", number: 2, title: "RR 2", author: "other", state: "open", updated_at: "", html_url: "", is_mine: false, review_requested: true },
    ],
    loadingLists: false, listError: null,
    refreshLists: vi.fn().mockResolvedValue(undefined),
    openPr: vi.fn(),
    currentPr: null,
  } as any);
});

describe("PrListPanel", () => {
  it("switches between tabs", () => {
    render(<PrListPanel />);
    expect(screen.getByText("RR 2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Meus"));
    expect(screen.getByText("Mine 1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run + commit**

Run: `pnpm test`
Expected: passes.

```bash
git add -A
git commit -m "test(frontend): PrListPanel tab switching"
```

---

### Task 33: README + manual smoke checklist

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# PR Reviewer

Linux desktop app for reviewing GitHub PRs — IntelliJ-like clean UI, Catppuccin-themed, with inline draft comments and batched review submission.

## Build

```bash
pnpm install
pnpm tauri build
```

Artifacts in `src-tauri/target/release/bundle/`.

## Dev

```bash
pnpm tauri dev
```

## Tests

```bash
cd src-tauri && cargo test
pnpm test
```

## First run

1. Generate a GitHub PAT with `repo` scope.
2. Open the app, paste the PAT, save.
3. Settings (gear icon) → add at least one repo.
4. The PR list populates.

## Manual smoke checklist (pre-release)

- [ ] PAT flow: invalid token rejected → valid token accepted.
- [ ] Both PR lists populate; refresh button works.
- [ ] Diff renders for: large file, binary file, deleted file, renamed file.
- [ ] Inline comment → submit Approve / Comment / Request changes.
- [ ] Path filter hides files; toggle reveals them.
- [ ] Panels collapse and persist across restart.
- [ ] `Ctrl+1` / `Ctrl+2` toggle panels.
- [ ] Logs file at `~/.local/state/pr-reviewer/log.txt` is reachable.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with build, dev, tests, smoke checklist"
```

---

### Task 34: Release build verification

- [ ] **Step 1: Build the bundle**

Run: `pnpm tauri build`
Expected: artifacts in `src-tauri/target/release/bundle/` — at least `.AppImage` and `.deb`.

- [ ] **Step 2: Run the AppImage**

Run: `chmod +x src-tauri/target/release/bundle/appimage/*.AppImage && ./src-tauri/target/release/bundle/appimage/*.AppImage`
Expected: app launches identically to the dev build.

- [ ] **Step 3: Walk the smoke checklist**

Run through each item in `README.md`'s "Manual smoke checklist". Note any failures in `docs/superpowers/notes/2026-05-22-smoke.md` (create on demand) and fix before tagging.

- [ ] **Step 4: Tag release**

```bash
git tag v0.1.0
```

(Pushing the tag is a separate step the user does manually.)

---

## Self-Review Notes

**Spec coverage:**

- Goals → all covered (Tasks 11, 13, 14, 15, 16, 23, 24, 26, 27, 28, 30).
- Non-Goals → respected; no merge/close/edit commands; no GitLab; no notifications.
- Architecture diagram → Tasks 17 (commands) and 21 (layout) realize it.
- Tech stack → Tasks 1–3 bootstrap.
- Tauri commands → Task 17 maps each spec command to a function.
- Primary flows → Boot covered by Task 22 + 23; Open PR by 23+24+26; Comment by 27; Submit by 28.
- Config + cache schema → Tasks 5, 8.
- UI/Visual Design → Tasks 3, 19, 30 (theme switch).
- Error handling → Tasks 4, 31.
- Logging → Task 9.
- Testing → Tasks 6 (path_filter), 12 (github wiremock), 15 (drafts), 25 (FileTreePanel), 29 (ReviewSubmitModal), 32 (PrListPanel).
- Distribution → Task 34.

**Open Questions from the spec:**

- Reply on existing threads: backend supports it (`reply_to_thread` in Task 16). UI surfaces threads but does not yet expose a "reply" affordance — explicitly deferred from MVP; add a follow-up task when desired.
- Monaco Catppuccin theme: Task 19 hand-ports the palette into Monaco theme objects rather than depending on a community port.
- Inferred repos vs configured: out of scope for this plan; covered in spec's Open Questions only.

**Placeholders:** "(TBD)" labels in Task 21/22 are explicit UI strings for the running app while subsequent tasks fill in their components, not unwritten plan content. All replaced by Task 23/24/26.

**Type consistency check:**

- `CommentDraft` fields match across `src-tauri/src/drafts.rs` and `src/ipc/types.ts`.
- `PrSummary`, `PrDetail`, `FileDiff`, `ReviewThread`, `ThreadComment` likewise.
- `ReviewEvent` uses uppercase variants in both Rust (`#[serde(rename_all = "UPPERCASE")]`) and TS.
- Tauri command names (snake_case in Rust) match `invoke("…")` strings in the IPC client.
- `client()` helper in `commands/prs.rs` returns the `GitHubClient` used by all PR-fetching commands consistently.
