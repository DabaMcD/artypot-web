import { useEffect, useRef, useState } from 'react';

export interface UseDebouncedSearchOptions<T> {
  /** The live query string (typically the input value). */
  query: string;
  /** Performs the request. Receives the trimmed query and an AbortSignal. */
  fetcher: (q: string, signal: AbortSignal) => Promise<T>;
  /** Debounce delay in ms. Default 250. */
  delay?: number;
  /** Minimum trimmed length before a request fires. Default 2. */
  minChars?: number;
  /** When false, no requests fire and results are cleared (e.g. dropdown closed). */
  enabled?: boolean;
}

export interface UseDebouncedSearchResult<T> {
  results: T | null;
  loading: boolean;
  setResults: (value: T | null) => void;
}

/**
 * Debounced, abortable search hook.
 *
 *  - Fires the fetcher once the query has been idle for `delay` ms.
 *  - Cancels any in-flight request (via AbortController) the moment the query
 *    changes again or the component unmounts, so stale responses never land.
 *  - Skips requests below `minChars` or while disabled, clearing results.
 */
export function useDebouncedSearch<T>({
  query,
  fetcher,
  delay = 250,
  minChars = 2,
  enabled = true,
}: UseDebouncedSearchOptions<T>): UseDebouncedSearchResult<T> {
  const [results, setResults] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep the latest fetcher without making it an effect dependency — callers
  // commonly pass an inline closure that would otherwise refire every render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // A new query supersedes any request already in flight.
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    // All state updates happen inside the debounce timer (never synchronously
    // in the effect body) so a keystroke doesn't trigger a cascading render.
    const timer = setTimeout(() => {
      const trimmed = query.trim();

      if (!enabled || trimmed.length < minChars) {
        setResults(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      fetcherRef.current(trimmed, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, delay);

    return () => clearTimeout(timer);
  }, [query, enabled, delay, minChars]);

  // Abort on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  return { results, loading, setResults };
}
