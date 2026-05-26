import { parseDiff, type ParsedDiff } from "./parseDiff";

/** Number of lines in a blob; empty string is treated as zero lines. */
function lineCount(text: string): number {
  if (text.length === 0) return 0;
  const n = text.split("\n").length;
  // A trailing newline yields a phantom empty final element; don't count it,
  // so the line count matches GitHub's file line numbering.
  return text.endsWith("\n") ? n - 1 : n;
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
