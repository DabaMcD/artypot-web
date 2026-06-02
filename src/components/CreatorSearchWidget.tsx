'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { creators as creatorsApi, handles as handlesApi } from '@/lib/api';
import { handleLink, formatPlatformHandle, platformLabel } from '@/lib/platforms';
import type { Creator, HandleSearchResult } from '@/lib/types';

export function CreatorAvatar({ creator, size = 'sm' }: { creator: Creator; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-7 h-7 text-sm' : 'w-5 h-5 text-xs';
  if (creator.profile_picture) {
    return (
      <img
        src={creator.profile_picture}
        alt={creator.display_name}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <span
      className={`${dim} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ background: '#47DFD3', color: '#0a0a0a' }}
    >
      {creator.display_name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}

/** Avatar for a unified handle-search result (image, or initial fallback). */
function HandleResultAvatar({ result }: { result: HandleSearchResult }) {
  if (result.avatar_url) {
    return (
      <img
        src={result.avatar_url}
        alt={result.display_name}
        className="w-5 h-5 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: '#47DFD3', color: '#0a0a0a' }}
    >
      {result.display_name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}

interface CreatorSearchWidgetProps {
  /** Controlled mode — parent owns the selected creator */
  selectedCreator?: Creator | null;
  onSelect?: (creator: Creator) => void;
  onClear?: () => void;
  /** Navigate-on-select mode — no controlled selected state; just go to /creators/:id */
  navigateOnSelect?: boolean;
  /** If provided, renders a "+ create" row at the bottom of the dropdown */
  onCreateNew?: (prefill?: string) => void;
  placeholder?: string;
  /** Override the input element's className (e.g. for compact nav variant) */
  inputClassName?: string;
  /** Auto-focus the input when mounted (e.g. mobile search expand) */
  autoFocus?: boolean;
}

export default function CreatorSearchWidget({
  selectedCreator,
  onSelect,
  onClear,
  navigateOnSelect = false,
  onCreateNew,
  placeholder = 'Search for a creator…',
  inputClassName,
  autoFocus,
}: CreatorSearchWidgetProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  // Controlled mode (onSelect) searches creators. Navigate-on-select mode uses
  // the unified handle search — the same source as the /bounties/new target
  // picker — so it surfaces verified creators, unclaimed handles, and the
  // bounties waiting on them, not just creator profiles.
  const [results, setResults] = useState<Creator[]>([]);
  const [handleResults, setHandleResults] = useState<HandleSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const useHandleSearch = navigateOnSelect;

  // Debounced search
  useEffect(() => {
    if (!search || selectedCreator) {
      setResults([]);
      setHandleResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        if (useHandleSearch) {
          const res = await handlesApi.search(search);
          setHandleResults(((res.data as unknown) as HandleSearchResult[]).slice(0, 8));
        } else {
          const res = await creatorsApi.list({ q: search });
          setResults(res.data.slice(0, 5));
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, selectedCreator, useHandleSearch]);

  // Reset highlight to first item whenever the result set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [results, handleResults, search]);

  // Count of result rows currently rendered (creators or unified handles).
  const resultCount = useHandleSearch ? handleResults.length : results.length;
  // Flat list of navigable items in render order: results, then optional "create new" row.
  const navItemCount = resultCount + (onCreateNew ? 1 : 0);
  const isCreateNewRow = (idx: number) => !!onCreateNew && idx === resultCount;

  const activateIndex = (idx: number) => {
    if (idx < 0 || idx >= navItemCount) return;
    if (isCreateNewRow(idx)) {
      onCreateNew?.(search.trim() || undefined);
    } else if (useHandleSearch) {
      handleSelectResult(handleResults[idx]);
    } else {
      handleSelect(results[idx]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || navItemCount === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % navItemCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + navItemCount) % navItemCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activateIndex(activeIndex);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const handleSelect = (s: Creator) => {
    if (navigateOnSelect) {
      router.push(s.slug ? `/${s.slug}` : `/creators/${s.id}`);
    } else {
      onSelect?.(s);
    }
    setSearch('');
    setResults([]);
    // Intentionally NOT setting `focused = false` — the input still owns DOM
    // focus, so the user can type immediately to start a new search. A real
    // blur (clicking away) clears `focused` via the input's onBlur handler.
  };

  // Navigate-on-select handler for a unified handle-search result.
  //  - verified creator (has user_id) → their profile
  //  - unclaimed/curated handle        → the public /{platform}/{handle} page
  //  - 'other' or non-slug handle      → outbound profile link (new tab)
  const handleSelectResult = (r: HandleSearchResult) => {
    if (!r) return;
    if (r.type === 'user' && r.user_id) {
      router.push(`/creators/${r.user_id}`);
    } else {
      const { href, external } = handleLink(r.platform, r.username);
      if (external) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(href);
      }
    }
    setSearch('');
    setHandleResults([]);
  };

  const showDropdown =
    !selectedCreator &&
    focused &&
    (resultCount > 0 || search.trim().length > 0 || !!onCreateNew);

  // ── Selected state (controlled mode only) ─────────────────────────────────
  if (selectedCreator && !navigateOnSelect) {
    return (
      <div className="flex items-center justify-between bg-surface-2 border border-creator/30 rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2">
          <CreatorAvatar creator={selectedCreator} />
          <a
            href={selectedCreator.slug ? `/${selectedCreator.slug}` : `/creators/${selectedCreator.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-creator font-medium hover:underline"
          >
            {selectedCreator.display_name}
          </a>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Change
        </button>
      </div>
    );
  }

  // ── Search input + dropdown ────────────────────────────────────────────────
  const defaultInputClass =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors';

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setFocused(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setFocused(false), 150);
        }}
        placeholder={placeholder}
        className={inputClassName ?? defaultInputClass}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
      />

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-lg shadow-xl z-50 overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Loading */}
          {searchLoading && (
            <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted">
              <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Searching…
            </div>
          )}

          {/* Results — creator profiles (controlled mode) */}
          {!searchLoading && !useHandleSearch && results.map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center transition-colors group ${
                activeIndex === idx ? 'bg-border' : 'hover:bg-border'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex-1 text-left px-4 py-2.5 text-sm flex items-center gap-2 min-w-0"
              >
                <CreatorAvatar creator={s} />
                <span className="text-foreground truncate">{s.display_name}</span>
              </button>
              <a
                href={s.slug ? `/${s.slug}` : `/creators/${s.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:block shrink-0 pr-3 text-xs text-muted hover:text-creator transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                view profile →
              </a>
            </div>
          ))}

          {/* Results — unified handle search (navigate-on-select mode) */}
          {!searchLoading && useHandleSearch && handleResults.map((r, idx) => (
            <button
              key={r.handle_id}
              type="button"
              onClick={() => handleSelectResult(r)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                activeIndex === idx ? 'bg-border' : 'hover:bg-border'
              }`}
            >
              <HandleResultAvatar result={r} />
              <span className="flex-1 min-w-0">
                <span className="block text-foreground truncate">{r.display_name}</span>
                <span className="block text-[11px] font-mono text-muted truncate">
                  {platformLabel(r.platform)} · {formatPlatformHandle(r.platform, r.username)}
                </span>
              </span>
              <span className="shrink-0 flex flex-col items-end gap-0.5">
                {r.verified ? (
                  <span className="text-[10px] font-mono uppercase tracking-wide text-creator">verified</span>
                ) : r.pending_bounty_count > 0 ? (
                  <span className="text-[10px] font-mono text-muted">
                    {r.pending_bounty_count} {r.pending_bounty_count === 1 ? 'bounty' : 'bounties'}
                  </span>
                ) : null}
              </span>
            </button>
          ))}

          {/* No results */}
          {!searchLoading && search.trim().length > 0 && resultCount === 0 && (
            <div className="px-4 py-2.5 text-sm text-muted">
              {useHandleSearch ? 'No creators or handles found.' : 'No creators found.'}
            </div>
          )}

          {/* Divider + create option */}
          {onCreateNew && (
            <>
              {!searchLoading && resultCount > 0 && (
                <div className="border-t border-border" />
              )}
              <button
                type="button"
                onClick={() => onCreateNew(search.trim() || undefined)}
                onMouseEnter={() => setActiveIndex(resultCount)}
                className={`w-full text-left px-4 py-2.5 text-sm text-creator transition-colors flex items-center gap-2 ${
                  activeIndex === resultCount ? 'bg-border' : 'hover:bg-border'
                }`}
              >
                <span className="text-lg leading-none">+</span>
                {search.trim()
                  ? <><span>Add </span><span className="font-semibold">&ldquo;{search.trim()}&rdquo;</span><span> as a new creator</span></>
                  : 'Create a new creator profile'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
