# Whole-file Diff Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in, per-file toggle in the diff viewer that shows the whole file (base + head blobs, diffed by Monaco) instead of only the patch hunks.

**Architecture:** A new backend command fetches full file content at a git ref, cached permanently (blobs are immutable per SHA). The frontend builds the *same* `ParsedDiff` shape the diff panel already consumes — full texts, identity line maps, commentable sets still derived from the patch — so all existing comment/thread/draft/gutter machinery works unchanged. Toggle is per-file, default off, resets when the selected file changes.

**Tech Stack:** Rust (Tauri 2, octocrab, rusqlite), React/TS (Vite, Monaco), vitest.

Spec: `docs/superpowers/specs/2026-05-26-whole-file-diff-design.md`

---

## File Structure

- `src-tauri/src/cache/schema.sql` — add `blobs` table.
- `src-tauri/src/cache/ttl.rs` — add `get_blob`/`put_blob` + unit test.
- `src-tauri/src/github/diffs.rs` — add `GitHubClient::get_file_content`.
- `src-tauri/src/commands/prs.rs` — add `get_file_content` tauri command.
- `src-tauri/src/main.rs` — register the command.
- `src/ipc/client.ts` — add `getFileContent`.
- `src/components/diff/parseDiff.ts` — **new**: extracted from DiffPanel, plus two file-line commentable sets.
- `src/components/diff/buildFullFileModel.ts` — **new**: whole-file `ParsedDiff` builder.
- `src/components/diff/DiffPanel.tsx` — toggle button, blob fetch, model swap.
- `src/i18n/locales/en.json` + `pt-BR.json` — toggle strings.
- Tests: `src/__tests__/parseDiff.test.ts`, `src/__tests__/buildFullFileModel.test.ts`.

---

### Task 1: Blob cache (table + helpers)

**Files:**
- Modify: `src-tauri/src/cache/schema.sql`
- Modify: `src-tauri/src/cache/ttl.rs`

- [ ] **Step 1: Add the `blobs` table to the schema**

In `src-tauri/src/cache/schema.sql`, after the `viewed_files` table (before the `CREATE INDEX` lines), add:

```sql
CREATE TABLE IF NOT EXISTS blobs (
    sha     TEXT NOT NULL,
    path    TEXT NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (sha, path)
);
```

- [ ] **Step 2: Write the failing test for the blob cache**

At the very bottom of `src-tauri/src/cache/ttl.rs`, add:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::cache::Cache;

    #[test]
    fn blob_round_trips_and_is_keyed_by_sha() {
        let cache = Cache::open_in_memory().unwrap();
        assert_eq!(get_blob(&cache, "abc", "src/x.rs").unwrap(), None);
        put_blob(&cache, "abc", "src/x.rs", "hello\nworld").unwrap();
        assert_eq!(
            get_blob(&cache, "abc", "src/x.rs").unwrap(),
            Some("hello\nworld".to_string())
        );
        // Different sha for the same path is a miss (blobs are per-SHA).
        assert_eq!(get_blob(&cache, "def", "src/x.rs").unwrap(), None);
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd src-tauri && cargo test blob_round_trips`
Expected: FAIL — `get_blob` / `put_blob` not found (compile error).

- [ ] **Step 4: Implement `get_blob` / `put_blob`**

In `src-tauri/src/cache/ttl.rs`, add (e.g. after `put_diff`, before the threads helpers):

```rust
/// Read a cached file blob. Blobs are immutable per (sha, path), so there is
/// no TTL — any hit is valid forever.
pub fn get_blob(cache: &Cache, sha: &str, path: &str) -> AppResult<Option<String>> {
    cache.with_conn(|c| {
        let row: rusqlite::Result<String> = c.query_row(
            "SELECT content FROM blobs WHERE sha = ?1 AND path = ?2",
            params![sha, path],
            |r| r.get(0),
        );
        Ok(row.ok())
    })
}

pub fn put_blob(cache: &Cache, sha: &str, path: &str, content: &str) -> AppResult<()> {
    cache.with_conn(|c| {
        c.execute(
            "INSERT INTO blobs (sha, path, content) VALUES (?1, ?2, ?3) \
             ON CONFLICT(sha, path) DO UPDATE SET content = excluded.content",
            params![sha, path, content],
        )?;
        Ok(())
    })
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd src-tauri && cargo test blob_round_trips`
Expected: PASS (1 passed).

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/cache/schema.sql src-tauri/src/cache/ttl.rs
git commit -m "feat(cache): permanent per-SHA blob cache for full file content"
```

---

### Task 2: Backend — fetch full file content

**Files:**
- Modify: `src-tauri/src/github/diffs.rs`

- [ ] **Step 1: Add `get_file_content` to the GitHub client**

In `src-tauri/src/github/diffs.rs`, inside the existing `impl GitHubClient { ... }` block (after `get_pr_diff`), add:

```rust
/// Fetch the full UTF-8 text of a file at a given git ref. Returns `None`
/// when the file does not exist at that ref (404) or has no decodable text
/// content (binary / too large). Used by the whole-file diff view.
pub async fn get_file_content(
    &self,
    owner: &str,
    repo: &str,
    path: &str,
    git_ref: &str,
) -> AppResult<Option<String>> {
    let result = self
        .inner
        .repos(owner, repo)
        .get_content()
        .path(path)
        .r#ref(git_ref)
        .send()
        .await;
    let mut items = match result {
        Ok(items) => items,
        // Missing file at this ref (e.g. the head side of a deleted file) → no content.
        Err(octocrab::Error::GitHub { source, .. }) if source.status_code.as_u16() == 404 => {
            return Ok(None);
        }
        Err(e) => return Err(AppError::Network(e.to_string())),
    };
    Ok(items
        .take_items()
        .into_iter()
        .next()
        .and_then(|c| c.decoded_content()))
}
```

Note for the implementer: `diffs.rs` already imports `AppError`/`AppResult` and `GitHubClient` (used by `get_pr_diff`). If `octocrab::Error`/`octocrab::models::repos::Content` need importing, add `use octocrab;` is unnecessary — `octocrab::Error` is referenced fully-qualified above. `Content::decoded_content()` is provided by octocrab 0.42. If the method name differs in the pinned version, decode the base64 `content` field manually (strip `\n`, base64-decode, `String::from_utf8_lossy`).

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo build`
Expected: builds cleanly (no errors). Fix any import/method-name mismatch per the note above until it compiles.

- [ ] **Step 3: Verify existing tests still pass**

Run: `cd src-tauri && cargo test`
Expected: PASS (all existing tests + the Task 1 blob test).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/github/diffs.rs
git commit -m "feat(github): fetch full file content at a git ref"
```

---

### Task 3: Backend — `get_file_content` tauri command

**Files:**
- Modify: `src-tauri/src/commands/prs.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Add the command (cache-first)**

In `src-tauri/src/commands/prs.rs`, add at the end of the file:

```rust
#[tauri::command]
pub async fn get_file_content(
    owner: String,
    repo: String,
    path: String,
    git_ref: String,
    state: State<'_, AppState>,
) -> AppResult<Option<String>> {
    if let Some(cached) = ttl::get_blob(&state.cache, &git_ref, &path)? {
        return Ok(Some(cached));
    }
    let c = client(&state).await?;
    let content = c.get_file_content(&owner, &repo, &path, &git_ref).await?;
    if let Some(text) = &content {
        let _ = ttl::put_blob(&state.cache, &git_ref, &path, text);
    }
    Ok(content)
}
```

(`ttl`, `client`, `AppState`, `State`, `AppResult` are already imported at the top of this file.)

- [ ] **Step 2: Register the command**

In `src-tauri/src/main.rs`, in the `generate_handler![...]` list, add `prs::get_file_content,` next to the other `prs::` entries. Concretely, change the line:

```rust
    list_prs, prs::get_pr, prs::get_pr_diff, prs::get_pr_threads, prs::refresh_pr,
```

to:

```rust
    list_prs, prs::get_pr, prs::get_pr_diff, prs::get_pr_threads, prs::refresh_pr, prs::get_file_content,
```

- [ ] **Step 3: Verify it compiles and tests pass**

Run: `cd src-tauri && cargo build && cargo test`
Expected: builds + all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/prs.rs src-tauri/src/main.rs
git commit -m "feat(commands): get_file_content command with blob cache read-through"
```

---

### Task 4: IPC — `getFileContent`

**Files:**
- Modify: `src/ipc/client.ts`

- [ ] **Step 1: Add the IPC method**

In `src/ipc/client.ts`, inside the `api` object (after `getPrThreads`), add:

```ts
  getFileContent: (owner: string, repo: string, path: string, ref: string) =>
    invoke<string | null>("get_file_content", { owner, repo, path, gitRef: ref }),
```

(Tauri v2 maps the Rust `git_ref` param to the camelCase key `gitRef`, matching the existing `prId`/`startLine` convention.)

- [ ] **Step 2: Verify types**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ipc/client.ts
git commit -m "feat(ipc): getFileContent client method"
```

---

### Task 5: Extract `parseDiff` + add file-line commentable sets

**Files:**
- Create: `src/components/diff/parseDiff.ts`
- Modify: `src/components/diff/DiffPanel.tsx` (remove inline copy, import instead)
- Test: `src/__tests__/parseDiff.test.ts`

- [ ] **Step 1: Write the new module (moved from DiffPanel, with two new fields)**

Create `src/components/diff/parseDiff.ts`:

```ts
export interface ParsedDiff {
  original: string;
  modified: string;
  /** Editor line (1-based) on modified side → file line in modified file, or null for hunk separators. */
  modifiedLineMap: Map<number, number | null>;
  originalLineMap: Map<number, number | null>;
  /** Reverse: file line in modified file → editor line on the modified side. */
  modifiedFileToEditor: Map<number, number>;
  /** Reverse: file line in original file → editor line on the original side. */
  originalFileToEditor: Map<number, number>;
  /** Modified-side editor lines that GitHub will accept as comment targets. */
  commentableModified: Set<number>;
  commentableOriginal: Set<number>;
  /** Modified-side *file* lines that are commentable (the `+` lines). Used by
   *  whole-file mode, where editor line == file line. */
  commentableModifiedFileLines: Set<number>;
  /** Original-side *file* lines that are commentable (the `-` lines). */
  commentableOriginalFileLines: Set<number>;
}

export function parseDiff(patch: string | null): ParsedDiff {
  const empty: ParsedDiff = {
    original: "", modified: "",
    modifiedLineMap: new Map(), originalLineMap: new Map(),
    modifiedFileToEditor: new Map(), originalFileToEditor: new Map(),
    commentableModified: new Set(), commentableOriginal: new Set(),
    commentableModifiedFileLines: new Set(), commentableOriginalFileLines: new Set(),
  };
  if (!patch) return empty;

  const orig: string[] = [];
  const mod: string[] = [];
  const origMap = new Map<number, number | null>();
  const modMap = new Map<number, number | null>();
  const modFileToEditor = new Map<number, number>();
  const origFileToEditor = new Map<number, number>();
  const commentableMod = new Set<number>();
  const commentableOrig = new Set<number>();
  const commentableModFileLines = new Set<number>();
  const commentableOrigFileLines = new Set<number>();

  let origLine = 0;
  let modLine = 0;
  const hunkRe = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

  for (const raw of patch.split("\n")) {
    const m = hunkRe.exec(raw);
    if (m) {
      origLine = parseInt(m[1], 10);
      modLine = parseInt(m[2], 10);
      orig.push(""); origMap.set(orig.length, null);
      mod.push(""); modMap.set(mod.length, null);
      continue;
    }
    if (raw.startsWith("+")) {
      mod.push(raw.slice(1));
      modMap.set(mod.length, modLine);
      modFileToEditor.set(modLine, mod.length);
      commentableMod.add(mod.length);
      commentableModFileLines.add(modLine);
      modLine++;
    } else if (raw.startsWith("-")) {
      orig.push(raw.slice(1));
      origMap.set(orig.length, origLine);
      origFileToEditor.set(origLine, orig.length);
      commentableOrig.add(orig.length);
      commentableOrigFileLines.add(origLine);
      origLine++;
    } else if (raw.startsWith(" ") || raw.length === 0) {
      // Context lines: shown in both panes for context, but NOT commentable —
      // the user model is "only lines I modified can be commented".
      const content = raw.startsWith(" ") ? raw.slice(1) : raw;
      orig.push(content);
      origMap.set(orig.length, origLine);
      origFileToEditor.set(origLine, orig.length);
      mod.push(content);
      modMap.set(mod.length, modLine);
      modFileToEditor.set(modLine, mod.length);
      origLine++;
      modLine++;
    }
    // Lines starting with '\' (e.g. "\ No newline at end of file") are skipped.
  }

  return {
    original: orig.join("\n"),
    modified: mod.join("\n"),
    modifiedLineMap: modMap,
    originalLineMap: origMap,
    modifiedFileToEditor: modFileToEditor,
    originalFileToEditor: origFileToEditor,
    commentableModified: commentableMod,
    commentableOriginal: commentableOrig,
    commentableModifiedFileLines: commentableModFileLines,
    commentableOriginalFileLines: commentableOrigFileLines,
  };
}
```

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/parseDiff.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseDiff } from "../components/diff/parseDiff";

const PATCH = "@@ -1,2 +1,3 @@\n ctx\n+added\n more";

describe("parseDiff", () => {
  it("returns an empty model for a null patch", () => {
    const p = parseDiff(null);
    expect(p.original).toBe("");
    expect(p.modified).toBe("");
    expect(p.commentableModified.size).toBe(0);
    expect(p.commentableModifiedFileLines.size).toBe(0);
  });

  it("marks only added lines commentable, in both editor and file coords", () => {
    const p = parseDiff(PATCH);
    // editor line 3 = the '+added' row (1 = hunk separator, 2 = ctx, 3 = added)
    expect(p.commentableModified.has(3)).toBe(true);
    expect(p.commentableModified.has(2)).toBe(false); // context not commentable
    // '+added' is modified file line 2
    expect(p.commentableModifiedFileLines.has(2)).toBe(true);
    expect(p.commentableModifiedFileLines.size).toBe(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails, then passes**

Run: `pnpm test -- parseDiff`
Expected: PASS once `parseDiff.ts` exists. (If you wrote the test before the module, it fails with a module-not-found error first — that is the failing state.)

- [ ] **Step 4: Update DiffPanel to import from the new module**

In `src/components/diff/DiffPanel.tsx`:
- Delete the inline `interface ParsedDiff { ... }` (lines ~19-32) and the entire `function parseDiff(...) { ... }` (lines ~34-104).
- Add an import near the other diff imports (after the `useDiffRenderMode` import):

```ts
import { parseDiff } from "./parseDiff";
```

Leave the rest of DiffPanel unchanged for now (the `useMemo(() => parseDiff(...))` call still resolves).

- [ ] **Step 5: Verify types and tests**

Run: `pnpm tsc --noEmit && pnpm test -- parseDiff`
Expected: no type errors; parseDiff test passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/diff/parseDiff.ts src/components/diff/DiffPanel.tsx src/__tests__/parseDiff.test.ts
git commit -m "refactor(diff): extract parseDiff with file-line commentable sets"
```

---

### Task 6: `buildFullFileModel`

**Files:**
- Create: `src/components/diff/buildFullFileModel.ts`
- Test: `src/__tests__/buildFullFileModel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/buildFullFileModel.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildFullFileModel } from "../components/diff/buildFullFileModel";

const PATCH = "@@ -1,2 +1,3 @@\n ctx\n+added\n more";

describe("buildFullFileModel", () => {
  it("uses the full blobs as original/modified", () => {
    const m = buildFullFileModel("a\nb", "a\nNEW\nb", PATCH);
    expect(m.original).toBe("a\nb");
    expect(m.modified).toBe("a\nNEW\nb");
  });

  it("produces identity line maps", () => {
    const m = buildFullFileModel("a\nb", "a\nNEW\nb", PATCH);
    expect(m.modifiedLineMap.get(2)).toBe(2);
    expect(m.modifiedFileToEditor.get(2)).toBe(2);
    expect(m.originalLineMap.get(1)).toBe(1);
  });

  it("takes commentable lines from the patch (file lines)", () => {
    const m = buildFullFileModel("a\nb", "a\nNEW\nb", PATCH);
    // '+added' sits at modified file line 2 in PATCH
    expect(m.commentableModified.has(2)).toBe(true);
    expect(m.commentableModified.has(1)).toBe(false);
  });

  it("handles an added file (empty original)", () => {
    const m = buildFullFileModel("", "x\ny", "@@ -0,0 +1,2 @@\n+x\n+y");
    expect(m.original).toBe("");
    expect(m.modified).toBe("x\ny");
    expect(m.modifiedLineMap.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- buildFullFileModel`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `buildFullFileModel`**

Create `src/components/diff/buildFullFileModel.ts`:

```ts
import { parseDiff, type ParsedDiff } from "./parseDiff";

/** Number of lines in a blob; empty string is treated as zero lines. */
function lineCount(text: string): number {
  return text.length === 0 ? 0 : text.split("\n").length;
}

function identityMap(count: number): Map<number, number | null> {
  const m = new Map<number, number | null>();
  for (let i = 1; i <= count; i++) m.set(i, i);
  return m;
}

function identityReverse(count: number): Map<number, number> {
  const m = new Map<number, number>();
  for (let i = 1; i <= count; i++) m.set(i, i);
  return m;
}

/**
 * Build a ParsedDiff that renders the WHOLE file (both blobs) instead of just
 * the patch hunks. Monaco diffs the two full texts itself. Line maps are
 * identity (editor line == file line); commentable lines are still taken from
 * the patch, because GitHub's review API only accepts comments on changed lines.
 */
export function buildFullFileModel(
  baseContent: string,
  headContent: string,
  patch: string | null,
): ParsedDiff {
  const fromPatch = parseDiff(patch);
  const origCount = lineCount(baseContent);
  const modCount = lineCount(headContent);

  return {
    original: baseContent,
    modified: headContent,
    originalLineMap: identityMap(origCount),
    modifiedLineMap: identityMap(modCount),
    originalFileToEditor: identityReverse(origCount),
    modifiedFileToEditor: identityReverse(modCount),
    // Editor line == file line here, so the patch's file-line sets ARE the
    // editor-line commentable sets.
    commentableModified: new Set(fromPatch.commentableModifiedFileLines),
    commentableOriginal: new Set(fromPatch.commentableOriginalFileLines),
    commentableModifiedFileLines: new Set(fromPatch.commentableModifiedFileLines),
    commentableOriginalFileLines: new Set(fromPatch.commentableOriginalFileLines),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- buildFullFileModel`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/components/diff/buildFullFileModel.ts src/__tests__/buildFullFileModel.test.ts
git commit -m "feat(diff): buildFullFileModel for whole-file view"
```

---

### Task 7: DiffPanel — toggle, fetch, model swap + i18n

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt-BR.json`
- Modify: `src/components/diff/DiffPanel.tsx`

- [ ] **Step 1: Add i18n strings**

In `src/i18n/locales/en.json`, in the `"diff"` object, after `"switch_to_side_by_side"`, add:

```json
    "whole_file": "whole file",
    "whole_file_active": "showing whole file",
    "whole_file_loading": "loading file…",
    "whole_file_tooltip": "show the whole file with changes",
    "whole_file_failed": "couldn't load the full file",
```

In `src/i18n/locales/pt-BR.json`, in the `"diff"` object at the equivalent spot, add:

```json
    "whole_file": "arquivo inteiro",
    "whole_file_active": "mostrando arquivo inteiro",
    "whole_file_loading": "carregando arquivo…",
    "whole_file_tooltip": "mostrar o arquivo inteiro com as alterações",
    "whole_file_failed": "não foi possível carregar o arquivo inteiro",
```

(Confirm the surrounding JSON commas are valid — the line before these must end with a comma.)

- [ ] **Step 2: Add imports to DiffPanel**

In `src/components/diff/DiffPanel.tsx`, add near the other imports:

```ts
import { buildFullFileModel } from "./buildFullFileModel";
import { api } from "../../ipc/client";
import { useUiStore } from "../../state/uiStore";
```

- [ ] **Step 3: Add state, blob fetch, and the model-selection memo**

In `DiffPanel`, find:

```ts
  const file = diff.find(f => f.path === selectedFile);
  const parsed = useMemo(() => parseDiff(file?.patch ?? null), [file?.patch]);
```

Replace those two lines with:

```ts
  const file = diff.find(f => f.path === selectedFile);
  const pushToast = useUiStore(s => s.pushToast);
  const [wholeFile, setWholeFile] = useState(false);
  const [blobs, setBlobs] = useState<{ base: string; head: string } | null>(null);
  const [loadingBlobs, setLoadingBlobs] = useState(false);

  const patchParsed = useMemo(() => parseDiff(file?.patch ?? null), [file?.patch]);

  // Whole-file is opt-in per file and resets when the open file changes.
  useEffect(() => {
    setWholeFile(false);
    setBlobs(null);
  }, [selectedFile]);

  // Fetch base + head blobs when whole-file mode turns on. Added/removed files
  // only have one side; the missing side is an empty document. On any failure
  // we toast and fall back to the patch view.
  useEffect(() => {
    if (!wholeFile || !file || !currentPr) return;
    let cancelled = false;
    setLoadingBlobs(true);
    const owner = currentPr.summary.owner;
    const repo = currentPr.summary.repo;
    const basePath = file.previous_path ?? file.path;
    Promise.all([
      file.status === "added"
        ? Promise.resolve<string | null>("")
        : api.getFileContent(owner, repo, basePath, currentPr.base_sha),
      file.status === "removed"
        ? Promise.resolve<string | null>("")
        : api.getFileContent(owner, repo, file.path, currentPr.head_sha),
    ])
      .then(([base, head]) => {
        if (cancelled) return;
        if (base == null || head == null) {
          pushToast("error", t("diff.whole_file_failed"));
          setWholeFile(false);
          return;
        }
        setBlobs({ base, head });
      })
      .catch(() => {
        if (cancelled) return;
        pushToast("error", t("diff.whole_file_failed"));
        setWholeFile(false);
      })
      .finally(() => { if (!cancelled) setLoadingBlobs(false); });
    return () => { cancelled = true; };
  }, [wholeFile, file, currentPr, pushToast, t]);

  const parsed = useMemo(
    () => (wholeFile && blobs
      ? buildFullFileModel(blobs.base, blobs.head, file?.patch ?? null)
      : patchParsed),
    [wholeFile, blobs, patchParsed, file?.path],
  );
```

- [ ] **Step 4: Add the toggle button in the header**

In the header row, find the render-mode toggle block that ends with:

```tsx
        <Button
          variant="link"
          onClick={toggleRenderMode}
          title={renderSideBySide ? t("diff.switch_to_inline") : t("diff.switch_to_side_by_side")}
          disabled={!settings}
        >
          {renderSideBySide ? t("diff.inline") : t("diff.side_by_side")}
        </Button>
```

Immediately after that closing `</Button>`, add:

```tsx
        <span aria-hidden style={{ color: "var(--c-overlay)" }}>·</span>
        <Button
          variant="link"
          onClick={() => setWholeFile(v => !v)}
          title={t("diff.whole_file_tooltip")}
          disabled={file.patch == null || loadingBlobs}
        >
          {loadingBlobs
            ? t("diff.whole_file_loading")
            : wholeFile
              ? t("diff.whole_file_active")
              : t("diff.whole_file")}
        </Button>
```

- [ ] **Step 5: Force a clean Monaco remount when the mode flips**

In the `<DiffEditor ... />`, change the `key` prop from:

```tsx
          key={`${currentPr?.summary.id ?? "_"}-${file.path}`}
```

to:

```tsx
          key={`${currentPr?.summary.id ?? "_"}-${file.path}-${wholeFile ? "full" : "patch"}`}
```

This remounts the editor when toggling, so gutter line-number remap and decorations rebuild against the new model rather than carrying stale editor-line state.

- [ ] **Step 6: Verify types, tests, and build**

Run: `pnpm tsc --noEmit && pnpm test && pnpm exec vite build`
Expected: no type errors; all tests pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/diff/DiffPanel.tsx src/i18n/locales/en.json src/i18n/locales/pt-BR.json
git commit -m "feat(diff): per-file whole-file diff toggle"
```

---

### Task 8: Full verification + PR

- [ ] **Step 1: Run all gates**

Run, from the repo root:

```bash
pnpm tsc --noEmit && pnpm test && pnpm exec vite build && (cd src-tauri && cargo test)
```

Expected: every command exits 0.

- [ ] **Step 2: Manual smoke (optional but recommended)**

Build/launch the app, open a PR, open a text file with changes, click "arquivo inteiro" — confirm the full file shows with changes highlighted, the gutter shows real file line numbers, and commenting only works on changed lines. Toggle off → back to hunks. Switch files → toggle resets. Confirm the button is disabled on a binary file (no patch).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/whole-file-diff
gh pr create --base master --title "feat(diff): whole-file diff toggle" --body "Adds an opt-in per-file toggle to view the whole file (base + head blobs, diffed by Monaco) instead of only the patch hunks. Comments stay restricted to changed lines. Blobs cached permanently per SHA. Spec + plan under docs/superpowers/."
```

> Per project rules, let the PR merge on GitHub — do NOT merge into local master. Version bump + rpm build happen after merge.

---

## Self-Review

- **Spec coverage:** data source / full-file model (Tasks 5-6), backend fetch + permanent cache (Tasks 1-3), IPC (Task 4), per-file toggle + reset + spinner + fallback (Task 7), commenting restricted to changed lines (commentable sets sourced from patch in Tasks 5-6), works in both render modes (model-only swap, render mode untouched — Task 7), edge cases added/removed/renamed (Task 7 fetch branches + Task 6 empty-blob test). Covered.
- **Type consistency:** `ParsedDiff` gains `commentableModifiedFileLines` / `commentableOriginalFileLines` (Task 5); `buildFullFileModel` returns the full interface incl. those (Task 6); `getFileContent` returns `string | null` matching the Rust `Option<String>` (Tasks 3-4); `git_ref` ↔ `gitRef` mapping noted.
- **Placeholders:** none — every code/edit step has concrete content and exact paths.
