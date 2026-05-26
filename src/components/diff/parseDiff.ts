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
