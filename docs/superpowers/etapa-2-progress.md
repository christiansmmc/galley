# Etapa 2 — Progress tracker

> Source of truth for which sub-phase is active. Updated after every implementation step. Survives context loss / new sessions.

**Spec:** `docs/superpowers/specs/2026-05-23-etapa-2-design.md`
**Plan:** `docs/superpowers/plans/2026-05-23-etapa-2-plan.md`

## Status

| Sub-phase | Branch | State | Reviewed at |
|---|---|---|---|
| 2.0 — Close MVP gaps + cache | `feat/etapa-2-0-mvp-close` | Done (approved 2026-05-23) | 2026-05-23 |
| 2.1 — Design system foundation | `feat/etapa-2-1-design-system` | Not started | — |
| 2.2 — PR list redesign | `feat/etapa-2-2-pr-list` | Not started | — |
| 2.3 — Layout global | `feat/etapa-2-3-layout` | Not started | — |
| 2.4 — Diff & comments redesign | `feat/etapa-2-4-diff-comments` | Not started | — |
| 2.5 — File tree advanced | `feat/etapa-2-5-file-tree` | Not started | — |
| 2.6 — Settings refactor + repo add | `feat/etapa-2-6-settings-repos` | Not started | — |
| 2.7 — Command palette + empty states | `feat/etapa-2-7-palette-polish` | Not started | — |

**Possible states:** `Not started` · `In progress` · `Ready for review` · `Changes requested` · `Done (approved YYYY-MM-DD)`

## Active sub-phase

**Currently:** none — 2.0 approved 2026-05-23, awaiting kickoff of 2.1.

## Notes / decisions during execution

Append entries here as discoveries surface. Format: `## YYYY-MM-DD — short title` followed by 1-3 bullets.

## 2026-05-23 — Sub-phase 2.0 ready for review

- Cache module gained a `ttl.rs` helper layer with read-through / put / invalidate APIs. Diff and threads bundle into single rows keyed by a deterministic synthetic pr_id derived from (owner, repo, number) — sidesteps a race where `openPr` fetches PR + diff + threads concurrently.
- Drafts table extended in-place with `start_line` / `start_side` columns (ALTER TABLE with column-presence probe; old DBs upgrade silently).
- Monaco view zones: gutter `+` glyph, click → inline editor view zone; drag-select → floating "Comentar N linhas" button; existing threads + saved drafts render inline. Each zone owns its own React root via `createRoot`; tracked in a Map and unmounted on a deferred microtask to dodge React's commit-phase unmount warning.
- ThreadsSidebar is no longer rendered in DiffPanel but the file is kept until sub-phase 2.4 removes it (along with `CommentLineModal`).
- AppImage workaround: `NO_STRIP=true pnpm tauri build --bundles appimage` — linuxdeploy's bundled `strip` can't read the `SHT_RELR` section in modern host libs. Documented in `docs/appimage-bundle.md`. AppImage at ~105 MB.

## 2026-05-23 — 2.0 approved

Approved after a long bug-fix tail during manual smoke. Notable findings worth carrying forward:

- React.StrictMode disabled in `src/main.tsx`: incompatible with `@monaco-editor/react`'s DiffEditor lifecycle (double-mount disposes the model out of order). Don't reintroduce without a different editor adapter.
- `keyring` crate v3 requires `features = ["sync-secret-service"]` on Linux; default backend is `MockCredential` (in-memory) which silently fails to persist the PAT. Documented in `Cargo.toml`.
- Monaco view zones for interactive React widgets needed: `position: relative; zIndex: 1; pointerEvents: auto` on the zone root + `onMouseDownCapture/onMouseUpCapture stopPropagation` for the focus-theft fix + bubble-phase `onClick` (capture-phase stops the click before reaching child buttons) + `keepCurrentOriginalModel`/`keepCurrentModifiedModel` + unique `originalModelPath`/`modifiedModelPath` per (PR, file) + cleanup that snapshots `mounted` entries before the deferred unmount microtask.
- Editor lines vs file lines: parsing must build both `modifiedLineMap` (editor→file) and `modifiedFileToEditor` (file→editor); commentable set excludes hunk separators AND context lines (user model is "only what I modified"); gutter shows file lines via `updateOptions({ lineNumbers })`.
- GitHub `ReviewEvent` enum: use `#[serde(rename_all = "SCREAMING_SNAKE_CASE")]` — `UPPERCASE` produces `REQUESTCHANGES` without the underscore.
- GitHub error extraction: read `Error::GitHub { source }` and surface `source.message + source.errors` — `e.to_string()` collapses everything to "GitHub".
- Threads cache (and PR cache + diff cache) MUST be invalidated after `submit_review` / `reply_to_thread`. Otherwise the user's just-submitted review is invisible until the 5 min TTL.
- `openPr` always force-refreshes (`api.refreshPr`) — covers the case where the PR changed on GitHub between sessions (deleted reviews, new commits). Cache still serves intra-PR file navigation.
- AppImage workaround: `NO_STRIP=true pnpm tauri build --bundles appimage` (linuxdeploy bundled `strip` can't read modern `SHT_RELR` sections). Documented in `docs/appimage-bundle.md`.

Architectural audit: `docs/superpowers/notes/2026-05-23-diff-audit.md` — wrote it mid-2.0 after the bug-whack-a-mole grew tiring; the audit's fix-order matches what shipped. Useful read for future Monaco-adjacent work.
