# Whole-file diff toggle — design

**Date:** 2026-05-26
**Status:** approved, pending implementation plan

## Problem

The diff viewer (`src/components/diff/DiffPanel.tsx`) shows only the changed
hunks. `parseDiff(file.patch)` reconstructs `original`/`modified` strings from
the GitHub unified patch, which contains only changed lines plus ~3 lines of
context. Reviewers cannot see the rest of the file for context. We want an
**opt-in, per-file** mode that shows the whole file with the modifications
highlighted — not the default.

## Decisions (locked)

- **Scope:** full file, side-by-side. Fetch base + head blobs; Monaco diffs the
  whole file. Changed lines highlighted, everything else visible as context.
- **Activation:** per-file toggle button in the DiffPanel header. Default off.
  Resets to default (patch view) when the selected file changes.
- **Comments:** only changed lines are commentable, even in whole-file mode.
  GitHub's review-comment API rejects lines outside the diff (422). Context
  lines are visible but not commentable. Existing threads/drafts anchor as today.
- **Blob cache:** permanent. Content at a given SHA is immutable, so cached
  blobs never go stale.
- **Render mode:** works in both side-by-side and inline — same `ParsedDiff`
  model, Monaco renders per the existing `diff_render_mode` preference.

## Approach (chosen)

Reuse the existing `ParsedDiff` interface in both modes. Whole-file mode
produces the same shape DiffPanel already consumes (full texts, identity line
maps, commentable sets derived from the patch). All downstream machinery —
Monaco diff highlighting, gutter line remap, view zones, comment/draft/thread
anchoring — consumes `ParsedDiff` and needs no change.

Rejected alternative: a parallel full-file render path with its own comment
anchoring — duplicates view-zone/gutter logic. YAGNI.

## Backend (`src-tauri`)

- **`GitHubClient::get_file_content(owner, repo, path, git_ref) -> AppResult<Option<String>>`**
  (in `src/github/diffs.rs`). Uses octocrab's `repos().get_content()` (JSON
  contents API, base64-encoded response). Decodes via `Content::decoded_content()`.
  Returns `None` for 404 (missing file at ref) or when `content` is absent (files
  >1 MB: GitHub sets `encoding: "none"` and omits the content field, so
  `decoded_content()` returns `None` → `Ok(None)` → frontend falls back with a
  toast). Other HTTP errors propagate through `map_status_error`. The 1 MB cap is
  inherent to the JSON contents endpoint; no separate guard is needed.
- **Blob cache** in `src/cache/ttl.rs`: `get_blob`/`put_blob` keyed by
  `"{sha}:{path}"`. Permanent (no TTL check) — immutable per SHA.
- **Tauri command** `get_file_content(owner, repo, path, git_ref, state)` in
  the commands layer, registered in `main.rs` invoke_handler. Cache-first:
  check blob cache, else fetch and store.

## Frontend

### IPC (`src/ipc`)
- `getFileContent(owner, repo, path, ref): Promise<string | null>` in
  `client.ts`. No new type needed (returns string | null).

### Model (`src/components/diff/`)
- Extract `parseDiff` into `parseDiff.ts` (currently inline in DiffPanel) for
  testability. While there, have it also expose
  `commentableModifiedFileLines: Set<number>` and
  `commentableOriginalFileLines: Set<number>` — the *file* line numbers (not
  editor lines) of `+`/`-` lines — so whole-file mode can build commentable
  sets without re-parsing.
- New `buildFullFileModel(baseContent, headContent, patch): ParsedDiff`:
  - `original` = base blob (or `""` for added files),
    `modified` = head blob (or `""` for removed files).
  - line maps = identity: editor line N → file line N, reverse identity. No
    hunk-separator `null` rows.
  - `commentableModified` / `commentableOriginal` = the changed file lines from
    the patch (identity ⇒ file line == editor line in this mode).

### DiffPanel
- Local state `wholeFile: boolean`, reset via `useEffect` on `selectedFile`.
- Header toggle button (unfold/expand icon). Disabled when `file.patch == null`
  (binary / too large).
- When on: fetch base content (at `base_sha`, using `previous_path` when the
  file is renamed) and head content (at `head_sha`). Show a spinner in the
  panel while loading.
  - success → feed `buildFullFileModel(...)` output to Monaco instead of
    `parseDiff(file.patch)`.
  - failure / blob `None` → toast and auto-revert to patch view.
- `base_sha` / `head_sha` come from `currentPr` (PrDetail) in the prs store.

### Edge cases
- Added file: `status == "added"` → no base blob, `original = ""`.
- Removed file: `status == "removed"` → no head blob, `modified = ""`.
- Renamed file: base blob fetched at `previous_path`.
- Binary / `patch == null`: toggle disabled.
- Fetch error: revert + toast.

### i18n
- New strings for the toggle button label + tooltip (both locales).

## Testing

- Unit (`buildFullFileModel`): identity maps; commentable set derived from
  patch; added / removed / renamed shapes.
- `parseDiff` extraction: existing behavior preserved (add a characterization
  test if none exists).
- Gates: `pnpm tsc --noEmit`, `pnpm test`, `cargo test`, `pnpm exec vite build`.

## Out of scope

- Expand-context-incrementally (GitHub-style expand arrows).
- Commenting on unchanged/context lines.
- Persisting the toggle as a global setting (it is per-file, ephemeral).
