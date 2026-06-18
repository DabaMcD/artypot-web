'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useMoney } from '@/lib/format';
import { bounties as bountiesApi, billing, backings as backingsApi, featuredBounties as featuredBountiesApi } from '@/lib/api';
import { nextBillingInfo } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import type { Bounty, CashBalance, FanStats, PublicUserBacking } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { InfoDot } from '@/components/ui/InfoDot';
import { Banner } from '@/components/ui/Banner';
import BountyCard from '@/components/BountyCard';
import { Empty } from '@/components/ui/Empty';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import ShareButton from '@/components/ShareButton';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('Dashboard');
  const money = useMoney();

  const [featured, setFeatured] = useState<Bounty[]>([]);
  const [cash, setCash] = useState<CashBalance | null>(null);
  const [myBackings, setMyBackings] = useState<PublicUserBacking[]>([]);
  const [fanStats, setFanStats] = useState<FanStats | null>(null);
  const [revoking, setRevoking] = useState<Set<number>>(new Set());

  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(true);
  const [backingsLoading, setBackingsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadBackings = useCallback(() => {
    setBackingsLoading(true);
    backingsApi
      .list({ sort: 'date', page: 1 })
      .then((res) => {
        setMyBackings(res.data);
      })
      .catch(() => {})
      .finally(() => setBackingsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;

    // Curated featured bounties — NOT the global recency feed (that lives on
    // /bounties). The home shouldn't re-list the directory; it highlights a
    // hand-picked few and links out for the rest.
    featuredBountiesApi
      .list()
      .then((res) => setFeatured(res.data))
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));

    billing
      .cash()
      .then(setCash)
      .catch(() => {})
      .finally(() => setCashLoading(false));

    backingsApi
      .stats()
      .then(setFanStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    loadBackings();
  }, [user, loadBackings]);

  const handleRevoke = useCallback(async (backing: PublicUserBacking) => {
    if (revoking.has(backing.id)) return;
    setRevoking((prev) => new Set(prev).add(backing.id));
    try {
      await bountiesApi.removeBacking(backing.bounty_id, backing.id);
      loadBackings();
      billing.cash().then(setCash).catch(() => {});
      backingsApi.stats().then(setFanStats).catch(() => {});
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

  const { label: nextBillingStr } = nextBillingInfo();

  const activeBackings = myBackings.filter((v) => v.bounty?.status !== 'revoked' && v.bounty?.status !== 'paid_out');

  return (
    <div className="space-y-7 pt-2">
      {/* Email-verification prompt now renders globally via AppShell. */}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{t('header.fan')} · {user.display_name.split(' ')[0]}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('header.title')}</h1>
        </div>
        <Button variant="primary" onClick={() => router.push('/bounties/new')}>
          {t('header.newBounty')}
        </Button>
      </div>

      {/* Billing banner */}
      {!cashLoading && balanceIsNegative && (
        <Banner tone="warn">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              {t.rich('billing.notice', {
                date: nextBillingStr,
                amount: money(outstandingAmount),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </span>
            <Link href="/billing">
              <Button variant="default" size="sm">{t('billing.payNow')}</Button>
            </Link>
          </div>
        </Banner>
      )}

      {/* 4-stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bounties joined — breadth of involvement */}
        <Card>
          <div className="flex items-center gap-1 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('stats.bountiesJoined.label')}</span>
            <InfoDot>{t('stats.bountiesJoined.info')}</InfoDot>
          </div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {statsLoading || !fanStats ? '—' : fanStats.bounties_supported}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">
            {statsLoading || !fanStats
              ? ''
              : t('stats.bountiesJoined.sub', { count: fanStats.bounties_started })}
          </div>
        </Card>

        {/* Creators petitioned — breadth, with how many actually delivered */}
        <Card>
          <div className="flex items-center gap-1 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('stats.creatorsPetitioned.label')}</span>
            <InfoDot>{t('stats.creatorsPetitioned.info')}</InfoDot>
          </div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {statsLoading || !fanStats ? '—' : fanStats.creators_supported}
          </div>
          <div className="font-mono text-[10px] text-good mt-0.5">
            {statsLoading || !fanStats
              ? ''
              : t('stats.creatorsPetitioned.sub', { count: fanStats.creators_paid })}
          </div>
        </Card>

        {/* Next charge — the exact amount lives on /billing (the authoritative
            owner). This card shows whether anything is due + when, and links out
            for the figure rather than re-deriving it client-side. The actionable
            amount + Pay Now still appears in the banner above when a balance is owed. */}
        <Card>
          <div className="flex items-center gap-1 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('stats.nextCharge.label')}</span>
            <InfoDot>{t('stats.nextCharge.info')}</InfoDot>
          </div>
          <div className="font-mono text-[20px] font-medium text-foreground">
            {cashLoading ? '—' : balanceIsNegative ? t('stats.nextCharge.due', { date: nextBillingStr }) : t('stats.nextCharge.nothingDue')}
          </div>
          <div className="font-mono text-[10px] mt-0.5">
            {cashLoading ? (
              ''
            ) : balanceIsNegative ? (
              <Link href="/billing" className="text-warn hover:opacity-80 transition-opacity">{t('stats.nextCharge.viewAmount')}</Link>
            ) : (
              <span className="text-muted">{t('stats.nextCharge.settledUp')}</span>
            )}
          </div>
        </Card>

        {/* Lifetime paid — the "your card isn't touched" reassurance */}
        <Card>
          <div className="flex items-center gap-1 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('stats.lifetimePaid.label')}</span>
            <InfoDot>{t('stats.lifetimePaid.info')}</InfoDot>
          </div>
          <div className="font-mono text-[28px] font-medium tabular-nums text-foreground">
            {statsLoading || !fanStats
              ? '—'
              : money(fanStats.lifetime_paid)}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">
            {statsLoading || !fanStats
              ? ''
              : t('stats.lifetimePaid.sub', { amount: money(fanStats.total_backed) })}
          </div>
        </Card>
      </div>

      {/* Active contributions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>{t('backings.sectionLabel')}</SectionLabel>
          <Link href="/backings" className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
            {t('backings.allHistory')}
          </Link>
        </div>

        {backingsLoading ? (
          <Card>
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : activeBackings.length === 0 ? (
          <Empty icon="◇" message={t('backings.empty.message')}>
            <Link href="/search"><Button variant="default" size="sm">{t('backings.empty.findCreators')}</Button></Link>
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
                        <span className="text-sm text-muted">{t('backings.bountyRef', { id: backing.bounty_id })}</span>
                      )}
                    </div>
                    <BountyStatusBadge status={status} />
                    {backing.bounty && (
                      <ShareButton path={`/bounties/${backing.bounty_id}`} title={backing.bounty.title} />
                    )}
                    <span className="font-mono text-sm font-medium text-fan tabular-nums shrink-0">
                      {money(Number(backing.amount))}
                    </span>
                    {canRevoke && (
                      <button
                        onClick={() => handleRevoke(backing)}
                        disabled={revoking.has(backing.id)}
                        className="font-mono text-[10px] uppercase text-muted/50 hover:text-bad transition-colors disabled:opacity-40 shrink-0"
                      >
                        {revoking.has(backing.id) ? '…' : t('backings.revoke')}
                      </button>
                    )}
                  </div>
                );
              })}
              {activeBackings.length > 10 && (
                <div className="px-5 py-3">
                  <Link href="/backings" className="font-mono text-[10px] uppercase text-muted hover:text-foreground transition-colors">
                    {t('backings.more', { count: activeBackings.length - 10 })}
                  </Link>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Featured bounties — a curated few, with a link out to the full directory */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>{t('featured.sectionLabel')}</SectionLabel>
          <Link href="/bounties" className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
            {t('featured.browseAll')}
          </Link>
        </div>

        {featuredLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-44 bg-surface animate-pulse rounded" />)}
          </div>
        ) : featured.length === 0 ? (
          // No editorial picks right now — point to the directory + creator search
          // rather than re-listing the global feed inline.
          <Card dashed>
            <p className="text-sm text-muted mb-3">{t('featured.empty.message')}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/bounties"><Button variant="default" size="sm">{t('featured.empty.browse')}</Button></Link>
              <Link href="/search"><Button variant="ghost" size="sm">{t('featured.empty.findCreators')}</Button></Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {featured.slice(0, 6).map((bounty) => (
              <BountyCard key={bounty.id} bounty={bounty} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
