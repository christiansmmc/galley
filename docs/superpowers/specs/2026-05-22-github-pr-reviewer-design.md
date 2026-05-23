# PR Reviewer — Design

**Date:** 2026-05-22
**Status:** Draft for review
**Owner:** csequeira153@gmail.com

A Linux desktop app for reviewing GitHub pull requests. Clean, calm UI in the spirit of IntelliJ's built-in review tool, focused on the user's own open PRs and PRs where they are a requested reviewer.

## Goals

- Single screen for triage: see all PRs the user authored and all PRs awaiting their review across a configurable set of repos.
- A first-class diff experience (side-by-side, syntax-highlighted) that does not require a browser tab.
- Inline commenting with local drafts that survive crashes and offline sessions, batched into a single GitHub review on submit.
- Path filters per repo so noise (tests, lockfiles, generated code) is collapsed by default but reachable in one click.
- Calm visual design suitable for long review sessions.

## Non-Goals (MVP)

- No write operations beyond review submission: no opening, merging, closing PRs, no editing source files, no commit/push.
- No support for GitLab, Bitbucket, or other forges.
- No team-wide configuration sync; config is local per user.
- No notifications, polling, or background refresh — refresh is user-initiated.
- No CI status integration beyond what is already in the PR payload.
- No code search, no repo browsing outside of a PR's changed files.

## Users and Primary Flows

The single user is the developer running the app on their Linux desktop.

**Triage flow:** open app → see two lists (Mine, Review Requested) → pick a PR.

**Review flow:** in a PR → walk the file tree → for each changed file, read the diff → drop inline draft comments where needed → submit a final review (Approve / Comment / Request changes) with optional summary body.

**Author flow:** in one of my own PRs → read the existing review threads → reply where needed (replies are also submitted as a review or as direct comments — see Open Questions).

## Tech Stack

- **Shell:** Tauri 2.x (Rust backend, system webview frontend).
- **Frontend:** React 18 + TypeScript, Vite, `react-resizable-panels` for the collapsible panel layout, Monaco Editor for diff rendering, Lucide for icons, Catppuccin (Latte light + Mocha dark) for theming.
- **Backend:** Rust 2021, `octocrab` for GitHub REST/GraphQL, `keyring` for credential storage, `rusqlite` (bundled) for local cache, `tracing` + `tracing-subscriber` for logging, `serde` + `toml` for config.
- **Packaging:** Tauri's bundler produces `.AppImage` and `.deb` for Linux.

Rationale for the major picks:

- **Tauri over Electron:** ~10 MB bundle versus ~150 MB, lower memory footprint, Rust backend keeps the GitHub client and SQLite cache off the UI thread cleanly.
- **Monaco over CodeMirror:** the VS Code diff editor is the closest off-the-shelf match for the IntelliJ-grade side-by-side experience the user asked for. Inline comment overlays use Monaco's view-zone API, which is verbose but well-documented.
- **React over Svelte/Solid:** larger ecosystem, more Monaco integration examples, more comfortable footing for the project's size.
- **PAT over OAuth:** for a personal tool used by one developer, a PAT pasted once and stored in the OS keyring removes the need to register and host an OAuth app. OAuth Device Flow is a possible follow-up if the tool is ever distributed.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Tauri Window (React + TS)                  │
│  ┌──────────────┬──────────────────────┐    │
│  │ PR List      │ PR Detail            │    │
│  │ (sidebar)    │  ├─ Header/metadata  │    │
│  │ - Mine       │  ├─ File tree        │    │
│  │ - Assigned   │  │   (path filters)  │    │
│  │              │  └─ Monaco DiffEditor│    │
│  │              │      + comment zones │    │
│  └──────────────┴──────────────────────┘    │
└──────────────┬──────────────────────────────┘
               │ Tauri commands (IPC, typed)
┌──────────────▼──────────────────────────────┐
│  Rust core                                  │
│  ├─ github_client (octocrab)                │
│  ├─ keyring (PAT storage)                   │
│  ├─ config (repos, path filters, UI prefs)  │
│  └─ cache (SQLite — PRs, diffs, threads,    │
│            drafts)                          │
└─────────────────────────────────────────────┘
```

Layers:

- **React UI** does rendering and interaction only. No direct HTTP, no direct disk access.
- **Tauri commands** are the IPC boundary. Every cross-layer call goes through a typed command.
- **Rust core** owns the GitHub client, keyring access, config file, and SQLite cache.

### Components

**Frontend (React)**

- `App` — top-level layout, theme provider, global error boundary.
- `Layout` — three `react-resizable-panels` columns: `PrListPanel | FileTreePanel | DiffPanel`. Each panel has a collapse button in its header and a `Ctrl+1` / `Ctrl+2` / `Ctrl+3` shortcut. Sizes and collapsed flags persist in `config.toml`.
- `PrListPanel` — two tabs (Mine, Review Requested), grouped by repo, sorted by `updated_at` desc. Manual refresh button. Shows title, repo, author avatar, number, review status pill.
- `FileTreePanel` — directory tree of changed files. Path filters group matching files under collapsible nodes (`▸ Testes (12 files hidden)`); a "Show all" toggle reveals everything for the current PR.
- `DiffPanel` — `MonacoDiffEditor` for the selected file, with view zones for existing review threads and for local drafts. Toolbar shows the file path, status (added/modified/deleted/renamed), additions/deletions counts, and a "Mark viewed" toggle.
- `ReviewSubmitModal` — triggered by a persistent "Submit review" button when at least one draft exists or the user explicitly opens it. Radio for event type (Approve / Comment / Request changes), textarea for summary body, list of drafts being submitted.
- `SettingsModal` — repos list (add/remove), path filters editor per repo, PAT field, theme picker (Light / Dark / System), "Open logs" button.

**Backend (Rust)**

- `app::commands` — the IPC surface; every Tauri command lives here and delegates to lower layers. Errors are typed enums serialized via `serde`.
- `github` — `octocrab`-based client. One method per Tauri command's data need. All methods accept a `&Cache` for read-through caching.
- `cache` — `rusqlite` wrapper. Schema migrations on startup. Read-through helpers: `get_or_fetch_pr`, `get_or_fetch_diff`, `get_or_fetch_threads`.
- `drafts` — local-only CRUD on the `drafts` table. Independent from the GitHub client.
- `config` — load/save `config.toml`. UI prefs, repos, path filters.
- `secrets` — `keyring` wrapper around the PAT.
- `logging` — `tracing` setup writing to `~/.local/state/pr-reviewer/log.txt` with rotation at 5 MB.

### Tauri commands (IPC surface)

```text
list_prs(filter: "mine" | "review_requested") -> Vec<PrSummary>
get_pr(owner, repo, number)                    -> PrDetail
get_pr_diff(owner, repo, number)               -> Vec<FileDiff>
get_pr_threads(owner, repo, number)            -> Vec<ReviewThread>
refresh_pr(owner, repo, number)                -> PrDetail

draft_comment(pr_id, path, line, side, body)   -> CommentDraft
list_drafts(pr_id)                             -> Vec<CommentDraft>
update_draft(draft_id, body)                   -> CommentDraft
delete_draft(draft_id)                         -> ()

submit_review(pr_id, event, body, draft_ids)   -> ReviewResult

list_repos()                                   -> Vec<RepoConfig>
add_repo(owner, name)                          -> RepoConfig
remove_repo(owner, name)                       -> ()

get_path_filters(repo)                         -> Vec<PathFilter>
set_path_filters(repo, filters)                -> ()

get_settings()                                 -> Settings
set_settings(settings)                         -> ()

set_pat(token)                                 -> ()
clear_pat()                                    -> ()
```

### Primary flows

**Boot:**

1. Rust loads `config.toml` and the PAT from the keyring; builds an `octocrab` client.
2. React calls `list_prs("mine")` and `list_prs("review_requested")` in parallel.
3. Rust hits GitHub `GET /search/issues` (one query per filter, scoped to configured repos), caches the result for 60 s.
4. The two lists render.

**Open a PR:**

1. React calls `get_pr`, `get_pr_diff`, `get_pr_threads` in parallel.
2. Rust returns cached results when fresh; otherwise fetches `/pulls/{n}`, `/pulls/{n}/files`, `/pulls/{n}/comments`.
3. React builds the file tree (applying path filters) and mounts Monaco on the first file.

**Comment on a line:**

1. User clicks a line in the diff.
2. React opens a textarea in a Monaco view zone.
3. On save, React calls `draft_comment`; Rust inserts into the `drafts` table. The thread becomes visible in the diff (`Local draft` badge) and on the floating "Drafts pending" indicator.

**Submit a review:**

1. User opens `ReviewSubmitModal`.
2. Picks Approve / Comment / Request changes, optionally types a summary body.
3. React calls `submit_review` with the chosen draft IDs.
4. Rust assembles a single `POST /pulls/{n}/reviews` with `comments[]` for each draft.
5. On success, drafts are deleted; threads are refetched.
6. On failure, drafts are preserved and the modal shows the error with a Retry button.

## Data — config and storage

Storage lives in XDG-standard locations.

```
~/.config/pr-reviewer/config.toml
~/.local/share/pr-reviewer/cache.db
~/.local/state/pr-reviewer/log.txt
```

PAT lives in the OS keyring (Secret Service / GNOME Keyring / KDE KWallet) under service `pr-reviewer`, account `github`. It is never written to `config.toml`, `cache.db`, or the log file.

### `config.toml`

```toml
[ui]
theme = "system"               # "light" | "dark" | "system"
sidebar_collapsed = false
filetree_collapsed = false
sidebar_width = 280
filetree_width = 320

[[repos]]
owner = "esparta"
name  = "scorehub-api"

[[repos]]
owner = "esparta"
name  = "scorehub-dashboard"

[[path_filters]]
repo    = "esparta/scorehub-api"
pattern = "src/test/**"
label   = "Testes"
default_hidden = true

[[path_filters]]
repo    = "esparta/scorehub-api"
pattern = "**/*.lock"
label   = "Lockfiles"
default_hidden = true
```

`pattern` is a glob, evaluated with the `glob` crate. Filters apply to a file path within the PR. Matching files are grouped under a collapsible node labelled with `label`; `default_hidden = true` means the group starts collapsed.

### `cache.db` schema

```sql
CREATE TABLE prs (
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

CREATE TABLE files (
    pr_id      INTEGER,
    path       TEXT,
    status     TEXT,
    additions  INTEGER,
    deletions  INTEGER,
    patch      TEXT,
    PRIMARY KEY (pr_id, path)
);

CREATE TABLE threads (
    id           INTEGER PRIMARY KEY,
    pr_id        INTEGER,
    path         TEXT,
    line         INTEGER,
    side         TEXT,
    resolved     INTEGER,
    payload_json TEXT
);

CREATE TABLE drafts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id       INTEGER,
    path        TEXT,
    line        INTEGER,
    side        TEXT,
    body        TEXT,
    created_at  TEXT
);

CREATE INDEX idx_prs_state    ON prs(state, is_mine, review_requested);
CREATE INDEX idx_threads_pr   ON threads(pr_id);
CREATE INDEX idx_drafts_pr    ON drafts(pr_id);
```

Cache TTLs: PR list 60 s, PR detail / diff / threads 5 min. Manual refresh always bypasses cache. Drafts have no TTL; they live until submitted or deleted.

## UI / Visual Design

Catppuccin Latte (light) and Mocha (dark) palettes. Theme follows the OS by default with an override in Settings.

Principles:

- Low saturation on chrome (sidebars, headers, panels); high contrast reserved for diff content.
- Typography: Inter for UI, JetBrains Mono for diff. Both shipped as web fonts.
- Corner radii 4–6 px. Padding base 12 px, gap 8 px.
- Transitions 120–180 ms for collapse, modal, toast. No animation on hover.
- Hover backgrounds shift by ~3 % lightness; no outline rings.
- Lucide icons in line style, color inherited from text.
- Status colours: sage green (approved), amber (pending), muted brick (changes requested). No saturated reds or neons.

Monaco's diff editor uses the matching Catppuccin theme (`@catppuccin/vscode` adapted to a Monaco theme definition).

## Error handling

Errors returned by Tauri commands are tagged enums; React maps each tag to a specific UX.

| Error              | Source                              | UX                                                                          |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------------- |
| `AuthError`        | invalid or expired PAT              | Global banner "Token inválido"; Reauth button opens Settings.               |
| `RateLimited`      | GitHub 403 + headers                | Toast with countdown to `reset_at`; refresh disabled; cache still served.   |
| `NetworkError`     | offline / DNS / timeout             | Discreet banner "Offline — usando cache"; drafts continue to work.          |
| `NotFound`         | PR deleted or moved                 | Toast; PR removed from the list.                                            |
| `Conflict`         | draft line shifted in newer diff    | Modal: keep / discard / reposition draft.                                   |
| `SubmitFailed`     | review POST failed                  | Drafts preserved; error detail shown in the modal; Retry button.            |
| `InternalError`    | unexpected backend failure          | Toast "Erro interno — abrir logs"; link opens the log file.                 |

Submit is all-or-nothing: a failed submission never leaves partial state on GitHub and never loses drafts locally.

## Logging

`tracing` writes to `~/.local/state/pr-reviewer/log.txt`. Files rotate at 5 MB and keep the last three. Default level `info`; `RUST_LOG=debug` switches to debug. A Settings button opens the current log file in the default text editor.

## Testing

Rust core carries the bulk of the test weight.

- **Unit tests** for `config`, `path_filter`, `cache` (in-memory SQLite per test).
- **Integration tests** for `github` using `wiremock` against recorded payloads of representative PRs (small, large, binary file, renamed file, deleted file, conflict on resubmit).
- **Coverage target:** ~70 % on the core.

Frontend:

- Component tests with Vitest + React Testing Library for `FileTreePanel` (filtering, expand/collapse), `ReviewSubmitModal` (event toggle, draft list), `PrListPanel` (tab/group rendering).
- No visual snapshot tests of Monaco — high cost, low return.
- No end-to-end tests in the MVP.

Manual smoke checklist before each release:

- PAT flow: invalid → set → valid.
- Both PR lists populate; refresh works.
- Diff renders for: large file, binary file, deleted file, renamed file.
- Inline comment → submit Approve / Comment / Request changes.
- Path filter hides and shows files.
- Panels collapse, persist across restart, and `Ctrl+1` / `Ctrl+2` / `Ctrl+3` toggle them.
- Logs file is reachable from Settings.

## Distribution

Tauri's bundler outputs `.AppImage` (portable) and `.deb` (Debian/Ubuntu/Mint). Releases tagged in git; GitHub Actions builds and attaches both artifacts. No auto-update in the MVP — the user re-downloads.

## Open Questions

These are deferred to plan-writing or implementation:

1. **Reply on existing threads.** GitHub treats new top-level comments and replies differently. MVP scope: replying on existing threads is supported through `POST /pulls/{n}/comments` with `in_reply_to`. To revisit: whether replies should also be batched into the local-draft queue or sent immediately.
2. **Monaco theme generation.** Catppuccin ships VS Code themes; Monaco needs its own theme object. Either hand-port the palette or pull from a community port — to be picked during implementation.
3. **Configured repos vs. inferred.** The MVP uses an explicit list. Future option: also surface PRs from repos detected via `GET /search/issues?q=is:open+involves:@me` even if not in the list, marked as "untracked".

## Out of Scope (explicit non-features)

- Drafting or editing PR bodies.
- Approving and merging from the app.
- File-level "viewed" state synced with GitHub (a local-only flag is acceptable).
- Resolving review threads from the app.
- Multi-account / multi-host support.
