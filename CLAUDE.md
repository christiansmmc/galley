# pr-reviewer — agent guide

Tauri 2 (Rust backend) + React/TS (Vite) GitHub PR reviewer. Linux desktop. Master is the long-lived branch; sub-phases land via `--no-ff` merge commits, not GitHub PRs (see `docs/superpowers/etapa-2-progress.md` for the pattern).

## Release after every shipped change

When a feature lands or a fix is merged to `master`, ALWAYS:

1. **Bump version** in both files (keep them in sync):
   - `src-tauri/tauri.conf.json` → top-level `"version"`
   - `src-tauri/Cargo.toml` → `[package] version`
   - Scheme: patch bump (`0.2.0` → `0.2.1`) for fixes; minor bump (`0.2.x` → `0.3.0`) for new features; major (`0.x.y` → `1.0.0`) only for breaking UX/data-format changes. When in doubt, patch.
2. **Commit the bump** with message `chore(release): vX.Y.Z — <one-line summary>`.
3. **Build the rpm** (this user is on Fedora/Nobara, rpm integrates with the system menu):
   ```bash
   NO_STRIP=true pnpm tauri build --bundles rpm
   ```
   `NO_STRIP=true` is required — linuxdeploy's bundled `strip` can't read `SHT_RELR` in modern host libs.
4. **Reply to the user with the install command verbatim** so they can paste it:
   ```bash
   sudo dnf install "src-tauri/target/release/bundle/rpm/PR Reviewer-X.Y.Z-1.x86_64.rpm"
   ```
   (note: rpm filename uses `PR Reviewer-…` with a space, not `pr-reviewer-…`)

Do **not** ask the user whether to bump — bump every time. Do **not** run `sudo dnf install` yourself; surface the command for the user to run interactively.

## Workflow rules carried over from etapa 2

- Tests must all pass before claiming done: `pnpm tsc --noEmit`, `pnpm test`, `cargo test`, `pnpm exec vite build`.
- For sub-phases of an "etapa": branch `feat/etapa-N-M-<slug>` from `master`, commit granular changes, merge with `--no-ff` (use `/usr/bin/git` directly — the `rtk` wrapper silently strips `--no-ff`).
- Tauri v2 `core:default` does NOT include sensitive window/event ops. Anything new (drag, resize, focus, listen) needs an explicit `core:window:allow-*` / `core:event:allow-*` line in `src-tauri/capabilities/default.json`.
- Webkit + Wayland on Fedora/Nobara crashes on launch without `WEBKIT_DISABLE_DMABUF_RENDERER=1`. `main.rs` already sets this before webkit init; don't remove it.
- AppImage build (rare; rpm is preferred): same `NO_STRIP=true` flag, `--bundles appimage`. Docs: `docs/appimage-bundle.md`.

## Project structure pointers

- Etapa progress + plan + design: `docs/superpowers/etapa-*-progress.md`, `docs/superpowers/plans/`, `docs/superpowers/specs/`.
- Frontend state: zustand stores in `src/state/` (prsStore / settingsStore / draftsStore / uiStore).
- Tauri commands surface: `src-tauri/src/commands/`, registered in `main.rs` invoke_handler.
- IPC contract: `src/ipc/client.ts` (TS) + `src/ipc/types.ts` (TS types mirror Rust `Settings` / `PrDetail` / etc.).
