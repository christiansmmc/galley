# Diff editor architectural audit — 2026-05-23

Written during sub-phase 2.0 after bug-whack-a-mole hit fatigue point. Reviewer mapped the diff + comment pipeline end-to-end, identified the root cause (editor-line / file-line conflation), and produced the fix order this branch is now executing.

## Root cause

Two coordinate systems exist and are conflated everywhere:

- **Editor line** — 1-based row in the reconstructed *displayed* string. Hunk separators occupy editor rows. This is what Monaco's `position.lineNumber`, `addZone.afterLineNumber`, `getTopForLineNumber`, decoration ranges, etc. take and return.
- **File line** — 1-based line in the *actual* file on disk. This is what GitHub's review-comment API requires for `line` and `start_line`.

Rule that should hold: anything talking to Monaco uses editor lines; anything persisted to disk, sent over IPC to Rust, or posted to GitHub uses file lines. Translation happens at exactly two boundaries: file→editor (rendering threads/drafts as zones), editor→file (capturing user clicks/drags into a draft).

## Violations at commit `6de4dfd`

- `src/components/diff/DiffPanel.tsx:186` — `afterLineNumber: pending.line` where `pending.line` is `fileLine`. Editor-line slot fed file line. Direct cause of "click line 30, editor opens at line 57".
- `src/components/diff/DiffPanel.tsx:163` — `afterLineNumber: t.line` (thread file line). Same violation.
- `src/components/diff/DiffPanel.tsx:176` — `afterLineNumber: d.line` (draft file line). Same.
- Working tree (uncommitted on top of `6de4dfd`) — partial rename of `PendingDraft`/`RangeSelection` fields, 13 stale references, file does not type-check.

## Findings, severity-tagged

(condensed — see Agent report in chat history for full text)

- **critical** view zones use file lines as `afterLineNumber` (threads, drafts, pending).
- **critical** working tree has half-applied rename — does not compile.
- **critical** `ReviewThread` has no `start_line`/`start_side` — range threads pulled from GitHub render as single-line.
- **major** `submit_review` deletes drafts but does not invalidate the threads TTL cache — submitted comments don't show until 5 min TTL.
- **major** LEFT side commenting is dead (listeners only on modified editor).
- **major** `onMouseUp` rebuilds `rangeSel` for clicks inside view zones too.
- **major** `pending`/`PendingDraft`/`RangeSelection` shapes mix anchor concept with target concept.
- **minor** `pending` zone key uses file lines as identity — recomposes on shape change → focus loss potential.
- **minor** `commentableModified` includes context lines (intentional, GitHub allows it; document the choice).
- **minor** `CommentLineModal` still mounted, redundant with inline path, no commentable validation on its line input.
- **minor** `ThreadsSidebar.tsx` orphan, never imported.
- **minor** `draftsStore.load` has stale-response race on fast PR switch.

## Fix order (this audit drives the implementer's commits)

1. **Editor-line / file-line split.** Add `fileToEditorMap` from parser; refactor `PendingDraft` + `RangeSelection` to `{ anchor, target }` shapes; translate at the two boundaries. (M)
2. **Add `start_line`/`start_side` to `ReviewThread` end-to-end** — Rust parser + TS type + zone render. (S)
3. **Invalidate threads cache** after `submit_review` and `reply_to_thread`. (S)
4. **Stabilise pending zone key** (constant `"pending"`) + gate `onMouseUp` rangeSel on `CONTENT_TEXT` target type. (S)
5. **Remove `CommentLineModal` mount + header button + delete `ThreadsSidebar.tsx`.** (S)
6. **Decide LEFT side: ship or narrow.** If keep: mirror listeners on original editor using `commentableOriginal`/`originalLineMap`/`originalFileToEditor`. If drop now: narrow `PendingDraft.side` to `"RIGHT"` only. (S either way)
7. **Guard `draftsStore.load` against stale PR responses** — track `loadedPrId`, drop responses for stale PRs. (S)

Deferred to 2.1+:
- Collapse duplicated zone-card inline styles into a single `<ZoneCard>` primitive.
- Row-highlight feedback on click before zone mounts.
- Move patch parsing to Rust if files grow.

## Why this approach instead of more whack-a-mole

Each remaining symptom rides on the editor-vs-file conflation. Fixing #1 in isolation but leaving the type rename half-applied (current state) blocks the build. Fixing #1 + #2 but not #3 leaves "submitted but invisible" UX. Each fix is small but they're coupled enough that landing them together in one agent dispatch — with the audit as its briefing — is cheaper than five round trips.
