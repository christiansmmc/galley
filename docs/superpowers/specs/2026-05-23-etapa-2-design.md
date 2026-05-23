# Etapa 2 — Design Spec

**Date:** 2026-05-23
**Status:** Approved — broken into 7 testable sub-phases (see `docs/superpowers/plans/2026-05-23-etapa-2-plan.md`)
**Owner:** csequeira153@gmail.com
**Previous:** etapa 1 (MVP) — `docs/superpowers/specs/2026-05-22-github-pr-reviewer-design.md`

## Goals

- Close MVP gaps left in etapa 1 (line-click comments, cache, reply threads, AppImage).
- Replace generic UI with a polished, opinionated design language (calm, dense but not cramped, identity).
- Improve power-user workflow (command palette, shortcuts, multi-line comments).
- Make repo configuration low-friction (URL paste, repo browse modal).
- Handle Java-style deep package paths in the file tree.

## Non-Goals

- Multi-platform (macOS/Windows) — deferred to etapa 3.
- GitLab/Bitbucket — deferred to etapa 3.
- AI review assist — deferred.
- Multi-account — deferred.
- Tray icon / notifications — deferred.
- Custom titlebar (Graphite-style) — optional within 2.7, otherwise deferred.

## Decisions locked

These are answered. The plan implements them as-is.

### Repository add (sub-phase 2.6)

- Accept URL paste OR `owner/repo` short form OR space-separated. Regex parser supports:
  - `https://github.com/owner/repo[/<anything>]`
  - `git@github.com:owner/repo.git`
  - `owner/repo`
  - `owner repo`
- Validate via `GET /repos/{owner}/{repo}` before saving. Show "Repo não acessível com seu PAT" on 404/403.
- Browse modal: `GET /user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`, paginated lazy load, filter pills (Meus / Org / Forks / Arquivados), checkboxes pre-checked for already-configured repos, multi-select OK, save = sync (add new + remove unchecked).

### PR list (sub-phase 2.2)

- CI status indicator (🟢🟡🔴⚪) on the left of each item — colours mean passing / pending / failing / no-checks. (Review state stays on a future iteration.)
- Search input persistent at the top of the panel. Placeholder: `🔍 Buscar título, autor, #...`. Scope: PR title + author login + PR number. Body excluded (noisy, slow).
- Search keyboard shortcut: `Ctrl+P` focuses the input.
- Repo group header shows the repo *name only* (no owner). Tooltip on hover reveals `owner/repo`.
- PR title truncated to 1 line with ellipsis. Tooltip reveals the full title.
- Tab counts: "Pra revisar (3)" / "Meus (1)".
- Meta line: `author · age · N changed`.

### PR detail (sub-phase 2.3, 2.4)

- Global header with breadcrumb: `← scorehub-api › #42 Fix login bug` + `[📤 Revisar]` button + ⚙ settings on the right. Replaces the empty bar from etapa 1.
- PR meta strip under the header: `author · age · N files · +X −Y · CI · N reviewers`.
- PR description (body) renders collapsed; expand to read.
- PR list autocollapses when a PR is opened.
- File tree becomes an overlay drawer (not a fixed column). `Ctrl+2` opens / closes. Floats over content, backdrop semi-transparent, ESC or click-outside dismisses.
- Threads render inline inside the diff as widgets (not as a fixed sidebar). Cursor/Zed-style. Pin shows `💬 N`; expanding inline reveals the comments + reply box + resolve button.
- Hover on any diff line shows a `+` gutter affordance that opens the inline draft input on that line.
- Multi-line drafts: user drags a selection across diff lines, a floating button `💬 Comentar N linhas` appears; clicking it creates a draft with `start_line` + `line` set per the selection. Submitted via GitHub's range-comment API (`start_line`, `start_side`, `line`, `side`).
- "Mark viewed" toggle per file. Local-only (no GitHub sync yet — spec keeps that local-only flag).
- Diff render mode adaptive: window width < 1100 px forces inline; ≥ 1100 px respects user pref. Toggle lives in **Settings**, not the diff header.
- Drafts panel: floating button bottom-right `[✉ N rascunhos]`. Clicking opens a slide-in panel from the right with the draft list, review-event picker (`Comentar | Aprovar | Pedir mudanças`), summary textarea, and submit/cancel buttons. Replaces the current ReviewSubmitModal.

### File tree (sub-phase 2.5)

- **Compact linear paths** ON by default. A directory containing exactly one directory child is joined with its child, recursively. Separator chosen by content: `.` if the joined path looks Java-style (`com.*`), `/` otherwise.
- Stop joining when the next level is a file or has siblings.
- Tooltip shows the full unjoined path.
- **Flat mode** as an alternative view: show only files with their directory next to the filename (`📄 UserController.java   api/controller`). Toggle in the drawer header: `[🌲 Tree | ☰ Flat]`.
- File-name search inside the drawer.
- Linear-path compaction toggleable in Settings (default ON).

### Command palette (sub-phase 2.7)

- `Ctrl+K` opens. ESC or backdrop click closes.
- Modes:
  - Default: fuzzy match against PRs (open in any configured repo) and files (within the current PR if open).
  - `>` prefix: command mode — refresh, settings, change theme, submit review.
- Each command/PR has its keyboard shortcut on the right when applicable.

### Empty states (sub-phase 2.7)

- No repos configured: centered card with 📦 + "Nenhum repo ainda" + CTA `[+ Adicionar repo]` opening the Settings → Repos section.
- No PRs (repos exist): centered card with 🎉 + "Inbox vazio" + Refresh button.
- Existing copy is kept terse and pt-BR.

### Settings (sub-phase 2.6)

- Refactor into a two-column layout: section list on the left, content on the right.
- Sections: **Aparência**, **Repositórios**, **Filtros**, **Diff**, **Conta**, **Atalhos**.
- Aparência: theme picker (System/Light/Dark), Compactar diretórios lineares toggle, Densidade (Compacta/Confortável/Espaçosa) — Confortável default.
- Repositórios: list of configured repos + paste-URL input + "Procurar meus repos no GitHub" CTA.
- Filtros: existing path-filter editor (unchanged behaviour, polished styling).
- Diff: render mode (Side-by-side / Inline / Auto), font size, font family.
- Conta: PAT manage (replace, clear), connected user info.
- Atalhos: read-only listing.

### Design tokens (sub-phase 2.1)

```
SPACING:    4  8  12  16  24  32  48
RADIUS:     4  6  8   12
FONT SIZE:  11 12 13  14  16  20  24
WEIGHTS:    400 (body) | 500 (label/strong) | 600 (heading)
LINE HEIGHT: 1.4 (dense) | 1.6 (default) | 1.8 (relaxed)

SHADOWS:
  subtle:    0 1px 2px rgba(0,0,0,.04)
  medium:    0 4px 12px rgba(0,0,0,.08)
  elevated:  0 12px 32px rgba(0,0,0,.16)

TRANSITIONS:
  fast:      100ms cubic-bezier(0.4, 0, 0.2, 1)
  base:      180ms cubic-bezier(0.4, 0, 0.2, 1)
  slow:      260ms cubic-bezier(0.4, 0, 0.2, 1)
```

Catppuccin palette continues. Accents stay muted (mauve/blue), status colours stay desaturated (sage/amber/brick).

### Component library (sub-phase 2.1)

Reusable primitives (replace inline-styled blobs scattered across etapa 1 code):

- `<Button variant="primary|ghost|danger" size="sm|md|lg" />`
- `<Input />`, `<Textarea />`
- `<Modal />` (already exists — refactor to use tokens)
- `<Dropdown />` / `<Combobox />`
- `<Tabs />`, `<Tab />`
- `<Tooltip />`
- `<Badge variant="success|warn|danger|neutral" />`
- `<Avatar src login />`
- `<Spinner />`
- `<EmptyState icon title body action />`

Each component lives in `src/components/ui/`. App-level components in `components/prs/`, `components/diff/`, etc., are refactored to consume them.

### Backend additions

- `GET /user/repos` paginated wrapper in `github::repos` module (for the browse modal).
- `validate_repo(owner, repo)` Tauri command — calls `/repos/{owner}/{repo}` and returns the resolved repo or AppError.
- `parse_repo_input(input: string)` — pure Rust function in `path_filter` style (probably a new `repo_input` module), with TDD: tests cover the four supported URL forms.
- Cache reads/writes wired in `get_pr` / `get_pr_diff` / `get_pr_threads`. TTLs from spec (60 s lists, 5 min details). `refresh_pr` truly bypasses cache.
- Reply on thread: expose `reply_to_thread` Tauri command (backend already implements it).
- Mark-viewed: new `viewed_files` table OR JSON blob in config. Per-PR-per-file local flag. Persisted in SQLite.

## Manual smoke checklist (re-uses MVP one)

Re-validate after each sub-phase per its own acceptance criteria; the full checklist below is run at the end of 2.7.

- [ ] PAT flow valid + invalid.
- [ ] Both PR lists populate; search filters works.
- [ ] Diff renders for: large file, binary file, deleted file, renamed file, Java file with deep package.
- [ ] Click line → `+` → inline draft → submit Approve / Comment / Request changes.
- [ ] Multi-line selection → range comment.
- [ ] Reply on existing thread.
- [ ] Path filter hides files; flat mode toggle works.
- [ ] File tree compact paths render readable on deep Java packages.
- [ ] Drawer file tree opens/closes via `Ctrl+2`, ESC, click-outside.
- [ ] Command palette finds PRs + files + commands.
- [ ] Add repo via URL paste.
- [ ] Add repo via browse modal (multi-select).
- [ ] Cache cuts repeat fetches (offline test: open PR with network off, sees cached content).
- [ ] Empty states render when no repos / no PRs.
- [ ] Logs file exists.
