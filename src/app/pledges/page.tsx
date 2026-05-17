'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pledges as pledgesApi, billing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicUserPledge, CashBalance } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { BILLING_DAY } from '@/lib/config';

type SortKey = 'date' | 'amount';

const STATUS_BADGE: Record<string, { label: string; tone: 'default' | 'info' | 'good' | 'warn' | 'bad' }> = {
  open:      { label: 'open',      tone: 'default' },
  pending:   { label: 'approved',  tone: 'warn' },
  completed: { label: 'submitted', tone: 'info' },
  paid_out:  { label: 'paid out',  tone: 'good' },
  revoked:   { label: 'revoked',   tone: 'bad' },
};

export default function MyPledgesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [pledges, setPledges] = useState<PublicUserPledge[]>([]);
  const [sort, setSort] = useState<SortKey>('date');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalActiveAmount, setTotalActiveAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashBalance, setCashBalance] = useState<CashBalance | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const load = useCallback((s: SortKey, p: number) => {
    setLoading(true);
    pledgesApi
      .list({ sort: s, page: p })
      .then((res) => {
        setPledges(res.data);
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

  useEffect(() => {
    if (!user) return;
    billing.cash().then(setCashBalance).catch(() => {});
  }, [user]);

  const handleSort = (s: SortKey) => {
    if (s === sort) return;
    setSort(s);
    setPage(1);
  };

  const now = new Date();
  const nextBillingDate = now.getDate() < BILLING_DAY
    ? new Date(now.getFullYear(), now.getMonth(), BILLING_DAY)
    : new Date(now.getFullYear(), now.getMonth() + 1, BILLING_DAY);
  const billingDateStr = nextBillingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const outstandingAmount = cashBalance !== null && cashBalance.balance < 0
    ? Math.abs(cashBalance.balance)
    : 0;

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
          <SectionLabel>fan · history</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">history & receipts</h1>
          <p className="text-sm text-muted mt-1">
            {total} {total !== 1 ? 'commitments' : 'commitment'}
            {totalActiveAmount !== null && totalActiveAmount > 0 && (
              <> · <span className="text-foreground">${totalActiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} active</span></>
            )}
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">← dashboard</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* Left: list */}
        <div className="space-y-4">
          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted mr-2">sort by</span>
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
                {s === 'date' ? 'most recent' : 'highest amount'}
              </button>
            ))}
          </div>

          {loading ? (
            <Card>
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />)}
              </div>
            </Card>
          ) : pledges.length === 0 ? (
            <Empty icon="◇" message="No pledges yet">
              <Link href="/creators"><Button variant="default" size="sm">Find Creators →</Button></Link>
            </Empty>
          ) : (
            <Card>
              <div className="divide-y divide-border -mx-5 -my-4">
                {pledges.map((pledge) => {
                  const status = pledge.bounty?.status ?? 'open';
                  const badge = STATUS_BADGE[status] ?? { label: status, tone: 'default' as const };
                  return (
                    <div key={pledge.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        {pledge.bounty ? (
                          <Link
                            href={`/bounties/${pledge.bounty_id}`}
                            className="text-sm text-foreground hover:text-fan transition-colors block truncate"
                          >
                            {pledge.bounty.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted">bounty #{pledge.bounty_id}</span>
                        )}
                        <div className="font-mono text-[10px] text-muted mt-0.5">
                          {new Date(pledge.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {pledge.expires_at && (
                            <> · expires {new Date(pledge.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>
                          )}
                        </div>
                      </div>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <span className="font-mono text-sm font-medium text-fan tabular-nums shrink-0">
                        ${Number(pledge.amount).toFixed(2)}
                      </span>
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
                ← prev
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
                next →
              </Button>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">next charge</div>
            <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
              ${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="font-mono text-[10px] text-muted mt-0.5">on {billingDateStr}</div>
            <div className="border-t border-border mt-3 pt-3">
              <p className="text-xs text-muted">fees are deducted from creator payouts — you pay exactly this amount.</p>
            </div>
          </Card>
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">payment method</div>
            <Link href="/billing" className="ap-inline-link text-sm">manage billing →</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
