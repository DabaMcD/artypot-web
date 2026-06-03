const STORAGE_KEY = 'artypot_recent_searches';
const MAX_RECENT = 5;

/** Read the most recent search queries (newest first), capped at 5. */
export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/**
 * Record a search query at the front of the recent list, de-duplicated
 * (case-insensitively) and capped at 5. No-ops for blank queries.
 */
export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (typeof window === 'undefined' || trimmed === '') return getRecentSearches();

  const existing = getRecentSearches().filter(
    (q) => q.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full / unavailable — recent searches are best-effort.
  }
  return next;
}

/** Clear all stored recent searches. */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
