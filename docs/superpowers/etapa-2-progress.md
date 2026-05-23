# Etapa 2 — Progress tracker

> Source of truth for which sub-phase is active. Updated after every implementation step. Survives context loss / new sessions.

**Spec:** `docs/superpowers/specs/2026-05-23-etapa-2-design.md`
**Plan:** `docs/superpowers/plans/2026-05-23-etapa-2-plan.md`

## Status

| Sub-phase | Branch | State | Reviewed at |
|---|---|---|---|
| 2.0 — Close MVP gaps + cache | `feat/etapa-2-0-mvp-close` | Ready for review (2026-05-23) | — |
| 2.1 — Design system foundation | `feat/etapa-2-1-design-system` | Not started | — |
| 2.2 — PR list redesign | `feat/etapa-2-2-pr-list` | Not started | — |
| 2.3 — Layout global | `feat/etapa-2-3-layout` | Not started | — |
| 2.4 — Diff & comments redesign | `feat/etapa-2-4-diff-comments` | Not started | — |
| 2.5 — File tree advanced | `feat/etapa-2-5-file-tree` | Not started | — |
| 2.6 — Settings refactor + repo add | `feat/etapa-2-6-settings-repos` | Not started | — |
| 2.7 — Command palette + empty states | `feat/etapa-2-7-palette-polish` | Not started | — |

**Possible states:** `Not started` · `In progress` · `Ready for review` · `Changes requested` · `Done (approved YYYY-MM-DD)`

## Active sub-phase

**Currently:** **2.0** — dispatched to implementer agent on 2026-05-23.

## Notes / decisions during execution

Append entries here as discoveries surface. Format: `## YYYY-MM-DD — short title` followed by 1-3 bullets.

## 2026-05-23 — Sub-phase 2.0 ready for review

- Cache module gained a `ttl.rs` helper layer with read-through / put / invalidate APIs. Diff and threads bundle into single rows keyed by a deterministic synthetic pr_id derived from (owner, repo, number) — sidesteps a race where `openPr` fetches PR + diff + threads concurrently.
- Drafts table extended in-place with `start_line` / `start_side` columns (ALTER TABLE with column-presence probe; old DBs upgrade silently).
- Monaco view zones: gutter `+` glyph, click → inline editor view zone; drag-select → floating "Comentar N linhas" button; existing threads + saved drafts render inline. Each zone owns its own React root via `createRoot`; tracked in a Map and unmounted on a deferred microtask to dodge React's commit-phase unmount warning.
- ThreadsSidebar is no longer rendered in DiffPanel but the file is kept until sub-phase 2.4 removes it (along with `CommentLineModal`).
- AppImage workaround: `NO_STRIP=true pnpm tauri build --bundles appimage` — linuxdeploy's bundled `strip` can't read the `SHT_RELR` section in modern host libs. Documented in `docs/appimage-bundle.md`. AppImage at ~105 MB.
- Manual smoke items that need a GUI: gutter `+` hover, click → inline editor, range button position, inline thread reply, cache hit/miss in tracing logs.
