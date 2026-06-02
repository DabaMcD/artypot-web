'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { search as searchApi } from '@/lib/api';
import type { SearchResponse, SearchPerson, SearchBountyResult } from '@/lib/types';
import { sanitizeSnippet } from '@/lib/search/sanitizeSnippet';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';

type FilterType = 'all' | 'people' | 'bounties';

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

function SearchPageInner() {
  const params = useSearchParams();
  const router = useRouter();

  const query = (params.get('q') ?? '').trim();
  const type = (params.get('type') as FilterType) || 'all';

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [peopleLimit, setPeopleLimit] = useState(PEOPLE_STEP);
  const [bountyLimit, setBountyLimit] = useState(BOUNTIES_STEP);
  const [includeCompleted, setIncludeCompleted] = useState(false);

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

  const load = useCallback(async () => {
    if (query.length < 2) {
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
  }, [query, peopleLimit, bountyLimit, includeCompleted]);

  useEffect(() => { load(); }, [load]);

  const setType = (next: FilterType) => {
    const sp = new URLSearchParams(params.toString());
    if (next === 'all') sp.delete('type');
    else sp.set('type', next);
    router.replace(`/search?${sp.toString()}`);
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-foreground mb-1">
        {query ? <>Results for <span className="text-creator">&ldquo;{query}&rdquo;</span></> : 'Search'}
      </h1>
      <p className="text-sm text-muted mb-6">Creators, bounties, and handles.</p>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setType(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              type === tab.key ? 'bg-fan text-brand-dark' : 'bg-surface-2 text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {query.length < 2 ? (
        <p className="text-muted text-sm">Enter at least 2 characters to search.</p>
      ) : (
        <>
          {/* People */}
          {showPeople && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted/70">People</h2>
              </div>
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
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted/70">Bounties</h2>
                <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCompleted}
                    onChange={(e) => setIncludeCompleted(e.target.checked)}
                    className="accent-fan"
                  />
                  include completed
                </label>
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

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted border border-dashed border-border rounded-xl px-4 py-6 text-center">{children}</p>;
}

function ShowMore({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="mt-3 text-center">
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
          <span className={`shrink-0 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded ${person.type === 'creator' ? 'bg-creator/15 text-creator' : 'bg-border text-muted'}`}>
            {person.type === 'creator' ? 'creator' : 'unverified'}
          </span>
        </div>
        <div className="text-xs text-muted truncate">{subline}</div>
        {person.match_reason?.value && (
          <div className="text-[11px] text-muted/70 truncate">
            {person.match_reason.kind === 'alias' ? 'matched alias' : 'matched'}: {person.match_reason.value}
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
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-8 text-muted text-sm">Loading…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
