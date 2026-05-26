import { describe, it, expect } from "vitest";
import { diffModelPath } from "../components/diff/diffModelPath";

describe("diffModelPath", () => {
  it("differs by mode so patch and whole-file models never collide", () => {
    const patch = diffModelPath(7, "mod", "src/a.ts", "patch");
    const full = diffModelPath(7, "mod", "src/a.ts", "full");
    expect(patch).not.toBe(full);
  });

  it("differs by side and by file", () => {
    expect(diffModelPath(7, "orig", "a", "full")).not.toBe(diffModelPath(7, "mod", "a", "full"));
    expect(diffModelPath(7, "mod", "a", "full")).not.toBe(diffModelPath(7, "mod", "b", "full"));
  });
});
