/**
 * Move a keyboard-selection index by `delta` within `[0, count)`, wrapping
 * around the ends. Returns -1 when there are no items.
 *
 *   moveActiveIndex(0, -1, 3) === 2   // wrap to last
 *   moveActiveIndex(2,  1, 3) === 0   // wrap to first
 */
export function moveActiveIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return -1;
  return ((current + delta) % count + count) % count;
}

/** Full-results page URL for a query. */
export function buildSearchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

/**
 * "Create a bounty" CTA target with the query prefilled as the handle — the
 * empty-state acquisition mechanic that turns search misses into bounties.
 */
export function buildCreateBountyHref(query: string): string {
  return `/bounties/new?handle=${encodeURIComponent(query.trim())}`;
}
