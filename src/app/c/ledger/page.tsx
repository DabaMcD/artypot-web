'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cash as cashApi } from '@/lib/api';
import type { CreatorBalance, CashLedgerEntry } from '@/lib/types';
import { BILLING_DAY, BILLING_GRACE_PERIOD_DAYS } from '@/lib/config';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BalancePipeline } from '@/components/ui/Pipeline';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** True while the clearing window is still open. */
function isClearing(entry: CashLedgerEntry) {
  if (!entry.available_after) return false;
  return new Date(entry.available_after) > new Date();
}

/** Classify a row into a display type. */
function entryKind(entry: CashLedgerEntry): 'earning' | 'stripe' | 'external' | 'adjustment' {
  if (entry.fan_payment_id && Number(entry.amount) > 0) return 'earning';
  if (entry.creator_withdrawal_id && Number(entry.amount) < 0) return 'stripe';
  if (entry.external_payout_id) return 'external';
  return 'adjustment';
}

type FilterTab = 'all' | 'earnings' | 'payouts';

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ entry }: { entry: CashLedgerEntry }) {
  const kind = entryKind(entry);

  if (kind === 'earning') return <Badge tone="creator">earning</Badge>;
  if (kind === 'stripe')  return <Badge tone="info">stripe</Badge>;

  if (kind === 'external' && entry.external_payout) {
    const toneMap: Record<string, 'creator' | 'info' | 'good' | 'default'> = {
      wise: 'creator', paypal: 'info', wire: 'good', check: 'default', other: 'default',
    };
    return <Badge tone={toneMap[entry.external_payout.method] ?? 'default'}>{entry.external_payout.method}</Badge>;
  }
  return null;
}

// ── Single ledger row ─────────────────────────────────────────────────────────

function LedgerRow({ entry, prevDate }: { entry: CashLedgerEntry; prevDate: string | null }) {
  const amt      = Number(entry.amount);
  const runBal   = Number(entry.running_balance);
  const clearing = isClearing(entry);
  const kind     = entryKind(entry);
  const isCredit = amt > 0;
  // `created_at` is not in the type yet — fall back gracefully
  const rawDate  = (entry as unknown as Record<string, string>).created_at ?? null;
  const dateStr  = rawDate ? fmtDateShort(rawDate) : null;
  const showDate = dateStr && dateStr !== (prevDate ? fmtDateShort(prevDate) : null);
  const refId    = entry.external_payout?.external_reference_id ?? null;

  return (
    <div className={`flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2 ${clearing ? 'opacity-75' : ''}`}>

      {/* Date — suppressed when same as previous row */}
      <div className="w-[68px] shrink-0 pt-0.5">
        {showDate && (
          <span className="font-mono text-[11px] text-muted whitespace-nowrap">{dateStr}</span>
        )}
      </div>

      {/* Description + sub-lines */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${clearing ? 'text-muted' : 'text-foreground'}`}>
          {entry.description}
        </p>

        {entry.bounty && (
          <Link
            href={`/bounties/${entry.bounty.id}`}
            className="font-mono text-[10px] text-muted hover:text-fan transition-colors block mt-0.5 truncate"
          >
            {entry.bounty.title}
          </Link>
        )}

        {refId && (
          <span className="font-mono text-[10px] text-muted/50 block mt-0.5">ref: {refId}</span>
        )}

        {clearing && entry.available_after && (
          <span className="inline-flex items-center gap-1 mt-1 font-mono text-[10px] text-info">
            {/* clock icon */}
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            clearing · available {fmtDate(entry.available_after)}
          </span>
        )}
      </div>

      {/* Type badge */}
      <div className="shrink-0 pt-0.5">
        <TypeBadge entry={entry} />
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right min-w-[72px]">
        <span className={`font-mono text-sm font-semibold tabular-nums ${
          kind === 'earning' ? 'text-creator' : kind === 'adjustment' ? 'text-muted' : 'text-bad'
        }`}>
          {isCredit ? '+' : '−'}{fmt(Math.abs(amt))}
        </span>
      </div>

      {/* Running balance */}
      <div className="shrink-0 text-right w-[76px]">
        <span className="font-mono text-xs text-muted tabular-nums">{fmt(runBal)}</span>
      </div>
    </div>
  );
}

// ── Table column headers ──────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-surface-2/50">
      <div className="w-[68px] shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted/50">date</div>
      <div className="flex-1 font-mono text-[10px] uppercase tracking-widest text-muted/50">description</div>
      <div className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted/50">type</div>
      <div className="shrink-0 min-w-[72px] font-mono text-[10px] uppercase tracking-widest text-muted/50 text-right">amount</div>
      <div className="shrink-0 w-[76px] font-mono text-[10px] uppercase tracking-widest text-muted/50 text-right">balance</div>
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyLedger({ filter }: { filter: FilterTab }) {
  const copy: Record<FilterTab, { icon: string; heading: string; sub: string }> = {
    all: {
      icon: '◇',
      heading: 'No transactions yet',
      sub: 'Complete a bounty, get Council approval, and your first earning will appear here.',
    },
    earnings: {
      icon: '◈',
      heading: 'No earnings yet',
      sub: 'Fan charges post on the billing date after your Council approval.',
    },
    payouts: {
      icon: '◫',
      heading: 'No payouts yet',
      sub: 'Once you have an available balance, withdraw it from the overview page.',
    },
  };
  const { icon, heading, sub } = copy[filter];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <div className="font-mono text-3xl text-muted/30 mb-4 select-none">{icon}</div>
      <p className="text-sm font-semibold text-foreground mb-1.5">{heading}</p>
      <p className="text-sm text-muted max-w-[300px] leading-relaxed">{sub}</p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LedgerSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className={`w-[68px] shrink-0 h-3 rounded ${i % 3 === 0 ? 'bg-surface-2 animate-pulse' : ''}`} />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-surface-2 animate-pulse rounded" style={{ width: `${50 + (i * 11) % 40}%` }} />
            {i % 2 === 0 && <div className="h-2.5 w-1/3 bg-surface-2 animate-pulse rounded" />}
          </div>
          <div className="h-4 w-12 bg-surface-2 animate-pulse rounded-full shrink-0" />
          <div className="h-4 w-16 bg-surface-2 animate-pulse rounded shrink-0" />
          <div className="h-3 w-[76px] bg-surface-2 animate-pulse rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function LedgerContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [balance, setBalance]           = useState<CreatorBalance | null>(null);
  const [balanceLoading, setBalLoading] = useState(true);
  const [page, setPage]                 = useState(1);
  const [lastPage, setLastPage]         = useState(1);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [entries, setEntries]           = useState<CashLedgerEntry[]>([]);
  const [filter, setFilter]             = useState<FilterTab>('all');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const load = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await cashApi.creatorBalance(pageNum);
      setBalance(res);
      const paged = res.available;
      setEntries((prev) => append ? [...prev, ...paged.data] : paged.data);
      setPage(paged.current_page);
      setLastPage(paged.last_page);
    } catch {
      // non-critical — balance numbers will be missing but page still renders
    } finally {
      setBalLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const loadMore = async () => {
    if (page >= lastPage || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, true);
  };

  if (authLoading || !user) return null;

  // Client-side filter (pagination only fetches "all" — filter narrows visible rows)
  const filtered = entries.filter((e) => {
    if (filter === 'earnings') return entryKind(e) === 'earning';
    if (filter === 'payouts')  return entryKind(e) === 'stripe' || entryKind(e) === 'external';
    return true;
  });

  const pendingPayment      = balance?.pending_payment      ?? 0;
  const solidPendingPayment = balance?.solid_pending_payment ?? pendingPayment;
  const clearing            = balance?.clearing             ?? 0;
  const availableBalance    = balance?.available_balance    ?? 0;
  const paidOut             = balance?.paid_out             ?? 0;
  const openPledges         = balance?.open_pledges         ?? 0;
  const solidOpenPledges    = balance?.solid_open_pledges   ?? openPledges;

  return (
    <div className="space-y-7 pt-2">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>creator · money</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">Earnings Ledger</h1>
          <p className="text-sm text-muted mt-1 max-w-[480px]">
            Every credit and debit on your creator account, newest first.
          </p>
        </div>
        <Link
          href="/creator"
          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors shrink-0 pt-1"
        >
          ← overview
        </Link>
      </div>

      {/* ── Balance pipeline ───────────────────────────────────────────────── */}
      {balanceLoading ? (
        <div className="h-[88px] bg-surface border border-border rounded-md animate-pulse" />
      ) : (
        <BalancePipeline
          balances={{
            pending:      pendingPayment,
            solidPending: solidPendingPayment,
            clearing,
            available:    availableBalance,
          }}
        />
      )}

      {/* ── Two-column body ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main ledger (2/3) ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filter tabs — same segmented-button pattern as other pages */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono">
            {(['all', 'earnings', 'payouts'] as const).map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`
                  flex-1 py-2 capitalize transition-colors
                  ${i > 0 ? 'border-l border-border' : ''}
                  ${filter === tab ? 'bg-surface-2 text-foreground' : 'text-muted hover:text-foreground'}
                `}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Ledger table */}
          <Card className="overflow-hidden !p-0">
            <TableHeader />

            {balanceLoading ? (
              <LedgerSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyLedger filter={filter} />
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((entry, idx) => {
                  const prevRaw = idx > 0 ? (filtered[idx - 1] as unknown as Record<string, string>).created_at ?? null : null;
                  return (
                    <LedgerRow key={entry.id} entry={entry} prevDate={prevRaw} />
                  );
                })}
              </div>
            )}

            {/* Pagination footer */}
            {!balanceLoading && (
              <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted/50">
                  {filter === 'all'
                    ? `${entries.length} entries loaded · page ${page} of ${lastPage}`
                    : `${filtered.length} of ${entries.length} loaded entries shown`
                  }
                </span>
                {filter === 'all' && page < lastPage && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {loadingMore ? 'loading…' : 'load more ↓'}
                  </button>
                )}
                {filter !== 'all' && page < lastPage && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {loadingMore ? 'loading…' : 'load more entries ↓'}
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── Sidebar (1/3) ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* At-a-glance balances */}
          <Card>
            <SectionLabel className="mb-4">at a glance</SectionLabel>
            <div className="space-y-4">

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-good inline-block" />
                  available now
                </div>
                {balanceLoading
                  ? <div className="h-7 w-24 bg-surface-2 animate-pulse rounded mt-1" />
                  : <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">{fmt(availableBalance)}</div>
                }
              </div>

              <div className="border-t border-dashed border-border" />

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-info inline-block" />
                  clearing
                </div>
                {balanceLoading
                  ? <div className="h-5 w-16 bg-surface-2 animate-pulse rounded mt-1" />
                  : <div className="font-mono text-lg font-medium text-foreground tabular-nums">{fmt(clearing)}</div>
                }
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn inline-block" />
                  open backing
                </div>
                {balanceLoading
                  ? <div className="h-5 w-16 bg-surface-2 animate-pulse rounded mt-1" />
                  : (
                    <>
                      <div className="font-mono text-lg font-medium text-foreground tabular-nums">{fmt(solidOpenPledges)}</div>
                      {solidOpenPledges < openPledges && (
                        <div className="font-mono text-[10px] text-muted mt-0.5">
                          + {fmt(openPledges - solidOpenPledges)} soft
                        </div>
                      )}
                    </>
                  )
                }
              </div>

              <div className="border-t border-dashed border-border" />

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">lifetime paid out</div>
                {balanceLoading
                  ? <div className="h-5 w-20 bg-surface-2 animate-pulse rounded mt-1" />
                  : <div className="font-mono text-lg font-medium text-foreground tabular-nums">{fmt(paidOut)}</div>
                }
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {!balanceLoading && availableBalance > 0 && (
                <Link href="/c/withdraw">
                  <Button variant="primary" className="w-full justify-center">
                    Withdraw {fmt(availableBalance)} →
                  </Button>
                </Link>
              )}
              <Link href="/creator">
                <Button variant="default" className="w-full justify-center">
                  Back to overview
                </Button>
              </Link>
            </div>
          </Card>

          {/* Explainer */}
          <Card dashed>
            <SectionLabel className="mb-3">how this works</SectionLabel>
            <div className="space-y-3 text-sm text-muted leading-relaxed">
              <p>
                <span className="text-foreground font-semibold">Earning</span> — fans are billed on
                the {BILLING_DAY}th. The gross amount minus the platform fee is credited to your ledger.
              </p>
              <p>
                <span className="text-foreground font-semibold">Clearing</span> — funds are held for{' '}
                {BILLING_GRACE_PERIOD_DAYS} days to cover disputes. After that they move to Available.
              </p>
              <p>
                <span className="text-foreground font-semibold">Payout</span> — you withdraw from
                the overview page. Stripe hits your bank in 1–3 business days.
              </p>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense>
      <LedgerContent />
    </Suspense>
  );
}
