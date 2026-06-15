'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { search as searchApi, creators as creatorsApi } from '@/lib/api';
import type {
  SearchResponse,
  SearchPerson,
  SearchBountyResult,
  Creator,
  PaginatedResponse,
} from '@/lib/types';
import { sanitizeSnippet } from '@/lib/search/sanitizeSnippet';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import { Badge } from '@/components/ui/Badge';
import CreatorCard from '@/components/CreatorCard';
import { SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Toggle } from '@/components/ui/Toggle';

type FilterType = 'all' | 'people' | 'bounties';
type SortOption = 'newest' | 'most_backed' | 'most_completed';

const MIN_CHARS = 2;

const PEOPLE_MAX = 10;
const BOUNTIES_MAX = 20;
const PEOPLE_STEP = 5;
const BOUNTIES_STEP = 10;

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const isExternal = (url: string | null | undefined) => !!url && /^https?:\/\//i.test(url);

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'people', label: 'People' },
  { key: 'bounties', label: 'Bounties' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'newest' },
  { value: 'most_backed', label: 'most bounties' },
  { value: 'most_completed', label: 'most completed' },
];

// A "pill row" toggle matching the app's mono idiom (shared by tabs + sort).
function PillRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border border-border rounded p-1 bg-surface max-w-full">
      {options.map(({ value: v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer whitespace-nowrap ${
            value === v ? 'bg-surface-2 text-foreground' : 'text-muted hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SearchPageInner() {
  const params = useSearchParams();
  const router = useRouter();

  const query = (params.get('q') ?? '').trim();
  const type = (params.get('type') as FilterType) || 'all';
  const browsing = query.length < MIN_CHARS;

  // ── Query-results state ─────────────────────────────────────────────────────
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [peopleLimit, setPeopleLimit] = useState(PEOPLE_STEP);
  const [bountyLimit, setBountyLimit] = useState(BOUNTIES_STEP);
  const [includeCompleted, setIncludeCompleted] = useState(false);

  // ── Browse state (no / too-short query) ─────────────────────────────────────
  const [creators, setCreators] = useState<PaginatedResponse<Creator> | null>(null);
  const [creatorSort, setCreatorSort] = useState<SortOption>('newest');
  const [creatorPage, setCreatorPage] = useState(1);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [trending, setTrending] = useState<SearchBountyResult[]>([]);

  // Reset paging when the query or completed-toggle changes. Done during render
  // (React's sanctioned "adjust state on input change" pattern) rather than in
  // an effect, to avoid a cascading-render reset cycle.
  const resetKey = `${query}|${includeCompleted}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPeopleLimit(PEOPLE_STEP);
    setBountyLimit(BOUNTIES_STEP);
  }

  // Load search results when a query is active.
  const load = useCallback(async () => {
    if (browsing) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await searchApi.query({
        q: query,
        mode: 'full',
        limit_people: peopleLimit,
        limit_bounties: bountyLimit,
        include_completed: includeCompleted,
      });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [browsing, query, peopleLimit, bountyLimit, includeCompleted]);

  useEffect(() => { load(); }, [load]);

  // Load the browsable creator catalog when there's no active query.
  const loadCreators = useCallback(async () => {
    if (!browsing) return;
    setBrowseLoading(true);
    try {
      const res = await creatorsApi.list({ sort: creatorSort, page: creatorPage });
      setCreators(res);
    } catch {
      setCreators(null);
    } finally {
      setBrowseLoading(false);
    }
  }, [browsing, creatorSort, creatorPage]);

  useEffect(() => { loadCreators(); }, [loadCreators]);

  // Lazily load trending bounties once, the first time we're in browse mode.
  useEffect(() => {
    if (!browsing || trending.length > 0) return;
    searchApi.trending().then((res) => setTrending(res.data ?? [])).catch(() => {});
  }, [browsing, trending.length]);

  const setType = (next: FilterType) => {
    const sp = new URLSearchParams(params.toString());
    if (next === 'all') sp.delete('type');
    else sp.set('type', next);
    router.replace(`/search?${sp.toString()}`);
  };

  const setSort = (next: SortOption) => {
    setCreatorSort(next);
    setCreatorPage(1);
  };

  const people = data?.people ?? [];
  const bounties = data?.bounties ?? [];
  const showPeople = type === 'all' || type === 'people';
  const showBounties = type === 'all' || type === 'bounties';

  // "Show more" is available while we haven't hit the endpoint cap and the last
  // response was full (i.e. there may be more to reveal).
  const morePeople = peopleLimit < PEOPLE_MAX && people.length >= peopleLimit;
  const moreBounties = bountyLimit < BOUNTIES_MAX && bounties.length >= bountyLimit;

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <div>
        <SectionLabel>discover</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">
          {query
            ? <>Results for <span className="text-creator">&ldquo;{query}&rdquo;</span></>
            : 'Explore'}
        </h1>
        <p className="text-sm text-muted mt-1">
          {query
            ? 'Creators, bounties, and handles.'
            : 'Browse creators and the bounties their communities are backing.'}
        </p>
      </div>

      {browsing ? (
        <BrowseView
          creators={creators}
          loading={browseLoading}
          sort={creatorSort}
          onSortChange={setSort}
          page={creatorPage}
          onPageChange={setCreatorPage}
          trending={trending}
        />
      ) : (
        <>
          {/* Filter tabs */}
          <PillRow
            options={FILTER_TABS.map((t) => ({ value: t.key, label: t.label }))}
            value={type}
            onChange={setType}
          />

          {/* People */}
          {showPeople && (
            <section className="space-y-3">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted/70">People</h2>
              {people.length === 0 && !loading ? (
                <EmptyNote>No people match this search.</EmptyNote>
              ) : (
                <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
                  {people.map((p) => <PersonRow key={`${p.type}-${p.id}`} person={p} />)}
                </div>
              )}
              {morePeople && (
                <ShowMore onClick={() => setPeopleLimit((n) => Math.min(n + PEOPLE_STEP, PEOPLE_MAX))} loading={loading} />
              )}
            </section>
          )}

          {/* Bounties */}
          {showBounties && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted/70">Bounties</h2>
                <Toggle on={includeCompleted} onChange={setIncludeCompleted} label="include completed" className="text-xs text-muted" />
              </div>
              {bounties.length === 0 && !loading ? (
                <EmptyNote>
                  No bounties match this search.{' '}
                  <Link href={`/bounties/new?handle=${encodeURIComponent(query)}`} className="text-creator hover:underline">
                    Create one targeting &ldquo;{query}&rdquo; →
                  </Link>
                </EmptyNote>
              ) : (
                <div className="flex flex-col gap-3">
                  {bounties.map((b) => <BountyRow key={b.id} bounty={b} />)}
                </div>
              )}
              {moreBounties && (
                <ShowMore onClick={() => setBountyLimit((n) => Math.min(n + BOUNTIES_STEP, BOUNTIES_MAX))} loading={loading} />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── Browse (no-query) view ──────────────────────────────────────────────────────
function BrowseView({
  creators,
  loading,
  sort,
  onSortChange,
  page,
  onPageChange,
  trending,
}: {
  creators: PaginatedResponse<Creator> | null;
  loading: boolean;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  page: number;
  onPageChange: (updater: (p: number) => number) => void;
  trending: SearchBountyResult[];
}) {
  return (
    <div className="space-y-10">
      {/* Creators */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted/70">Creators</h2>
          <PillRow options={SORT_OPTIONS} value={sort} onChange={onSortChange} />
        </div>

        {loading && !creators ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 bg-surface animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !creators || creators.data.length === 0 ? (
          <Empty message="no verified creators yet" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {creators.data.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
            {creators.last_page > 1 && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <Button variant="default" size="sm" onClick={() => onPageChange((p) => p - 1)} disabled={page === 1}>
                  ← prev
                </Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {creators.current_page} / {creators.last_page}
                </span>
                <Button variant="default" size="sm" onClick={() => onPageChange((p) => p + 1)} disabled={page === creators.last_page}>
                  next →
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Trending bounties */}
      {trending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted/70">Trending bounties</h2>
          <div className="flex flex-col gap-3">
            {trending.map((b) => <BountyRow key={b.id} bounty={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted border border-dashed border-border rounded-xl px-4 py-6 text-center">{children}</p>;
}

function ShowMore({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="text-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="text-sm text-fan font-medium hover:underline disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Show more'}
      </button>
    </div>
  );
}

function PersonRow({ person }: { person: SearchPerson }) {
  const external = isExternal(person.url);
  const subline =
    person.open_bounty_count > 0
      ? `${person.open_bounty_count} open ${person.open_bounty_count === 1 ? 'bounty' : 'bounties'} · ${fmtMoney(person.total_backed_open)} backed`
      : person.type === 'creator' ? 'Creator' : 'Unverified';

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatar_url} alt={person.display_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : person.type === 'unverified_handle' ? (
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 bg-border text-muted">
          ?
        </span>
      ) : (
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ background: '#47DFD3', color: '#0a0a0a' }}>
          {person.display_name?.charAt(0).toUpperCase() ?? '?'}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{person.display_name}</span>
          <Badge tone={person.type === 'creator' ? 'creator' : 'default'} className="shrink-0">
            {person.type === 'creator' ? 'creator' : 'unverified'}
          </Badge>
        </div>
        {person.type === 'creator' && person.primary_handle && (
          <div className="font-mono text-[11px] text-muted/80 truncate">{person.primary_handle.label}</div>
        )}
        <div className="text-xs text-muted truncate">{subline}</div>
        {person.match_reason?.kind === 'alias' && person.match_reason.value && (
          <div className="text-[11px] text-muted/70 truncate">
            matched alias: {person.match_reason.value}
          </div>
        )}
      </div>
    </div>
  );

  if (!person.url) return inner;
  return external ? (
    <a href={person.url} target="_blank" rel="noopener noreferrer">{inner}</a>
  ) : (
    <Link href={person.url}>{inner}</Link>
  );
}

function BountyRow({ bounty }: { bounty: SearchBountyResult }) {
  const snippet = bounty.match_reason?.kind === 'description' ? sanitizeSnippet(bounty.match_reason?.snippet) : '';
  return (
    <Link
      href={bounty.url}
      className="block bg-surface border border-border rounded-xl p-4 hover:border-fan/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-semibold text-foreground leading-snug line-clamp-2">{bounty.title}</h3>
        <BountyStatusBadge status={bounty.status} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-fan font-bold">{fmtMoney(bounty.amount_backed)}</span>
        {bounty.creator.display_name && <span className="text-muted truncate">· {bounty.creator.display_name}</span>}
      </div>
      {snippet && (
        <p
          className="mt-1.5 text-xs text-muted line-clamp-2 [&_mark]:bg-fan/25 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
          dangerouslySetInnerHTML={{ __html: snippet }}
        />
      )}
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pt-2 text-muted text-sm">Loading…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
