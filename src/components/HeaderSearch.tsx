'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { search as searchApi } from '@/lib/api';
import type { SearchResponse, SearchPerson, SearchBountyResult } from '@/lib/types';
import { useDebouncedSearch } from '@/lib/search/useDebouncedSearch';
import { sanitizeSnippet } from '@/lib/search/sanitizeSnippet';
import { getRecentSearches, addRecentSearch } from '@/lib/search/recentSearches';
import { moveActiveIndex, buildSearchHref } from '@/lib/search/navigation';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import { Badge } from '@/components/ui/Badge';

const MIN_CHARS = 2;

interface HeaderSearchProps {
  placeholder?: string;
  /** Override the input className (compact nav variants pass their own). */
  inputClassName?: string;
  autoFocus?: boolean;
}

type NavItem =
  | { kind: 'person'; href: string | null; external: boolean }
  | { kind: 'bounty'; href: string }
  | { kind: 'see-all'; href: string };

const fmtMoney = (n: number) =>
  `$${Math.round(n).toLocaleString('en-US')}`;

const isExternal = (url: string | null | undefined): boolean =>
  !!url && /^https?:\/\//i.test(url);

// ── Avatar ────────────────────────────────────────────────────────────────────
function PersonAvatar({ person }: { person: SearchPerson }) {
  if (person.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatar_url}
        alt={person.display_name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }
  // unverified handles have no associated person, so show a neutral gray
  // placeholder rather than an initial that implies a real identity.
  if (person.type === 'unverified_handle') {
    return (
      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-border text-muted">
        ?
      </span>
    );
  }
  return (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{ background: '#47DFD3', color: '#0a0a0a' }}
    >
      {person.display_name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}

export default function HeaderSearch({ placeholder = 'Search…', inputClassName, autoFocus }: HeaderSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<SearchBountyResult[]>([]);
  const trendingLoaded = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const queryActive = trimmed.length >= MIN_CHARS;

  const fetcher = useCallback(
    (q: string, signal: AbortSignal) => searchApi.query({ q, mode: 'dropdown' }, signal),
    [],
  );

  const { results, loading } = useDebouncedSearch<SearchResponse>({
    query,
    fetcher,
    enabled: focused,
    minChars: MIN_CHARS,
    delay: 250,
  });

  // Load recent searches (client only) once.
  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  // Lazy-load trending bounties the first time the empty input is focused.
  useEffect(() => {
    if (!focused || trendingLoaded.current) return;
    trendingLoaded.current = true;
    searchApi
      .trending()
      .then((res) => setTrending(res.data ?? []))
      .catch(() => {});
  }, [focused]);

  const people = results?.people ?? [];
  const bounties = results?.bounties ?? [];
  const hasResults = people.length > 0 || bounties.length > 0;

  // Flat, ordered list of keyboard-navigable rows (only when a query is active).
  const navItems: NavItem[] = [];
  if (queryActive) {
    people.forEach((p) => navItems.push({ kind: 'person', href: p.url, external: isExternal(p.url) }));
    bounties.forEach((b) => navItems.push({ kind: 'bounty', href: b.url }));
    navItems.push({ kind: 'see-all', href: buildSearchHref(trimmed) });
  }

  // Select the first row by default whenever the visible set changes, so a bare
  // Enter (no arrow-key navigation) activates the top result.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, results]);

  const close = () => {
    setFocused(false);
    setActiveIndex(-1);
  };

  const go = (href: string | null, external: boolean) => {
    if (!href) return;
    addRecentSearch(trimmed);
    setRecent(getRecentSearches());
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      router.push(href);
    }
    setQuery('');
    close();
  };

  const activate = (idx: number) => {
    const item = navItems[idx];
    if (!item) return;
    if (item.kind === 'person') go(item.href, item.external);
    else go(item.href, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!queryActive || navItems.length === 0) {
      // With no query, Enter goes to the full results page if there's text.
      if (e.key === 'Enter' && trimmed.length > 0) {
        e.preventDefault();
        go(buildSearchHref(trimmed), false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => moveActiveIndex(i < 0 ? -1 : i, 1, navItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => moveActiveIndex(i < 0 ? 0 : i, -1, navItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(activeIndex >= 0 ? activeIndex : 0);
    }
  };

  const showDropdown =
    focused && (queryActive || trimmed.length > 0 || recent.length > 0 || trending.length > 0);

  const defaultInputClass =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors';

  // Indices into navItems by row, so mouse hover + keyboard share highlight state.
  let cursor = -1;
  const nextIndex = () => (queryActive ? ++cursor : -1);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="header-search-listbox"
        aria-autocomplete="list"
        autoFocus={autoFocus}
      />

      {showDropdown && (
        <div
          id="header-search-listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-lg shadow-xl z-50 flex flex-col max-h-[60vh] overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
          role="listbox"
        >
          <div className="overflow-y-auto">
            {/* Too-short hint */}
            {!queryActive && trimmed.length > 0 && (
              <div className="px-4 py-3 text-sm text-muted">Keep typing — at least {MIN_CHARS} characters.</div>
            )}

            {/* Empty-input state: recent searches + trending */}
            {!queryActive && trimmed.length === 0 && (
              <>
                {recent.length > 0 && (
                  <div>
                    <SectionHeader>recent</SectionHeader>
                    {recent.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="w-full min-h-[44px] flex items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-border transition-colors"
                      >
                        <span className="text-muted">↻</span>
                        <span className="truncate">{term}</span>
                      </button>
                    ))}
                  </div>
                )}
                {trending.length > 0 && (
                  <div>
                    <SectionHeader>trending bounties</SectionHeader>
                    {trending.map((b) => (
                      <BountyRow
                        key={b.id}
                        bounty={b}
                        active={false}
                        onActivate={() => go(b.url, false)}
                        onHover={() => {}}
                      />
                    ))}
                  </div>
                )}
                {recent.length === 0 && trending.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted">Search creators, bounties, and handles.</div>
                )}
              </>
            )}

            {/* Active query: loading */}
            {queryActive && loading && !hasResults && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
                <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Searching…
              </div>
            )}

            {/* People section */}
            {queryActive && people.length > 0 && (
              <div>
                <SectionHeader>people</SectionHeader>
                {people.map((p) => {
                  const idx = nextIndex();
                  return (
                    <PersonRow
                      key={`${p.type}-${p.id}`}
                      person={p}
                      active={activeIndex === idx}
                      onActivate={() => go(p.url, isExternal(p.url))}
                      onHover={() => setActiveIndex(idx)}
                    />
                  );
                })}
              </div>
            )}

            {/* Bounties section */}
            {queryActive && bounties.length > 0 && (
              <div>
                <SectionHeader>bounties</SectionHeader>
                {bounties.map((b) => {
                  const idx = nextIndex();
                  return (
                    <BountyRow
                      key={b.id}
                      bounty={b}
                      active={activeIndex === idx}
                      onActivate={() => go(b.url, false)}
                      onHover={() => setActiveIndex(idx)}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {queryActive && !loading && !hasResults && (
              <div className="px-4 py-3">
                <p className="text-sm text-muted">No matches for &ldquo;{trimmed}&rdquo;.</p>
              </div>
            )}
          </div>

          {/* Sticky footer — "see all" (always present while a query is active) */}
          {queryActive && (() => {
            const idx = nextIndex();
            return (
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => go(buildSearchHref(trimmed), false)}
                className={`sticky bottom-0 w-full min-h-[44px] flex items-center justify-center gap-1 px-4 text-sm font-medium text-fan border-t border-border transition-colors ${
                  activeIndex === idx ? 'bg-border' : 'bg-surface-2 hover:bg-border'
                }`}
              >
                See all results for &ldquo;{trimmed}&rdquo; →
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-widest text-muted/70">
      {children}
    </div>
  );
}

function MatchReasonNote({ kind, value }: { kind?: string; value?: string | null }) {
  if (!value) return null;
  const label =
    kind === 'alias' ? 'matched alias' : 'matched';
  return (
    <span className="block text-[11px] text-muted/70 truncate">
      {label}: {value}
    </span>
  );
}

function PersonRow({
  person,
  active,
  onActivate,
  onHover,
}: {
  person: SearchPerson;
  active: boolean;
  onActivate: () => void;
  onHover: () => void;
}) {
  const subline =
    person.open_bounty_count > 0
      ? `${person.open_bounty_count} open ${person.open_bounty_count === 1 ? 'bounty' : 'bounties'} · ${fmtMoney(person.total_backed_open)} backed`
      : person.type === 'creator'
        ? 'Creator'
        : 'Unverified';

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onActivate}
      className={`w-full min-h-[44px] flex items-center gap-3 px-4 py-2 text-left transition-colors ${active ? 'bg-border' : 'hover:bg-border'}`}
    >
      <PersonAvatar person={person} />
      <span className="flex-1 min-w-0">
        <span className={`block text-sm text-foreground truncate ${active ? 'underline underline-offset-2' : ''}`}>{person.display_name}</span>
        {person.type === 'creator' && person.primary_handle && (
          <span className="block font-mono text-[11px] text-muted/80 truncate">{person.primary_handle.label}</span>
        )}
        <span className="block text-[11px] text-muted truncate">{subline}</span>
        {person.match_reason?.kind === 'alias' && (
          <MatchReasonNote kind={person.match_reason.kind} value={person.match_reason.value} />
        )}
      </span>
      <Badge tone={person.type === 'creator' ? 'creator' : 'default'} className="shrink-0 self-center">
        {person.type === 'creator' ? 'creator' : 'unverified'}
      </Badge>
    </button>
  );
}

function BountyRow({
  bounty,
  active,
  onActivate,
  onHover,
}: {
  bounty: SearchBountyResult;
  active: boolean;
  onActivate: () => void;
  onHover: () => void;
}) {
  const snippet = bounty.match_reason?.kind === 'description'
    ? sanitizeSnippet(bounty.match_reason?.snippet)
    : '';

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onActivate}
      className={`w-full min-h-[44px] flex flex-col gap-0.5 px-4 py-2 text-left transition-colors ${active ? 'bg-border' : 'hover:bg-border'}`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className={`text-sm text-foreground truncate ${active ? 'underline underline-offset-2' : ''}`}>{bounty.title}</span>
        {bounty.creator.display_name && (
          <span className="shrink-0 text-[11px] text-muted truncate max-w-[40%]">{bounty.creator.display_name}</span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-fan font-semibold text-xs">{fmtMoney(bounty.amount_backed)}</span>
        <BountyStatusBadge status={bounty.status} />
      </span>
      {snippet && (
        <span
          className="block text-[11px] text-muted truncate [&_mark]:bg-fan/25 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
          dangerouslySetInnerHTML={{ __html: snippet }}
        />
      )}
    </button>
  );
}
