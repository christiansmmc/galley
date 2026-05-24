/**
 * Split a forward-slash path into a head (directory segments) and a leaf
 * (the file name). Used by the diff file header to render slashes in
 * overlay color while the leaf stays in text color + weight 500.
 *
 * - `"src/main/java/App.java"` → `{ head: ["src", "main", "java"], leaf: "App.java" }`
 * - `"App.java"`               → `{ head: [], leaf: "App.java" }`
 * - `""`                       → `{ head: [], leaf: "" }`
 */
export function splitPath(path: string): { head: string[]; leaf: string } {
  if (!path) return { head: [], leaf: "" };
  const parts = path.split("/");
  const leaf = parts.pop() ?? "";
  return { head: parts, leaf };
}
