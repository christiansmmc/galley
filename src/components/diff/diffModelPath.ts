/** Monaco in-memory model URI for one side of the diff editor. Must be unique
 *  per (PR, file, side, mode, rev):
 *  - distinct `mode` values keep the patch-mode and whole-file-mode models from
 *    colliding under one URI (which would make the editor reuse a stale model
 *    when toggling);
 *  - `rev` (the PR's base+head shas) makes a new commit produce a fresh URI, so
 *    Monaco builds a new model with the updated content instead of reusing the
 *    cached one (kept alive by keepCurrentModel) with the pre-commit diff. */
export function diffModelPath(
  prId: number | string,
  side: "orig" | "mod",
  filePath: string,
  mode: "patch" | "full",
  rev: string,
): string {
  return `inmemory://pr/${prId}/${side}/${filePath}/${mode}/${rev}`;
}
