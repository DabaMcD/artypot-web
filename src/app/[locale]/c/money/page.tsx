'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { useMoney, useDateFormats } from '@/lib/format';
import { cash as cashApi } from '@/lib/api';
import type { CreatorBalance, CreatorEarning, CashLedgerEntry } from '@/lib/types';
import { BILLING_DAY, BILLING_GRACE_PERIOD_DAYS } from '@/lib/config';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { BalancePipeline } from '@/components/ui/Pipeline';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True while the clearing window is still open. */
function isClearing(entry: CashLedgerEntry) {
  if (!entry.available_after) return false;
  return new Date(entry.available_after) > new Date();
}

/** Classify a row into a display type — prefers the explicit entry_type, falls
 *  back to the legacy field-presence heuristic for any unstamped legacy rows. */
function entryKind(entry: CashLedgerEntry): 'earning' | 'fee' | 'stripe' | 'external' | 'refund' | 'adjustment' {
  switch (entry.entry_type) {
    case 'creator_earning':          return 'earning';
    case 'platform_fee':
    case 'platform_fee_tax':         return 'fee';
    case 'creator_withdrawal':       return 'stripe';
    case 'external_payout':
    case 'external_payout_reversal': return 'external';
    case 'refund_clawback':          return 'refund';
    case 'dispute_adjustment':
    case 'adjustment':               return 'adjustment';
  }
  // Legacy fallback (rows written before entry_type existed).
  if (entry.fan_payment_id && Number(entry.amount) > 0) return 'earning';
  if (entry.creator_withdrawal_id && Number(entry.amount) < 0) return 'stripe';
  if (entry.external_payout_id) return 'external';
  return 'adjustment';
}

type FilterTab = 'all' | 'earnings' | 'payouts';

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ entry }: { entry: CashLedgerEntry }) {
  const t = useTranslations('CreatorMoney');
  const kind = entryKind(entry);

  if (kind === 'earning') return <Badge tone="creator">{t('badge.earning')}</Badge>;
  if (kind === 'fee')     return <Badge tone="warn">{t('badge.fee')}</Badge>;
  if (kind === 'stripe')  return <Badge tone="info">stripe</Badge>;
  if (kind === 'refund')  return <Badge tone="bad">{t('badge.refund')}</Badge>;

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
  const t        = useTranslations('CreatorMoney');
  const money    = useMoney();
  const dates    = useDateFormats();
  const amt      = Number(entry.amount);
  const clearing = isClearing(entry);
  const kind     = entryKind(entry);
  const isCredit = amt > 0;
  // `created_at` is not in the type yet — fall back gracefully
  const rawDate  = (entry as unknown as Record<string, string>).created_at ?? null;
  const dateStr  = rawDate ? dates.short(rawDate) : null;
  const showDate = dateStr && dateStr !== (prevDate ? dates.short(prevDate) : null);
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
          <span className="font-mono text-[10px] text-muted/50 block mt-0.5">{t('row.ref', { id: refId })}</span>
        )}

        {/* Historical earnings: derived gross/fee breakdown (newer payouts show
            the fee as its own row instead). */}
        {kind === 'earning' && entry.platform_fee != null && entry.platform_fee > 0 && (
          <span className="font-mono text-[10px] text-muted/70 block mt-0.5">
            {entry.gross_amount != null ? t('row.gross', { amount: money(Number(entry.gross_amount)) }) + ' · ' : ''}
            −{money(Number(entry.platform_fee))} {t('row.platformFee')}
          </span>
        )}

        {clearing && entry.available_after && (
          <span className="inline-flex items-center gap-1 mt-1 font-mono text-[10px] text-info">
            {/* clock icon */}
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            {t('row.clearingAvailable', { date: dates.short(entry.available_after) })}
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
          kind === 'earning' ? 'text-creator'
            : kind === 'fee' || kind === 'adjustment' ? 'text-muted'
            // Refunds are usually a clawback (debit, red); a failed-refund
            // reversal credits the balance back, so colour by direction.
            : kind === 'refund' ? (isCredit ? 'text-good' : 'text-bad')
            : 'text-bad'
        }`}>
          {isCredit ? '+' : '−'}{money(Math.abs(amt))}
        </span>
      </div>
    </div>
  );
}

// ── Table column headers ──────────────────────────────────────────────────────

function TableHeader() {
  const t = useTranslations('CreatorMoney');
  return (
    <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-surface-2/50">
      <div className="w-[68px] shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted/50">{t('table.date')}</div>
      <div className="flex-1 font-mono text-[10px] uppercase tracking-widest text-muted/50">{t('table.description')}</div>
      <div className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted/50">{t('table.type')}</div>
      <div className="shrink-0 min-w-[72px] font-mono text-[10px] uppercase tracking-widest text-muted/50 text-right">{t('table.amount')}</div>
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyLedger({ filter }: { filter: FilterTab }) {
  const t = useTranslations('CreatorMoney');
  const icons: Record<FilterTab, string> = { all: '◇', earnings: '◈', payouts: '◫' };
  const icon = icons[filter];
  const heading = t(`empty.${filter}.heading`);
  const sub = t(`empty.${filter}.sub`);
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
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function MoneyContent() {
  const t = useTranslations('CreatorMoney');
  const money = useMoney();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [balance, setBalance]           = useState<CreatorBalance | null>(null);
  const [balanceLoading, setBalLoading] = useState(true);
  const [page, setPage]                 = useState(1);
  const [lastPage, setLastPage]         = useState(1);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [entries, setEntries]           = useState<CashLedgerEntry[]>([]);
  const [filter, setFilter]             = useState<FilterTab>('all');
  const [earnings, setEarnings]         = useState<CreatorEarning[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    cashApi
      .creatorEarnings()
      .then((res) => setEarnings(res.data))
      .catch(() => setEarnings([]));
  }, []);

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
    const k = entryKind(e);
    // Refunds (clawbacks) reverse a prior earning, so they belong in the
    // earnings view — otherwise net earnings can't be reconciled from that tab.
    if (filter === 'earnings') return k === 'earning' || k === 'fee' || k === 'refund';
    if (filter === 'payouts')  return k === 'stripe' || k === 'external';
    return true;
  });

  const pendingPayment      = balance?.pending_payment      ?? 0;
  const solidPendingPayment = balance?.solid_pending_payment ?? pendingPayment;
  const clearing            = balance?.clearing             ?? 0;
  const availableBalance    = balance?.available_balance    ?? 0;
  const paidOut             = balance?.paid_out             ?? 0;
  const lifetimeFees        = balance?.lifetime_platform_fees ?? 0;
  const openBackings         = balance?.open_backings         ?? 0;
  const solidOpenBackings    = balance?.solid_open_backings   ?? openBackings;

  // Payout categories: 2 = manual processing (Wise/PayPal/wire), 3 = payouts
  // unavailable in the creator's country entirely.
  const isManualPayout  = user.creator?.payout_category === 2;
  const isPayoutBlocked = user.creator?.payout_category === 3;
  const payoutMinimum   = user.creator?.payout_minimum ?? 50;

  return (
    <div className="space-y-7 pt-2">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{t('header.crumbCreator')} · {t('header.crumbMoney')}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('header.title')}</h1>
          <p className="text-sm text-muted mt-1 max-w-[480px]">
            {t('header.subtitle')}
          </p>
        </div>
        <Link
          href="/c"
          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors shrink-0 pt-1"
        >
          {t('header.overviewLink')}
        </Link>
      </div>

      {/* ── Restricted-region notice ──────────────────────────────────────── */}
      {isPayoutBlocked && (
        <Banner tone="bad">
          <div>
            {t.rich('regionBlocked.body', {
              strong: (chunks) => <strong>{chunks}</strong>,
              support: (chunks) => (
                <a href="mailto:support@artypot.com" className="ap-inline-link">{chunks}</a>
              ),
            })}
          </div>
        </Banner>
      )}

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
                {t(`filter.${tab}`)}
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
                    ? t('pagination.allCount', { loaded: entries.length, page, last: lastPage })
                    : t('pagination.filteredCount', { shown: filtered.length, loaded: entries.length })
                  }
                </span>
                {filter === 'all' && page < lastPage && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {loadingMore ? t('pagination.loading') : t('pagination.loadMore')}
                  </button>
                )}
                {filter !== 'all' && page < lastPage && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {loadingMore ? t('pagination.loading') : t('pagination.loadMoreEntries')}
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* ── Per-bounty breakdown ──────────────────────────────────────── */}
          {earnings && earnings.length > 0 && (
            <Card className="overflow-hidden !p-0">
              <div className="px-5 pt-4 pb-3 border-b border-border">
                <SectionLabel>{t('byProject.label')}</SectionLabel>
              </div>
              <div className="divide-y divide-border">
                {earnings.map((earning) => {
                  const earnedPct = earning.total > 0
                    ? Math.min((earning.earned / earning.total) * 100, 100)
                    : 0;
                  return (
                    <div key={earning.bounty.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4 mb-2.5">
                        <Link
                          href={`/bounties/${earning.bounty.id}`}
                          className="text-sm font-semibold text-foreground hover:text-creator transition-colors leading-snug"
                        >
                          {earning.bounty.title}
                        </Link>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted shrink-0 pt-0.5">
                          {earning.bounty.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mb-2.5">
                        <div
                          className="h-full bg-creator rounded-full transition-all"
                          style={{ width: `${earnedPct}%` }}
                        />
                      </div>
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <span className="font-mono text-lg font-medium tabular-nums text-foreground">
                            {money(earning.earned)}
                          </span>
                          <span className="font-mono text-[10px] text-muted ml-2">
                            {t('byProject.ofPotential', { total: money(earning.total) })}
                          </span>
                        </div>
                        {earning.incoming > 0 && (
                          <span className="font-mono text-xs text-warn tabular-nums">
                            {t('byProject.incoming', { amount: money(earning.incoming) })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border px-5 py-3">
                <p className="font-mono text-[10px] text-muted/50">
                  {t('byProject.note')}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* ── Sidebar (1/3) ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* At-a-glance balances */}
          <Card>
            <SectionLabel className="mb-4">{t('glance.label')}</SectionLabel>
            <div className="space-y-4">

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-good inline-block" />
                  {t('glance.availableNow')}
                </div>
                {balanceLoading
                  ? <div className="h-7 w-24 bg-surface-2 animate-pulse rounded mt-1" />
                  : <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">{money(availableBalance)}</div>
                }
              </div>

              <div className="border-t border-dashed border-border" />

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-info inline-block" />
                  {t('glance.clearing')}
                </div>
                {balanceLoading
                  ? <div className="h-5 w-16 bg-surface-2 animate-pulse rounded mt-1" />
                  : <div className="font-mono text-lg font-medium text-foreground tabular-nums">{money(clearing)}</div>
                }
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn inline-block" />
                  {t('glance.openBacking')}
                </div>
                {balanceLoading
                  ? <div className="h-5 w-16 bg-surface-2 animate-pulse rounded mt-1" />
                  : (
                    <>
                      <div className="font-mono text-lg font-medium text-foreground tabular-nums">{money(solidOpenBackings)}</div>
                      {solidOpenBackings < openBackings && (
                        <div className="font-mono text-[10px] text-muted mt-0.5">
                          {t('glance.soft', { amount: money(openBackings - solidOpenBackings) })}
                        </div>
                      )}
                    </>
                  )
                }
              </div>

              <div className="border-t border-dashed border-border" />

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">{t('glance.lifetimePaidOut')}</div>
                {balanceLoading
                  ? <div className="h-5 w-20 bg-surface-2 animate-pulse rounded mt-1" />
                  : <div className="font-mono text-lg font-medium text-foreground tabular-nums">{money(paidOut)}</div>
                }
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">{t('glance.platformFees')}</div>
                {balanceLoading
                  ? <div className="h-5 w-20 bg-surface-2 animate-pulse rounded mt-1" />
                  : (
                    <>
                      <div className="font-mono text-lg font-medium text-muted tabular-nums">{money(lifetimeFees)}</div>
                      <div className="font-mono text-[10px] text-muted/60 mt-0.5">{t('glance.withheldToDate')}</div>
                    </>
                  )
                }
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {!balanceLoading && availableBalance > 0 && (
                <Link href="/c/payouts#available">
                  <Button variant="primary" className="w-full justify-center">
                    {t('glance.withdrawCta', { amount: money(availableBalance) })}
                  </Button>
                </Link>
              )}
              <Link href="/c">
                <Button variant="default" className="w-full justify-center">
                  {t('glance.backToOverview')}
                </Button>
              </Link>
            </div>
          </Card>

          {/* Explainer */}
          <Card dashed>
            <SectionLabel className="mb-3">{t('explainer.label')}</SectionLabel>
            <div className="space-y-3 text-sm text-muted leading-relaxed">
              <p>
                {t.rich('explainer.earning', {
                  day: BILLING_DAY,
                  term: (chunks) => <span className="text-foreground font-semibold">{chunks}</span>,
                  earning: (chunks) => <span className="text-creator">{chunks}</span>,
                  fee: (chunks) => <span className="text-warn">{chunks}</span>,
                })}
              </p>
              <p>
                {t.rich('explainer.clearing', {
                  days: BILLING_GRACE_PERIOD_DAYS,
                  term: (chunks) => <span className="text-foreground font-semibold">{chunks}</span>,
                })}
              </p>
              <p>
                {isManualPayout
                  ? t.rich('explainer.payoutManual', {
                      min: money(payoutMinimum),
                      term: (chunks) => <span className="text-foreground font-semibold">{chunks}</span>,
                      amount: (chunks) => <span className="text-foreground">{chunks}</span>,
                    })
                  : t.rich('explainer.payoutAuto', {
                      term: (chunks) => <span className="text-foreground font-semibold">{chunks}</span>,
                      link: (chunks) => <Link href="/c/payouts" className="ap-inline-link">{chunks}</Link>,
                    })
                }
              </p>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

export default function MoneyPage() {
  return (
    <Suspense>
      <MoneyContent />
    </Suspense>
  );
}
