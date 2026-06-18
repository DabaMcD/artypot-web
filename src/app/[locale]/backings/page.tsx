'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { backings as backingsApi, bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { PublicUserBacking } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Modal } from '@/components/ui/Modal';
import { nextBillingInfo } from '@/lib/config';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import { useMoney, useDateFormats } from '@/lib/format';

type SortKey = 'date' | 'amount';

export default function MyBackingsPage() {
  const router = useRouter();
  const t = useTranslations('Backings');
  const money = useMoney();
  const dateFmt = useDateFormats();
  const format = useFormatter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [backings, setBackings] = useState<PublicUserBacking[]>([]);
  const [sort, setSort] = useState<SortKey>('date');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalActiveAmount, setTotalActiveAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Per-backing "backing out" in-flight set, plus the backing awaiting a
  // confirm-modal decision.
  const [revoking, setRevoking] = useState<Set<number>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<PublicUserBacking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const load = useCallback((s: SortKey, p: number) => {
    setLoading(true);
    backingsApi
      .list({ sort: s, page: p })
      .then((res) => {
        setBackings(res.data);
        setLastPage(res.last_page);
        setTotal(res.total);
        setTotalActiveAmount(res.total_active_amount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    load(sort, page);
  }, [user, sort, page, load]);

  const handleSort = (s: SortKey) => {
    if (s === sort) return;
    setSort(s);
    setPage(1);
  };

  // Back out of an open backing. Mirrors the bounty-detail revoke but reloads
  // the list afterwards (the row will drop out of the active total). Only open
  // bounties can be backed out — the per-row button is gated on status.
  const handleRevoke = async (backing: PublicUserBacking) => {
    if (revoking.has(backing.id)) return;
    setConfirmTarget(null);
    setRevoking((prev) => new Set(prev).add(backing.id));
    try {
      const result = await bountiesApi.removeBacking(backing.bounty_id, backing.id);
      toast(result.bounty_deleted ? t('toast.backedOutBountyRemoved') : t('toast.backedOut'), 'success');
      load(sort, page);
    } catch (e) {
      toast((e as Error)?.message ?? t('toast.failed'), 'error');
    } finally {
      setRevoking((prev) => {
        const next = new Set(prev);
        next.delete(backing.id);
        return next;
      });
    }
  };

  const { label: billingDateStr } = nextBillingInfo();

  if (authLoading || !user) {
    return (
      <div className="space-y-4 pt-2">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="h-64 bg-surface animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-7 pt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{t('sectionLabel.fan')} · {t('sectionLabel.backings')}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('heading')}</h1>
          <p className="text-sm text-muted mt-1">
            {total} {total !== 1 ? t('count.commitmentPlural') : t('count.commitmentSingular')}
            {totalActiveAmount !== null && totalActiveAmount > 0 && (
              <> · <span className="text-foreground">{t('count.activeAmount', { amount: money(totalActiveAmount) })}</span></>
            )}
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">{t('nav.dashboard')}</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* Left: list */}
        <div className="space-y-4">
          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted mr-2">{t('sort.label')}</span>
            {(['date', 'amount'] as SortKey[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSort(s)}
                className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                  sort === s
                    ? 'bg-[var(--color-role-soft)] border-[var(--color-role)] text-[var(--color-role)]'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {s === 'date' ? t('sort.mostRecent') : t('sort.highestAmount')}
              </button>
            ))}
          </div>

          {loading ? (
            <Card>
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />)}
              </div>
            </Card>
          ) : backings.length === 0 ? (
            <Empty icon="◇" message={t('empty.message')}>
              <Link href="/search"><Button variant="default" size="sm">{t('empty.findCreators')}</Button></Link>
            </Empty>
          ) : (
            <Card>
              <div className="divide-y divide-border -mx-5 -my-4">
                {backings.map((backing) => {
                  const status = backing.bounty?.status ?? 'open';
                  return (
                    <div key={backing.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        {backing.bounty ? (
                          <Link
                            href={`/bounties/${backing.bounty_id}`}
                            className="text-sm text-foreground hover:text-fan transition-colors block truncate"
                          >
                            {backing.bounty.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted">{t('row.bountyFallback', { id: backing.bounty_id })}</span>
                        )}
                        <div className="font-mono text-[10px] text-muted mt-0.5">
                          {dateFmt.short(backing.created_at)}
                          {backing.expires_at && (
                            <> · {t('row.expires', { date: format.dateTime(new Date(backing.expires_at), { month: 'short', year: 'numeric' }) })}</>
                          )}
                        </div>
                      </div>
                      <BountyStatusBadge status={status} />
                      <span className="font-mono text-sm font-medium text-fan tabular-nums shrink-0">
                        {money(Number(backing.amount))}
                      </span>
                      {status === 'open' && (
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(backing)}
                          disabled={revoking.has(backing.id)}
                          className="font-mono text-[10px] uppercase tracking-wider text-muted/60 hover:text-bad transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          {revoking.has(backing.id) ? '…' : t('row.backOut')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="default"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                {t('pagination.prev')}
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {page} / {lastPage}
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage || loading}
              >
                {t('pagination.next')}
              </Button>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* The exact next-charge amount lives on /billing (the authoritative
              owner). We show the deterministic date here and link out for the
              figure rather than re-deriving it client-side. */}
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">{t('sidebar.nextCharge')}</div>
            <div className="font-mono text-sm text-foreground">{t('sidebar.onDate', { date: billingDateStr })}</div>
            <Link href="/billing" className="ap-inline-link text-sm mt-2 inline-block">{t('sidebar.viewAmount')}</Link>
          </Card>
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">{t('sidebar.paymentMethod')}</div>
            <Link href="/billing" className="ap-inline-link text-sm">{t('sidebar.manageBilling')}</Link>
          </Card>
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">{t('sidebar.payments')}</div>
            <Link href="/history" className="ap-inline-link text-sm">{t('sidebar.paymentHistory')}</Link>
          </Card>
        </div>
      </div>

      {/* Back-out confirmation */}
      {confirmTarget && (
        <Modal
          title={t('modal.title')}
          onClose={() => setConfirmTarget(null)}
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(null)}>{t('modal.cancel')}</Button>
              <Button variant="danger" size="sm" onClick={() => handleRevoke(confirmTarget)}>
                {t('modal.confirm')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed">
            {t.rich('modal.body', {
              amount: money(Number(confirmTarget.amount)),
              title: confirmTarget.bounty?.title ?? t('row.bountyFallback', { id: confirmTarget.bounty_id }),
              strong: (chunks) => <span className="text-foreground">{chunks}</span>,
            })}
          </p>
        </Modal>
      )}
    </div>
  );
}
