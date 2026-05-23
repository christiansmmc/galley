/**
 * Tiny subsequence-based fuzzy matcher. No external dep. Returns a score
 * (lower = better) or `null` when `query` doesn't subsequence-match `text`.
 *
 * Scoring favors:
 *   - shorter spans (`lastMatch - firstMatch`)
 *   - earlier first-match (slight)
 *   - word-boundary hits (small bonus)
 */
export function fuzzyScore(text: string, query: string): number | null {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  let ti = 0;
  let qi = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  let boundaryHits = 0;
  let prevMatched = false;

  while (ti < t.length && qi < q.length) {
    const ch = t[ti];
    if (ch === q[qi]) {
      if (firstMatch === -1) firstMatch = ti;
      lastMatch = ti;
      const prevCh = ti === 0 ? "" : t[ti - 1];
      const isBoundary = ti === 0 || prevCh === " " || prevCh === "/" || prevCh === "-" || prevCh === "_" || prevCh === "." || (prevCh >= "a" && prevCh <= "z" && ch >= "A" && ch <= "Z");
      if (isBoundary || prevMatched) boundaryHits++;
      qi++;
      prevMatched = true;
    } else {
      prevMatched = false;
    }
    ti++;
  }

  if (qi < q.length) return null;
  const span = lastMatch - firstMatch;
  return span + firstMatch * 0.1 - boundaryHits * 0.5;
}

/** Sort `items` by fuzzy score against `query`, filter out non-matches. */
export function fuzzyFilter<T>(items: T[], query: string, project: (t: T) => string): T[] {
  if (!query) return items;
  const scored: Array<[number, T]> = [];
  for (const it of items) {
    const s = fuzzyScore(project(it), query);
    if (s !== null) scored.push([s, it]);
  }
  scored.sort((a, b) => a[0] - b[0]);
  return scored.map(([, it]) => it);
}
