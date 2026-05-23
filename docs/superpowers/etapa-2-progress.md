# Etapa 2 — Progress tracker

> Source of truth for which sub-phase is active. Updated after every implementation step. Survives context loss / new sessions.

**Spec:** `docs/superpowers/specs/2026-05-23-etapa-2-design.md`
**Plan:** `docs/superpowers/plans/2026-05-23-etapa-2-plan.md`

## Status

| Sub-phase | Branch | State | Reviewed at |
|---|---|---|---|
| 2.0 — Close MVP gaps + cache | `feat/etapa-2-0-mvp-close` | Done (approved 2026-05-23) | 2026-05-23 |
| 2.1 — Design system foundation | `feat/etapa-2-1-design-system` | Done (approved 2026-05-23) | 2026-05-23 |
| 2.2 — PR list redesign | `feat/etapa-2-2-pr-list` | Done (approved 2026-05-23) | 2026-05-23 |
| 2.3 — Layout global | `feat/etapa-2-3-layout` | Done (approved 2026-05-23) | 2026-05-23 |
| 2.4 — Diff & comments redesign | `feat/etapa-2-4-diff-comments` | Ready for review | — |
| 2.5 — File tree advanced | `feat/etapa-2-5-file-tree` | Not started | — |
| 2.6 — Settings refactor + repo add | `feat/etapa-2-6-settings-repos` | Not started | — |
| 2.7 — Command palette + empty states | `feat/etapa-2-7-palette-polish` | Not started | — |

**Possible states:** `Not started` · `In progress` · `Ready for review` · `Changes requested` · `Done (approved YYYY-MM-DD)`

## Active sub-phase

**Currently:** 2.4 — Diff & comments redesign. Branch `feat/etapa-2-4-diff-comments`. Ready for smoke.

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

## 2026-05-23 — Sub-phase 2.1 ready for review

- `src/styles/tokens.css` added with spacing / type / radius / shadow / motion / z-index / control-height scales. `globals.css` `@import`s tokens and keeps legacy aliases (`--pad`, `--gap`, `--radius`) so any unrefactored consumer keeps working.
- `src/components/ui/` houses the primitive library: `Button` (variants × sizes + icon), `Input`, `Textarea`, `Dropdown`, `Modal` (with Esc-to-close), `Tabs`, `Tooltip`, `Badge`, `Avatar` (GitHub-derived URL with initial fallback), `Spinner`, `EmptyState`. Re-exported via `ui/index.ts`.
- Hover / focus-visible states live in `globals.css` via classes `prr-btn`, `prr-input`, `prr-row` (selectable list rows). `--shadow-focus` doubles as the focus ring.
- `common/Modal.tsx` deleted — only two import sites (`SettingsModal`, `ReviewSubmitModal`) were updated to consume `ui/Modal`. Banner + ToastStack moved to token-driven spacing while staying in `common/`.
- Refactor pass touched: settings (Pat, Repos, Filters, SettingsModal), PR list (panel + item, EmptyState for the empty case), file tree (node + panel + group header), diff inline widgets (Editor, Draft, Thread — Thread now shows Avatars per comment), PanelHeader, App shell (FAB + gear).
- Hidden gallery route: open the app with `#/__ui` to render `UiGallery.tsx` — every primitive in one page. Useful for smoke before approval.
- `pnpm tsc --noEmit`, `pnpm test`, `cargo test`, and `pnpm exec vite build` all clean.

## 2026-05-23 — Sub-phase 2.2 ready for review

- `PrSummary` extended with `changed_files: i64` and `ci_status: CiStatus` (passing/pending/failing/none). Search list endpoint doesn't expose either, so `list_prs` fans out per-PR concurrent fetches via `tokio::task::JoinSet`: one `/repos/{o}/{r}/pulls/{n}` (changed_files + head sha) and one `/commits/{sha}/status` (combined state). Errors are swallowed — affected rows fall back to defaults. List-cache TTL (60 s) absorbs the extra latency on warm fetches.
- `get_pr` augments its `summary` with the same fields using the same helpers — keeps PR-detail consumers consistent.
- Frontend: persistent search input at top of PR list panel (`Ctrl+P` focuses + selects), tab labels show counts (`Pra revisar (N)` / `Meus (N)`), repo group header shows repo name only with `owner/repo` tooltip on hover, PR title truncates to one line with ellipsis + tooltip, meta line is `author · age · N changed`, CI dot at left of each row. `formatAge` util added (`src/util/time.ts`) returning `30s` / `10m` / `2h` / `3d` / `2w` / `3mo` / `2y`.
- Empty states branched: no repos, no PRs (inbox vazio), tab empty, and search-no-match — all via the `EmptyState` primitive.
- Tests: new `formatAge.test.ts`, expanded `PrListPanel.test.tsx` to cover search filter, Ctrl+P focus, tab counts, and empty-search state. Existing fixtures updated to include the new `PrSummary` fields.
- `pnpm tsc --noEmit`, `pnpm test`, `cargo test`, and `pnpm exec vite build` all clean.

## 2026-05-23 — Sub-phase 2.3 ready for review

- `PrDetail` gained `additions`, `deletions`, `reviewers_count` (parsed from `/pulls/{n}` — `requested_reviewers` array length). Frontend types + 3 test fixtures updated.
- `GlobalHeader` replaces the bare gear bar. No PR open → "Pull Requests" title + gear. PR open → breadcrumb `owner/repo › #N title` + back arrow (only when PR list is collapsed) + file-tree toggle + `Revisar (N)` primary button + gear. FAB removed; Revisar lives in the header now.
- PR list autocollapse: `openPr` success sets `uiStore.prListCollapsed = true`; Layout's PR Panel reacts imperatively (`.collapse()/.expand()`) via the panel ref. `onResize` keeps the flag in sync when the user drags the separator.
- File tree stays as a resizable Panel column (not an overlay drawer — user pushed back on the drawer design from the original 2.3 plan). Visible by default when a PR is open. `Ctrl+2` collapses/expands. Collapse icon (`PanelLeftClose`) lives in the file tree panel header; the `Files` button in the global header re-expands when collapsed.
- `PrMetaStrip` under the header: `author · age · N files · +X −Y · CI dot+label · N reviewer(s)` with a Draft badge when `pr.draft`. PR body is a collapsible block below the meta line (plaintext for now; `<pre>` with `pre-wrap` + 240 px scroll cap).
- Shortcuts refactor: `useGlobalShortcuts` now in App (was in Layout). Ctrl/Cmd+1 toggles PR list via uiStore; Ctrl/Cmd+2 toggles file tree drawer. `PanelHeader` deleted — no longer used.
- New tests: `GlobalHeader.test.tsx`, `PrMetaStrip.test.tsx` (breadcrumb assertions, draft count in Revisar label, reviewer singular/plural, body toggle). Existing PrDetail fixtures updated to include the new fields.
- `pnpm tsc --noEmit`, `pnpm test` (21/21), `cargo test` (14/14), `pnpm exec vite build` all clean.

## 2026-05-23 — 2.3 approved

Approved after several layout-feel tweaks during smoke:

- **Overlay drawer → resizable Panel.** The original 2.3 plan had the file tree as a Ctrl+2 drawer floating over the diff. In practice the user wanted it visible by default once a PR opens, with a regular collapse affordance. Drawer code (`FileTreeDrawer.tsx` + test) was deleted; file tree is back as a 3rd Panel with collapse button in its own header.
- **Back arrow closes the PR.** It used to only re-expand the PR list; the diff editor stayed mounted and could only be dismissed by re-clicking the same PR. Added `prsStore.closePr` (clears currentPr, diff, threads, selectedFile, prError) and wired the back arrow to call it.
- **No PR → no split.** When `currentPr` is null, Layout renders the PR list at 22% with a blank right pane — no file-tree placeholder, no diff placeholder, no inner separator.
- **File tree opens at PR-list width.** Setting `defaultSize={22}` was not enough because the Group re-normalizes after PR list `.collapse()` (PR list goes to 0, the remaining 22+56 grow to fill 100, so the tree visually swelled to ~28%). Fix: after collapsing PR list, imperatively `fileTreeRef.resize(22)` so the tree stays at 22% of the parent group and the diff absorbs the slack.
- **Files toggle removed from GlobalHeader.** Re-open affordance is a 22 px rail flush to the left edge that appears when both side panels are collapsed.

Carry-forward for later sub-phases:
- The Panel API has no `onCollapse`/`onExpand` props (only `onResize`). We sync `uiStore.prListCollapsed` / `fileTreeCollapsed` via `onResize` with a 0.5% threshold. If 2.4+ adds more panels (e.g. drafts slide-in), reuse this pattern rather than reaching for an external state library.
- `useGlobalShortcuts` is the single owner of Ctrl+1 / Ctrl+2. Add new global shortcuts there, not scattered.

## 2026-05-23 — 2.2 approved

- Smoke caught one gap: PRs on repos that only use GitHub Actions (Checks API) showed the gray "no checks" dot because the legacy combined-status endpoint returns `total_count = 0` for them. Fixed with a fallback to `/commits/{sha}/check-runs` that aggregates conclusions (`pending` if any run is non-completed, `failing` if any conclusion is failure-ish, otherwise `passing`).
- Carry-forward: `list_prs` is cached for 60 s and the Refresh button doesn't invalidate the list cache — only the per-PR detail/diff/threads bundle. Re-testing CI-status fixes meant waiting out the TTL. Worth wiring a `force_refresh` path through `refreshLists` → `list_prs` in a later sub-phase (probably 2.6 when settings/repos touch the list invalidation anyway).

## 2026-05-23 — Sub-phase 2.4 ready for review

- **Submit review → slide-in panel.** New `ui/SlidePanel` primitive anchored to the right edge (420 px, max 92 vw, click-backdrop and Esc to close). `ReviewSubmitModal` deleted; `ReviewSubmitPanel` is the new component, same submit semantics. App.tsx + GlobalHeader still toggle it via `onOpenSubmit`.
- **Mark viewed per file.** New SQLite `viewed_files (pr_id, path)` table with PK on the tuple + an index on pr_id. Rust module `viewed` exposes `list`/`mark`; Tauri commands `list_viewed_files` + `mark_viewed`. `prsStore.viewedFiles` is a `Set<string>` populated alongside diff/threads in `openPr`, reset by `closePr`. DiffPanel header shows a pill toggle "Marcar como visto" / "Visto" (green border + check icon when on). Persists across app restarts because it's row-based, not bound to the cache TTL.
- **Diff render mode setting.** `UiPrefs.diff_render_mode` added Rust-side (`#[serde(default)]` for backward compat with older configs missing the key). New `Settings → Diff` section with three pill buttons. `useDiffRenderMode(pref)` hook resolves the pref into `renderSideBySide: boolean`, listening to `window.resize` only while pref is `auto`. Auto threshold = 1100 px (constant exported from the hook). The pre-2.4 DiffPanel never had a render-mode toggle in its header, so nothing to remove from there.
- **Inline thread polish.** `InlineThreadWidget` reply textarea now grows from 2→4 rows on focus or when it has content. Resolve button surfaces in the thread header when `node_id` is present; click → GraphQL `resolveReviewThread` mutation → refresh threads → toast.
- **GraphQL augmentation for threads.** `ReviewThread` gained `node_id: Option<String>` and `resolved: bool`. After the REST `/pulls/{n}/comments` fetch, `get_pr_threads` fires one GraphQL query (`reviewThreads(first:100){id isResolved comments(first:1){nodes{databaseId}}}`) to map each thread's root databaseId → `(node_id, isResolved)`. Resolved threads are dropped server-side from the returned vec. New `resolve_thread` Tauri command + `api.resolveThread` IPC binding. Threads cache invalidated after resolve.
- **CommentLineModal / ThreadsSidebar:** already absent from the tree (2.0 deleted them ahead of schedule). Nothing left to remove for the spec's item 5.
- **Tests:** added `ReviewSubmitPanel.test.tsx` (dialog role + submit roundtrip), `InlineThreadWidgetResolve.test.tsx` (resolve button visibility + IPC payload), `useDiffRenderMode.test.ts` (pref + width matrix), Rust `viewed_test.rs` (roundtrip + idempotent mark + unmark). Updated `InlineThreadWidget.test.tsx` fixtures for the new ReviewThread fields. `pnpm tsc --noEmit`, `pnpm test` (27/27), `cargo test` (15/15), `pnpm exec vite build` all clean.
