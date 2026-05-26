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

  it("marks deleted lines in commentableOriginalFileLines", () => {
    const p = parseDiff("@@ -1,2 +1,1 @@\n-removed\n ctx");
    // hunk header occupies editor line 1; '-removed' is editor line 2
    expect(p.commentableOriginal.has(2)).toBe(true);
    // '-removed' is original file line 1
    expect(p.commentableOriginalFileLines.has(1)).toBe(true);
    expect(p.commentableOriginalFileLines.size).toBe(1);
  });
});
