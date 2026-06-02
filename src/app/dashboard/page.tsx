'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bounties as bountiesApi, billing, backings as backingsApi } from '@/lib/api';
import { nextBillingInfo } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import type { Bounty, CashBalance, PaginatedResponse, PublicUserBacking } from '@/lib/types';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { BountyCard } from '@/components/ui/BountyCard';
import { Empty } from '@/components/ui/Empty';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import ShareButton from '@/components/ShareButton';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [myBounties, setMyBounties] = useState<PaginatedResponse<Bounty> | null>(null);
  const [cash, setCash] = useState<CashBalance | null>(null);
  const [myBackings, setMyBackings] = useState<PublicUserBacking[]>([]);
  const [totalActiveBackingAmount, setTotalActiveBackingAmount] = useState<number>(0);
  const [revoking, setRevoking] = useState<Set<number>>(new Set());

  const [bountiesLoading, setBountiesLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(true);
  const [backingsLoading, setBackingsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadBackings = useCallback(() => {
    setBackingsLoading(true);
    backingsApi
      .list({ sort: 'date', page: 1 })
      .then((res) => {
        setMyBackings(res.data);
        setTotalActiveBackingAmount(res.total_active_amount ?? 0);
      })
      .catch(() => {})
      .finally(() => setBackingsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;

    bountiesApi
      .list({ page: 1 })
      .then(setMyBounties)
      .catch(() => {})
      .finally(() => setBountiesLoading(false));

    billing
      .cash()
      .then(setCash)
      .catch(() => {})
      .finally(() => setCashLoading(false));

    loadBackings();
  }, [user, loadBackings]);

  const handleRevoke = useCallback(async (backing: PublicUserBacking) => {
    if (revoking.has(backing.id)) return;
    setRevoking((prev) => new Set(prev).add(backing.id));
    try {
      await bountiesApi.removeBacking(backing.bounty_id, backing.id);
      loadBackings();
      billing.cash().then(setCash).catch(() => {});
    } catch {
      // ignore
    } finally {
      setRevoking((prev) => { const s = new Set(prev); s.delete(backing.id); return s; });
    }
  }, [revoking, loadBackings]);

  if (authLoading || !user) {
    return (
      <div className="space-y-6 pt-2">
        <div className="h-8 w-56 bg-surface animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface animate-pulse rounded" />)}
        </div>
        <div className="h-64 bg-surface animate-pulse rounded" />
      </div>
    );
  }

  const balance = Number(cash?.balance ?? 0);
  const balanceIsNegative = balance < 0;
  const outstandingAmount = balanceIsNegative ? Math.abs(balance) : 0;

  const { date: nextBilling, label: nextBillingStr } = nextBillingInfo();

  const activeBackings = myBackings.filter((v) => v.bounty?.status !== 'revoked' && v.bounty?.status !== 'paid_out');
  const awaitingBilling = myBackings.filter((v) => v.bounty?.status === 'pending');
  const awaitingCreator = myBackings.filter((v) => v.bounty?.status === 'completed');

  return (
    <div className="space-y-7 pt-2">
      {!user.email_verified_at && <EmailVerificationBanner email={user.email} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>fan · {user.display_name.split(' ')[0]}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">dashboard</h1>
        </div>
        <Button variant="primary" onClick={() => router.push('/bounties/new')}>
          + Start a Bounty
        </Button>
      </div>

      {/* Billing banner */}
      {!cashLoading && balanceIsNegative && (
        <Banner tone="warn">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              <strong>billing on {nextBillingStr}</strong> — you&apos;ll be charged{' '}
              <strong>${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>{' '}
              across approved bounties.
            </span>
            <Link href="/billing">
              <Button variant="default" size="sm">Pay Now →</Button>
            </Link>
          </div>
        </Banner>
      )}

      {/* 4-stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">active backings</div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {backingsLoading ? '—' : activeBackings.length}
          </div>
          <div className="font-mono text-[10px] text-fan mt-0.5">
            {backingsLoading ? '' : `$${totalActiveBackingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} committed`}
          </div>
        </Card>
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">awaiting billing</div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {backingsLoading ? '—' : awaitingBilling.length}
          </div>
          <div className="font-mono text-[10px] text-warn mt-0.5">next charge {nextBillingStr}</div>
        </Card>
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">awaiting creator</div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {backingsLoading ? '—' : awaitingCreator.length}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">submitted, under review</div>
        </Card>
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">lifetime backed</div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            ${Number(user.total_given ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">total paid out</div>
        </Card>
      </div>

      {/* Active contributions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>my backings</SectionLabel>
          <Link href="/backings" className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
            all history →
          </Link>
        </div>

        {backingsLoading ? (
          <Card>
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : activeBackings.length === 0 ? (
          <Empty icon="◇" message="Not backing anything yet">
            <Link href="/search"><Button variant="default" size="sm">Explore →</Button></Link>
          </Empty>
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {activeBackings.slice(0, 10).map((backing) => {
                const status = backing.bounty?.status ?? 'open';
                const canRevoke = status === 'open';
                return (
                  <div key={backing.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      {backing.bounty ? (
                        <Link
                          href={`/bounties/${backing.bounty_id}`}
                          className="text-sm text-foreground hover:text-fan transition-colors truncate block"
                        >
                          {backing.bounty.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted">bounty #{backing.bounty_id}</span>
                      )}
                    </div>
                    <BountyStatusBadge status={status} />
                    {backing.bounty && (
                      <ShareButton path={`/bounties/${backing.bounty_id}`} title={backing.bounty.title} />
                    )}
                    <span className="font-mono text-sm font-medium text-fan tabular-nums shrink-0">
                      ${Number(backing.amount).toFixed(2)}
                    </span>
                    {canRevoke && (
                      <button
                        onClick={() => handleRevoke(backing)}
                        disabled={revoking.has(backing.id)}
                        className="font-mono text-[10px] uppercase text-muted/50 hover:text-bad transition-colors disabled:opacity-40 shrink-0"
                      >
                        {revoking.has(backing.id) ? '…' : 'revoke'}
                      </button>
                    )}
                  </div>
                );
              })}
              {activeBackings.length > 10 && (
                <div className="px-5 py-3">
                  <Link href="/backings" className="font-mono text-[10px] uppercase text-muted hover:text-foreground transition-colors">
                    +{activeBackings.length - 10} more →
                  </Link>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Browse bounties */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>browse bounties</SectionLabel>
          <Link href="/bounties" className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
            view all →
          </Link>
        </div>

        {bountiesLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-44 bg-surface animate-pulse rounded" />)}
          </div>
        ) : !myBounties || myBounties.data.length === 0 ? (
          <Empty icon="◇" message="No bounties yet">
            <Button variant="primary" onClick={() => router.push('/bounties/new')}>Create the First One</Button>
          </Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBounties.data.slice(0, 6).map((bounty) => {
              const stateMap: Record<string, 'collecting' | 'creator-verified' | 'submitted' | 'verified' | 'settled'> = {
                open: 'collecting',
                completed: 'submitted',
                approved: 'verified',
                paid_out: 'settled',
                revoked: 'settled',
              };
              const creator = (bounty as unknown as { creator?: { display_name: string } }).creator;
              return (
                <BountyCard
                  key={bounty.id}
                  b={{
                    id: String(bounty.id),
                    title: bounty.title,
                    state: stateMap[bounty.status] ?? 'collecting',
                    fundedTotal: Number(bounty.total_backed ?? 0),
                    contributors: bounty.backings?.length ?? 0,
                    targetHandle: creator ? { platform: '@', username: creator.display_name } : undefined,
                  }}
                  onClick={() => router.push(`/bounties/${bounty.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
