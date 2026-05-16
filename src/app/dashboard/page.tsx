'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bounties as bountiesApi, billing, pledges as pledgesApi } from '@/lib/api';
import { BILLING_DAY } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import type { Bounty, CashBalance, PaginatedResponse, PublicUserPledge } from '@/lib/types';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { BountyCard } from '@/components/ui/BountyCard';
import { Empty } from '@/components/ui/Empty';

const STATUS_BADGE: Record<string, { label: string; tone: 'default' | 'info' | 'good' | 'warn' | 'bad' }> = {
  open:      { label: 'open',      tone: 'default' },
  pending:   { label: 'approved',  tone: 'warn' },
  completed: { label: 'submitted', tone: 'info' },
  paid_out:  { label: 'paid out',  tone: 'good' },
  revoked:   { label: 'revoked',   tone: 'bad' },
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [myBounties, setMyBounties] = useState<PaginatedResponse<Bounty> | null>(null);
  const [cash, setCash] = useState<CashBalance | null>(null);
  const [myPledges, setMyPledges] = useState<PublicUserPledge[]>([]);
  const [totalActivePledgeAmount, setTotalActivePledgeAmount] = useState<number>(0);
  const [revoking, setRevoking] = useState<Set<number>>(new Set());

  const [bountiesLoading, setBountiesLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(true);
  const [pledgesLoading, setPledgesLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadPledges = useCallback(() => {
    setPledgesLoading(true);
    pledgesApi
      .list({ sort: 'date', page: 1 })
      .then((res) => {
        setMyPledges(res.data);
        setTotalActivePledgeAmount(res.total_active_amount ?? 0);
      })
      .catch(() => {})
      .finally(() => setPledgesLoading(false));
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

    loadPledges();
  }, [user, loadPledges]);

  const handleRevoke = useCallback(async (pledge: PublicUserPledge) => {
    if (revoking.has(pledge.id)) return;
    setRevoking((prev) => new Set(prev).add(pledge.id));
    try {
      await bountiesApi.removePledge(pledge.bounty_id, pledge.id);
      loadPledges();
      billing.cash().then(setCash).catch(() => {});
    } catch {
      // ignore
    } finally {
      setRevoking((prev) => { const s = new Set(prev); s.delete(pledge.id); return s; });
    }
  }, [revoking, loadPledges]);

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

  const now = new Date();
  const nextBilling = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= BILLING_DAY ? 1 : 0), BILLING_DAY);
  const nextBillingStr = nextBilling.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const activePledges = myPledges.filter((v) => v.bounty?.status !== 'revoked' && v.bounty?.status !== 'paid_out');
  const awaitingBilling = myPledges.filter((v) => v.bounty?.status === 'pending');
  const awaitingCreator = myPledges.filter((v) => v.bounty?.status === 'completed');

  return (
    <div className="space-y-7 pt-2">
      {!user.email_verified_at && <EmailVerificationBanner email={user.email} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>fan · {user.display_name.split(' ')[0]}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">my contributions</h1>
        </div>
        <Button variant="primary" onClick={() => router.push('/bounties/new')}>
          + start a bounty
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
              <Button variant="default" size="sm">pay now →</Button>
            </Link>
          </div>
        </Banner>
      )}

      {/* 4-stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">active pledges</div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {pledgesLoading ? '—' : activePledges.length}
          </div>
          <div className="font-mono text-[10px] text-fan mt-0.5">
            {pledgesLoading ? '' : `$${totalActivePledgeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} committed`}
          </div>
        </Card>
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">awaiting billing</div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {pledgesLoading ? '—' : awaitingBilling.length}
          </div>
          <div className="font-mono text-[10px] text-warn mt-0.5">next charge {nextBillingStr}</div>
        </Card>
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">awaiting creator</div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {pledgesLoading ? '—' : awaitingCreator.length}
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
          <SectionLabel>my pledges</SectionLabel>
          <Link href="/pledges" className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
            all history →
          </Link>
        </div>

        {pledgesLoading ? (
          <Card>
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : activePledges.length === 0 ? (
          <Empty icon="◇" message="not backing anything yet">
            <Link href="/creators"><Button variant="default" size="sm">find creators →</Button></Link>
          </Empty>
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {activePledges.slice(0, 10).map((pledge) => {
                const status = pledge.bounty?.status ?? 'open';
                const badge = STATUS_BADGE[status] ?? { label: status, tone: 'default' as const };
                const canRevoke = status === 'open';
                return (
                  <div key={pledge.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      {pledge.bounty ? (
                        <Link
                          href={`/bounties/${pledge.bounty_id}`}
                          className="font-display text-sm text-foreground hover:text-fan transition-colors truncate block"
                        >
                          {pledge.bounty.title}
                        </Link>
                      ) : (
                        <span className="font-display text-sm text-muted">bounty #{pledge.bounty_id}</span>
                      )}
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    <span className="font-mono text-sm font-medium text-fan tabular-nums shrink-0">
                      ${Number(pledge.amount).toFixed(2)}
                    </span>
                    {canRevoke && (
                      <button
                        onClick={() => handleRevoke(pledge)}
                        disabled={revoking.has(pledge.id)}
                        className="font-mono text-[10px] uppercase text-muted/50 hover:text-bad transition-colors disabled:opacity-40 shrink-0"
                      >
                        {revoking.has(pledge.id) ? '…' : 'revoke'}
                      </button>
                    )}
                  </div>
                );
              })}
              {activePledges.length > 10 && (
                <div className="px-5 py-3">
                  <Link href="/pledges" className="font-mono text-[10px] uppercase text-muted hover:text-foreground transition-colors">
                    +{activePledges.length - 10} more →
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
          <Empty icon="◇" message="no bounties yet">
            <Button variant="primary" onClick={() => router.push('/bounties/new')}>create the first one</Button>
          </Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBounties.data.slice(0, 6).map((bounty) => {
              const stateMap: Record<string, 'collecting' | 'creator-claimed' | 'submitted' | 'verified' | 'settled'> = {
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
                    fundedTotal: Number(bounty.total_pledged ?? 0),
                    contributors: bounty.pledges?.length ?? 0,
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
