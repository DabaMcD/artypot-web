'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { billing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { FanPaymentSummary, FanPaymentStatus, PaginatedResponse } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Badge } from '@/components/ui/Badge';

type Filter = 'all' | 'completed' | 'failed';
const TABS: Filter[] = ['all', 'completed', 'failed'];

const STATUS_TONE: Record<FanPaymentStatus, 'default' | 'warn' | 'good' | 'bad'> = {
  completed: 'good',
  failed: 'bad',
  requires_action: 'warn',
  pending: 'default',
};
const STATUS_LABEL: Record<FanPaymentStatus, string> = {
  completed: 'Completed',
  failed: 'Failed',
  requires_action: 'Action needed',
  pending: 'Pending',
};

function fmtMoney(v: number | string) {
  return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PaymentHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [payments, setPayments] = useState<FanPaymentSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const load = useCallback((f: Filter, p: number) => {
    setLoading(true);
    setError(false);
    billing
      .payments({ page: p, status: f === 'all' ? undefined : f })
      .then((res: PaginatedResponse<FanPaymentSummary>) => {
        setPayments(res.data);
        setLastPage(res.last_page);
        setTotal(res.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    load(filter, page);
  }, [user, filter, page, load]);

  const handleFilter = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    setPage(1);
    setExpanded(null);
  };

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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>fan · payments</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">payment history</h1>
          <p className="text-sm text-muted mt-1">
            {total} {total !== 1 ? 'payments' : 'payment'}
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">← dashboard</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* Left: list */}
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleFilter(tab)}
                className={`flex-1 py-2 capitalize transition-colors cursor-pointer ${i > 0 ? 'border-l border-border' : ''} ${
                  filter === tab ? 'bg-surface-2 text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <Card>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />
                ))}
              </div>
            </Card>
          ) : error ? (
            <Empty icon="!" message="Couldn't load payments">
              <Button variant="default" size="sm" onClick={() => load(filter, page)}>
                Retry
              </Button>
            </Empty>
          ) : payments.length === 0 ? (
            <Empty icon="◷" message={filter === 'all' ? 'No payments yet' : `No ${filter} payments`}>
              {filter === 'all' ? (
                <Link href="/search">
                  <Button variant="default" size="sm">Find creators →</Button>
                </Link>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => handleFilter('all')}>
                  Show all
                </Button>
              )}
            </Empty>
          ) : (
            <Card>
              <div className="divide-y divide-border -mx-5 -my-4">
                {payments.map((p) => {
                  const isOpen = expanded === p.id;
                  return (
                    <div key={p.id}>
                      {/* Summary row */}
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : p.id)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface transition-colors cursor-pointer"
                      >
                        <span
                          className={`font-mono text-[10px] text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        >
                          ▶
                        </span>
                        <span className="font-mono text-sm text-foreground tabular-nums">
                          {fmtDate(p.charged_at)}
                        </span>
                        <div className="flex-1" />
                        <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                        <span className="font-mono text-sm font-medium text-fan tabular-nums shrink-0">
                          {fmtMoney(p.gross_paid)}
                        </span>
                      </button>

                      {/* Remediation — a failed or unconfirmed charge previously
                          dead-ended here (the badge with no way to act). Surface a
                          direct route to the settle / update-card flow on /billing. */}
                      {(p.status === 'failed' || p.status === 'requires_action') && (
                        <div className="flex items-center gap-2 px-5 py-2 pl-11 bg-bad-soft/40 border-t border-bad/20">
                          <span className="text-xs text-bad">
                            {p.status === 'requires_action'
                              ? 'This charge needs confirmation before it can complete.'
                              : 'This charge didn’t go through.'}
                          </span>
                          <Link
                            href={p.status === 'requires_action' ? '/billing#authenticate' : '/billing#payment-method'}
                            className="ml-auto shrink-0 font-mono text-[11px] uppercase tracking-wide text-fan hover:opacity-80 transition-opacity"
                          >
                            {p.status === 'requires_action' ? 'Confirm payment →' : 'Update card & retry →'}
                          </Link>
                        </div>
                      )}

                      {/* Expanded: itemized bounties */}
                      {isOpen && (
                        <div className="px-5 pb-3.5 pl-11 space-y-1.5 bg-surface/40">
                          {p.items.length === 0 ? (
                            <div className="font-mono text-[11px] text-muted/60 py-1">
                              No itemized backings for this charge.
                            </div>
                          ) : (
                            p.items.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                {it.bounty ? (
                                  <Link
                                    href={`/bounties/${it.bounty.id}`}
                                    className="text-sm text-foreground hover:text-fan transition-colors truncate"
                                  >
                                    {it.bounty.title}
                                  </Link>
                                ) : (
                                  <span className="text-sm text-muted">bounty #{it.bounty_id}</span>
                                )}
                                <div className="flex-1 border-b border-dashed border-border/50" />
                                <span className="font-mono text-[13px] text-muted tabular-nums shrink-0">
                                  {fmtMoney(it.amount)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
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

        {/* Right: cross-links */}
        <div className="space-y-4">
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">more</div>
            <div className="space-y-2">
              <Link href="/backings" className="ap-inline-link text-sm block">my backings →</Link>
              <Link href="/billing" className="ap-inline-link text-sm block">billing →</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
