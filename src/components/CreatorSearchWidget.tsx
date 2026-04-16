'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { creators as creatorsApi } from '@/lib/api';
import type { Creator } from '@/lib/types';

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
      {creator.display_name.charAt(0).toUpperCase()}
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
}

export default function CreatorSearchWidget({
  selectedCreator,
  onSelect,
  onClear,
  navigateOnSelect = false,
  onCreateNew,
  placeholder = 'Search for a creator…',
  inputClassName,
}: CreatorSearchWidgetProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Creator[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!search || selectedCreator) {
      setResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await creatorsApi.list({ q: search });
        setResults(res.data.slice(0, 5));
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, selectedCreator]);

  const handleSelect = (s: Creator) => {
    if (navigateOnSelect) {
      router.push(`/creators/${s.id}`);
      setSearch('');
      setResults([]);
      setFocused(false);
    } else {
      onSelect?.(s);
      setSearch('');
      setResults([]);
      setFocused(false);
    }
  };

  const showDropdown =
    !selectedCreator &&
    focused &&
    (results.length > 0 || search.trim().length > 0 || !!onCreateNew);

  // ── Selected state (controlled mode only) ─────────────────────────────────
  if (selectedCreator && !navigateOnSelect) {
    return (
      <div className="flex items-center justify-between bg-surface-2 border border-creator/30 rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2">
          <CreatorAvatar creator={selectedCreator} />
          <a
            href={`/creators/${selectedCreator.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-creator font-medium hover:underline"
          >
            {selectedCreator.display_name}
          </a>
          {!selectedCreator.claimed_at && (
            <span className="text-xs text-muted">(unclaimed)</span>
          )}
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
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors';

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setFocused(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setFocused(false), 150);
        }}
        placeholder={placeholder}
        className={inputClassName ?? defaultInputClass}
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

          {/* Results */}
          {!searchLoading && results.map((s) => (
            <div key={s.id} className="flex items-center hover:bg-border transition-colors group">
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex-1 text-left px-4 py-2.5 text-sm flex items-center gap-2 min-w-0"
              >
                <CreatorAvatar creator={s} />
                <span className="text-foreground truncate">{s.display_name}</span>
                {!s.claimed_at && (
                  <span className="text-muted text-xs shrink-0">(unclaimed)</span>
                )}
              </button>
              <a
                href={`/creators/${s.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:block shrink-0 pr-3 text-xs text-muted hover:text-creator transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                view profile →
              </a>
            </div>
          ))}

          {/* No results */}
          {!searchLoading && search.trim().length > 0 && results.length === 0 && (
            <div className="px-4 py-2.5 text-sm text-muted">No creators found.</div>
          )}

          {/* Divider + create option */}
          {onCreateNew && (
            <>
              {!searchLoading && results.length > 0 && (
                <div className="border-t border-border" />
              )}
              <button
                type="button"
                onClick={() => onCreateNew(search.trim() || undefined)}
                className="w-full text-left px-4 py-2.5 text-sm text-creator hover:bg-border transition-colors flex items-center gap-2"
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
