import { describe, it, expect } from "vitest";
import { diffModelPath } from "../components/diff/diffModelPath";

describe("diffModelPath", () => {
  it("differs by mode so patch and whole-file models never collide", () => {
    const patch = diffModelPath(7, "mod", "src/a.ts", "patch", "rev1");
    const full = diffModelPath(7, "mod", "src/a.ts", "full", "rev1");
    expect(patch).not.toBe(full);
  });

  it("differs by side and by file", () => {
    expect(diffModelPath(7, "orig", "a", "full", "rev1")).not.toBe(diffModelPath(7, "mod", "a", "full", "rev1"));
    expect(diffModelPath(7, "mod", "a", "full", "rev1")).not.toBe(diffModelPath(7, "mod", "b", "full", "rev1"));
  });

  it("differs by revision so a new commit gets a fresh model instead of a stale cached one", () => {
    expect(diffModelPath(7, "mod", "a", "patch", "sha-old")).not.toBe(diffModelPath(7, "mod", "a", "patch", "sha-new"));
  });
});
