/** Monaco in-memory model URI for one side of the diff editor. Must be unique
 *  per (PR, file, side, mode) — distinct `mode` values keep the patch-mode and
 *  whole-file-mode models from colliding under one URI (which would make the
 *  editor reuse a stale model when toggling). */
export function diffModelPath(
  prId: number | string,
  side: "orig" | "mod",
  filePath: string,
  mode: "patch" | "full",
): string {
  return `inmemory://pr/${prId}/${side}/${filePath}/${mode}`;
}
