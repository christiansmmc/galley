# PR Reviewer

Linux desktop app for reviewing GitHub PRs — IntelliJ-like clean UI, Catppuccin-themed, with local draft comments and batched review submission.

## Stack

Tauri 2 (Rust) + React 19 + TypeScript + Vite. Monaco DiffEditor side-by-side. SQLite cache (rusqlite, bundled). OS keyring for the PAT.

## Build

```bash
pnpm install
pnpm tauri build
```

Artifacts in `src-tauri/target/release/bundle/`.

System deps on Fedora:

```bash
sudo dnf install dbus-devel webkit2gtk4.1-devel libsoup3-devel \
  librsvg2-devel libayatana-appindicator-gtk3-devel openssl-devel gtk3-devel
```

Debian/Ubuntu equivalents: `libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libdbus-1-dev`.

## Dev

```bash
pnpm tauri dev
```

## Tests

```bash
cd src-tauri && cargo test     # Rust unit + integration tests
pnpm test                      # Vitest component tests
```

## First run

1. Generate a GitHub PAT with `repo` scope.
2. Open the app, paste the PAT, save.
3. Settings gear → add at least one repo.
4. PR list populates.

## Manual smoke checklist (pre-release)

- [ ] PAT flow: invalid token rejected → valid token accepted.
- [ ] Both PR lists (Meus / Pra revisar) populate; refresh works.
- [ ] Diff renders for: large file, binary file, deleted file, renamed file.
- [ ] Inline comment modal → draft persists → submit Approve / Comment / Request changes.
- [ ] Path filter hides files; toggle reveals them.
- [ ] Panels collapse and `Ctrl+1` / `Ctrl+2` toggle them.
- [ ] Logs file at `~/.local/state/pr-reviewer/log.txt` is created.

## Config

- `~/.config/pr-reviewer/config.toml` — repos, path filters, UI prefs.
- `~/.local/share/pr-reviewer/cache.db` — SQLite cache + drafts.
- `~/.local/state/pr-reviewer/log.txt` — tracing logs.
- OS keyring — PAT (service=`pr-reviewer`, account=`github`).
