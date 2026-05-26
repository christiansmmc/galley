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

  it("does not count a phantom line from a trailing newline", () => {
    const m = buildFullFileModel("a\nb\n", "a\nNEW\nb\n", PATCH);
    expect(m.modifiedLineMap.size).toBe(3); // not 4
    expect(m.originalLineMap.size).toBe(2); // not 3
    expect(m.modifiedFileToEditor.size).toBe(3);
  });

  it("null patch yields no commentable lines in whole-file mode", () => {
    const m = buildFullFileModel("a\nb\n", "a\nNEW\nb\n", null);
    expect(m.commentableModified.size).toBe(0);
    expect(m.commentableOriginal.size).toBe(0);
    // but the file still renders fully
    expect(m.modified).toBe("a\nNEW\nb\n");
  });
});
