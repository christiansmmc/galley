import { describe, it, expect } from "vitest";
import { buildTree, buildFlat } from "../components/files/treeBuild";
import type { FileDiff } from "../ipc/types";

function mk(path: string): FileDiff {
  return { path, previous_path: null, status: "modified", additions: 1, deletions: 0, patch: null };
}

describe("buildTree", () => {
  it("returns per-segment nodes when compact is off", () => {
    const t = buildTree([mk("src/main/java/com/esparta/api/Foo.java")], false);
    expect(t).toHaveLength(1);
    expect(t[0].type).toBe("dir");
    if (t[0].type !== "dir") return;
    expect(t[0].name).toBe("src");
    expect(t[0].children).toHaveLength(1);
  });

  it("compacts a non-Java chain with /", () => {
    const t = buildTree([mk("src/lib/utils/helpers.ts")], true);
    expect(t).toHaveLength(1);
    if (t[0].type !== "dir") return;
    expect(t[0].name).toBe("src/lib/utils");
    expect(t[0].originalName).toBe("src/lib/utils");
    expect(t[0].children).toHaveLength(1);
    expect(t[0].children[0].type).toBe("file");
  });

  it("splits at Java-root and joins package with .", () => {
    const t = buildTree([mk("src/main/java/com/esparta/scorehub/api/Foo.java")], true);
    if (t[0].type !== "dir") throw new Error("expected dir");
    expect(t[0].name).toBe("src/main/java");
    expect(t[0].originalName).toBe("src/main/java");
    const child = t[0].children[0];
    if (child.type !== "dir") throw new Error("expected child dir");
    expect(child.name).toBe("com.esparta.scorehub.api");
    expect(child.originalName).toBe("com/esparta/scorehub/api");
    expect(child.children[0].type).toBe("file");
  });

  it("stops joining when a dir has siblings", () => {
    const t = buildTree([
      mk("src/a/x.ts"),
      mk("src/b/y.ts"),
    ], true);
    if (t[0].type !== "dir") throw new Error();
    expect(t[0].name).toBe("src");
    expect(t[0].children).toHaveLength(2);
  });

  it("stops joining when next level is a file", () => {
    const t = buildTree([mk("only/file.ts")], true);
    if (t[0].type !== "dir") throw new Error();
    expect(t[0].name).toBe("only");
    expect(t[0].children).toHaveLength(1);
    expect(t[0].children[0].type).toBe("file");
  });
});

describe("buildFlat", () => {
  it("returns rows with name and dir sorted by name", () => {
    const rows = buildFlat([
      mk("src/zebra.ts"),
      mk("src/apple.ts"),
      mk("README.md"),
    ]);
    expect(rows.map(r => r.name)).toEqual(["apple.ts", "README.md", "zebra.ts"]);
    expect(rows[0].dir).toBe("src");
    expect(rows[1].dir).toBe("");
  });
});
