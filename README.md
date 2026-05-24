# Galley

Linux desktop GitHub PR reviewer. Tauri 2 (Rust) + React/TypeScript (Vite).
Built around a calm-workshop design language — linen (dark) / paper (light)
palette, sage accent, hairline borders, mono for facts.

> "Reading. No summaries."

## Status

Personal project, used daily on Fedora. Builds known to work on:

- **Fedora 41–43 / Nobara** — `.rpm` bundle
- **Ubuntu 22.04+** — `.deb` bundle (needs `libwebkit2gtk-4.1`)

macOS / Windows are not tested. Tauri can target them; PRs welcome.

## Install

Grab the matching artefact from the
[latest release](https://github.com/christiansmmc/galley/releases/latest).

### Fedora / RHEL / Nobara

```bash
sudo dnf install ./Galley-<version>-1.x86_64.rpm
```

### Ubuntu / Debian

```bash
sudo apt install ./Galley_<version>_amd64.deb
```

After install, launch from your desktop menu. The binary is at
`/usr/bin/pr-reviewer` (the internal crate name was kept on rename to
preserve dnf upgrade paths).

## First run

Galley needs a GitHub personal access token with the `repo` scope.

1. Create one at <https://github.com/settings/tokens?type=beta> (fine-grained)
   or <https://github.com/settings/tokens> (classic).
2. Paste it on the first-run screen.
3. Add one or more repositories under **Settings → Repositórios**.

The token is stored in your OS keyring (libsecret / secret-service on Linux).
It is **never written to a file inside the project tree or to disk in
plaintext** — keyring is the only persistence path.

## Features

- Multi-repo PR list. Group by repo, glob path filters, fuzzy search.
- Side-by-side or inline diff (Monaco-based). Per-file viewed state.
- Inline comments on the modified side — open threads, drafts, resolved.
  Range comments via line selection.
- Local-first drafts. Persisted in SQLite; submitted as a batch on review.
- Command palette (`Ctrl+K`). Fuzzy across PRs, files, repos, commands.
- Linen (dark) + Paper (light) themes. Sage / ochre / ink / rust accents.
  Compact / comfortable / spacious density.

## Building from source

Requires Rust (latest stable), Node ≥ 20, pnpm, and the Tauri 2 system deps.

### Fedora

```bash
sudo dnf install dbus-devel webkit2gtk4.1-devel libsoup3-devel \
  librsvg2-devel libayatana-appindicator-gtk3-devel openssl-devel gtk3-devel
```

### Ubuntu

```bash
sudo apt install libwebkit2gtk-4.1-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libdbus-1-dev
```

### Build

```bash
pnpm install
pnpm tauri dev                                   # dev mode with hot reload
NO_STRIP=true pnpm tauri build --bundles rpm     # Fedora rpm
NO_STRIP=true pnpm tauri build --bundles deb     # Ubuntu deb
```

`NO_STRIP=true` is required on Fedora — linuxdeploy's bundled `strip` cannot
read `SHT_RELR` in modern host libs.

Webkit + Wayland on Fedora needs `WEBKIT_DISABLE_DMABUF_RENDERER=1`; `main.rs`
already sets this before webkit init.

## Tests

```bash
pnpm tsc --noEmit                # type check
pnpm test                        # vitest component tests
cd src-tauri && cargo test       # Rust unit + integration tests
pnpm exec vite build             # production build
```

## Config locations

Galley uses the standard XDG dirs (paths follow the internal crate name):

- `~/.config/pr-reviewer/config.toml` — repos, path filters, UI prefs.
- `~/.local/share/pr-reviewer/cache.db` — SQLite cache + drafts.
- `~/.local/state/pr-reviewer/log.txt` — tracing logs.
- OS keyring — PAT (service = `pr-reviewer`, account = `github`).

## Project layout

```
src/                React frontend
  components/       UI (diff, files, prs, layout, settings, ui primitives)
  state/            Zustand stores (prsStore, settingsStore, draftsStore, uiStore)
  ipc/              Tauri command bindings (TS) + shared types
  styles/           tokens.css + globals.css

src-tauri/          Rust backend (Tauri 2)
  src/commands/     Tauri commands wired into invoke_handler
  src/secrets.rs    OS keyring access for the GitHub PAT
  capabilities/     Window/event permissions

design/etapa3-workshop/   Reference mock (HTML) + design spec
docs/superpowers/         Workshop progress notes, plans, specs
```

## License

MIT.
