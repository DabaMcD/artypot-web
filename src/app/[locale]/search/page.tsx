'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useMoney } from '@/lib/format';
import { search as searchApi } from '@/lib/api';
import type { SearchResponse, SearchPerson, SearchBountyResult } from '@/lib/types';
import { sanitizeSnippet } from '@/lib/search/sanitizeSnippet';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { SectionLabel } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { FilterDropdown, type FilterOption } from '@/components/browse/BrowseControls';

type FilterType = 'people' | 'bounties';
type Sort = 'relevance' | 'most_backed';

const MIN_CHARS = 2;
const PEOPLE_MAX = 10;
const BOUNTIES_MAX = 20;
const PEOPLE_STEP = 5;
const BOUNTIES_STEP = 10;

const isExternal = (url: string | null | undefined) => !!url && /^https?:\/\//i.test(url);

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SearchPageInner() {
  const t = useTranslations('Search');
  const params = useSearchParams();
  const router = useRouter();

  // `query` (state) drives the fetch + render. It is seeded from ?q= and re-set
  // DIRECTLY whenever the URL changes (header search, back/forward), so arriving
  // at /search?q=… always fetches — the fetch never depends on a router
  // round-trip. The in-content box (`input`) is the editable mirror; typing it
  // debounces into both `query` (instant-feeling fetch) and the URL (shareable).
  const urlQuery = (params.get('q') ?? '').trim();
  const [input, setInput] = useState(urlQuery);
  const [query, setQuery] = useState(urlQuery);
  const active = query.length >= MIN_CHARS;

  useEffect(() => {
    setInput(urlQuery);
    setQuery(urlQuery);
  }, [urlQuery]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = useCallback(
    (raw: string) => {
      const v = raw.trim();
      setQuery(v);
      const sp = new URLSearchParams(params.toString());
      if (v) sp.set('q', v);
      else sp.delete('q');
      router.replace(`/search${sp.toString() ? `?${sp.toString()}` : ''}`);
    },
    [params, router],
  );
  const onInputChange = (raw: string) => {
    setInput(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(raw), 300);
  };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const [type, setType] = useState<FilterType | null>(null); // null = all
  const [sort, setSort] = useState<Sort>('relevance');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [peopleLimit, setPeopleLimit] = useState(PEOPLE_STEP);
  const [bountyLimit, setBountyLimit] = useState(BOUNTIES_STEP);
  const [includeCompleted, setIncludeCompleted] = useState(false);

  // Reset paging when the query or completed-toggle changes (render-time adjust).
  const resetKey = `${query}|${includeCompleted}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPeopleLimit(PEOPLE_STEP);
    setBountyLimit(BOUNTIES_STEP);
  }

  const load = useCallback(async () => {
    if (!active) {
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
  }, [active, query, peopleLimit, bountyLimit, includeCompleted]);

  useEffect(() => {
    load();
  }, [load]);

  const showPeople = type == null || type === 'people';
  const showBounties = type == null || type === 'bounties';

  // Relevance keeps the server order; "most backed" re-sorts the loaded set
  // client-side (the search API is relevance-ranked + capped, so there is no
  // server sort to defer to).
  const rawPeople = data?.people ?? [];
  const rawBounties = data?.bounties ?? [];
  const people =
    sort === 'most_backed' ? [...rawPeople].sort((a, b) => b.total_backed_open - a.total_backed_open) : rawPeople;
  const bounties =
    sort === 'most_backed' ? [...rawBounties].sort((a, b) => b.amount_backed - a.amount_backed) : rawBounties;

  const resultCount = (showPeople ? people.length : 0) + (showBounties ? bounties.length : 0);

  const morePeople = peopleLimit < PEOPLE_MAX && (data?.people.length ?? 0) >= peopleLimit;
  const moreBounties = bountyLimit < BOUNTIES_MAX && (data?.bounties.length ?? 0) >= bountyLimit;

  const typeOptions: FilterOption[] = [
    { value: 'people', label: t('filters.people') },
    { value: 'bounties', label: t('filters.bounties') },
  ];
  const sortOptions: FilterOption[] = [
    { value: 'relevance', label: t('sort.relevance') },
    { value: 'most_backed', label: t('sort.mostBacked') },
  ];

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-7 py-10">
      <SectionLabel>{t('header.label')}</SectionLabel>
      <h1 className="font-display font-bold text-[28px] text-foreground mt-1 mb-1">
        {active
          ? t.rich('header.resultsFor', {
              query,
              highlight: (chunks) => <span className="text-creator">&ldquo;{chunks}&rdquo;</span>,
            })
          : t('header.promptTitle')}
      </h1>
      <p className="text-sm text-muted mb-5">{active ? t('header.resultsSubtitle') : t('header.promptSubtitle')}</p>

      {/* In-content search bar */}
      <div className="relative mb-6">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          autoFocus
          className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-2 border border-border text-foreground placeholder:text-muted/70 text-base focus:outline-none focus:border-fan/60 transition-colors [&::-webkit-search-cancel-button]:hidden"
        />
        {input && (
          <button
            type="button"
            onClick={() => { setInput(''); commit(''); }}
            aria-label={t('searchClear')}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <XIcon />
          </button>
        )}
      </div>

      {!active ? (
        <div className="text-center py-14 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted mb-5">{t('empty.promptHint')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/creators" className="text-sm font-medium px-4 py-2 rounded-lg bg-surface border border-border text-foreground hover:border-fan/50 transition-colors">
              {t('empty.browseCreators')}
            </Link>
            <Link href="/bounties" className="text-sm font-medium px-4 py-2 rounded-lg bg-surface border border-border text-foreground hover:border-fan/50 transition-colors">
              {t('empty.browseBounties')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <FilterDropdown label={t('controls.type')} value={type} options={typeOptions} onChange={(v) => setType(v as FilterType | null)} />
            <div className="ml-auto flex items-center gap-3">
              {!loading && (
                <span className="text-xs text-muted whitespace-nowrap tabular-nums">{t('count', { count: resultCount })}</span>
              )}
              <FilterDropdown
                label={t('controls.sort')}
                value={sort}
                options={sortOptions}
                onChange={(v) => setSort((v ?? 'relevance') as Sort)}
                clearable={false}
                icon="sort"
                align="right"
              />
            </div>
          </div>

          <div className="space-y-8">
            {/* People */}
            {showPeople && (
              <section className="space-y-3">
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted/70">{t('sections.people')}</h2>
                {people.length === 0 && !loading ? (
                  <EmptyNote>{t('empty.people')}</EmptyNote>
                ) : (
                  <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {people.map((p) => (
                      <PersonRow key={`${p.type}-${p.id}`} person={p} />
                    ))}
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
                  <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted/70">{t('sections.bounties')}</h2>
                  <Toggle on={includeCompleted} onChange={setIncludeCompleted} label={t('bounties.includeCompleted')} className="text-xs text-muted" />
                </div>
                {bounties.length === 0 && !loading ? (
                  <EmptyNote>
                    {t('empty.bounties')}{' '}
                    <Link href={`/bounties/new?handle=${encodeURIComponent(query)}`} className="text-creator hover:underline">
                      {t('empty.bountiesCreate', { query })} →
                    </Link>
                  </EmptyNote>
                ) : (
                  <div className="flex flex-col gap-3">
                    {bounties.map((b) => (
                      <BountyRow key={b.id} bounty={b} />
                    ))}
                  </div>
                )}
                {moreBounties && (
                  <ShowMore onClick={() => setBountyLimit((n) => Math.min(n + BOUNTIES_STEP, BOUNTIES_MAX))} loading={loading} />
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted border border-dashed border-border rounded-xl px-4 py-6 text-center">{children}</p>;
}

function ShowMore({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const t = useTranslations('Search');
  return (
    <div className="text-center">
      <button onClick={onClick} disabled={loading} className="text-sm text-fan font-medium hover:underline disabled:opacity-50">
        {loading ? t('actions.loading') : t('actions.showMore')}
      </button>
    </div>
  );
}

function PersonRow({ person }: { person: SearchPerson }) {
  const t = useTranslations('Search');
  const money = useMoney();
  const external = isExternal(person.url);
  const subline =
    person.open_bounty_count > 0
      ? `${t('person.openBounties', { count: person.open_bounty_count })} · ${t('person.backed', { amount: money(person.total_backed_open) })}`
      : person.type === 'creator'
        ? t('person.creator')
        : t('person.unverified');

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatar_url} alt={person.display_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : person.type === 'unverified_handle' ? (
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 bg-surface-2 text-muted ring-1 ring-border">
          ?
        </span>
      ) : (
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }}
        >
          {person.display_name?.charAt(0).toUpperCase() ?? '?'}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{person.display_name}</span>
          <Badge tone={person.type === 'creator' ? 'creator' : 'default'} className="shrink-0">
            {person.type === 'creator' ? t('person.badgeCreator') : t('person.badgeUnverified')}
          </Badge>
        </div>
        {person.type === 'creator' && person.primary_handle && (
          <div className="font-mono text-[11px] text-muted/80 truncate">{person.primary_handle.label}</div>
        )}
        <div className="text-xs text-muted truncate">{subline}</div>
        {person.match_reason?.kind === 'alias' && person.match_reason.value && (
          <div className="text-[11px] text-muted/70 truncate">{t('person.matchedAlias', { alias: person.match_reason.value })}</div>
        )}
      </div>
    </div>
  );

  if (!person.url) return inner;
  return external ? (
    <a href={person.url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={person.url}>{inner}</Link>
  );
}

function BountyRow({ bounty }: { bounty: SearchBountyResult }) {
  const money = useMoney();
  const snippet = bounty.match_reason?.kind === 'description' ? sanitizeSnippet(bounty.match_reason?.snippet) : '';
  return (
    <Link href={bounty.url} className="block bg-surface border border-border rounded-xl p-4 hover:border-fan/50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-semibold text-foreground leading-snug line-clamp-2">{bounty.title}</h3>
        <BountyStatusBadge status={bounty.status} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-fan font-bold">{money(bounty.amount_backed)}</span>
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
    <Suspense fallback={<SearchFallback />}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchFallback() {
  const t = useTranslations('Search');
  return <div className="pt-2 text-muted text-sm">{t('actions.loading')}</div>;
}
