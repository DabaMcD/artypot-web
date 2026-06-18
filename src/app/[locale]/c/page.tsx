'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { useMoney } from '@/lib/format';
import { w9 as w9Api, w8ben as w8benApi } from '@/lib/api';
import type { FormW9StatusResponse, FormW8BENStatusResponse } from '@/lib/types';
import { BILLING_DAY } from '@/lib/config';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { BalancePipeline } from '@/components/ui/Pipeline';
import { useCreatorPayouts } from '@/lib/hooks/useCreatorPayouts';
import AvailableBalanceSummary from '@/components/creator/AvailableBalanceSummary';
import PayoutReadinessChecklist from '@/components/PayoutReadinessChecklist';

function CreatorDashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('CreatorDash');
  const money = useMoney();
  const p = useCreatorPayouts('/c');

  const [w9Status, setW9Status] = useState<FormW9StatusResponse | null>(null);
  const [w8benStatus, setW8benStatus] = useState<FormW8BENStatusResponse | null>(null);

  const isUS = user?.country_code === 'US';

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && !user.creator) router.push('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.creator) return;
    if (isUS) {
      w9Api.status().then((res) => setW9Status(res.data)).catch(() => {});
    } else if (user.country_code) {
      w8benApi.status().then((res) => setW8benStatus(res.data)).catch(() => {});
    }
  }, [user, isUS]);

  if (authLoading || !user || !user.creator) {
    return (
      <div className="space-y-6 pt-2">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="h-24 bg-surface animate-pulse rounded" />
      </div>
    );
  }

  const creator = user.creator;
  const { balance, balanceLoading, payoutHold } = p;

  const solidOpenBackings    = balance?.solid_open_backings ?? balance?.open_backings ?? 0;
  const softOpenBackings     = (balance?.open_backings ?? 0) - solidOpenBackings;
  const pendingPayment       = balance?.pending_payment ?? 0;
  const solidPendingPayment  = balance?.solid_pending_payment ?? pendingPayment;
  const clearing             = balance?.clearing ?? 0;
  const availableBalance     = balance?.available_balance ?? 0;
  const paidOut              = balance?.paid_out ?? 0;
  const recentTransactions   = balance?.available?.data?.slice(0, 5) ?? [];

  const needsW9   = isUS && !!(w9Status?.requires_w9 && !w9Status?.record?.tin_matched);
  const needsW8BEN = !isUS && !!(w8benStatus?.requires_w8ben && !w8benStatus?.record?.qualifies);
  const taxFormRequired = needsW9 || needsW8BEN;
  const taxFormDone     = isUS ? !!w9Status?.record?.tin_matched : !!w8benStatus?.record?.qualifies;

  return (
    <div className="space-y-7 pt-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{t('header.breadcrumb.creator')} · {t('header.breadcrumb.dashboard')}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{creator.display_name}</h1>
        </div>
        <Link href={`/${user.slug}`}>
          <Button variant="default" size="sm">{t('header.publicProfile')}</Button>
        </Link>
      </div>

      {/* Payout hold warning */}
      {payoutHold && (
        <Banner tone="bad" action={
          <Link href="/c/payouts#payout-hold">
            <Button variant="primary" size="sm">{t('payoutHold.action')}</Button>
          </Link>
        }>
          <div>
            <strong>{t('payoutHold.title')}</strong>
            {' '}{t('payoutHold.body')}
          </div>
        </Banner>
      )}

      {/* Onboarding (location / bank / tax) is tracked once, by the payout-
          readiness checklist in the right sidebar — the canonical tracker now
          that /c/setup is retired. No separate "Before You Can Withdraw" banner
          or status card duplicating it. */}

      {/* Balance pipeline */}
      <div>
        <SectionLabel className="mb-3">{t('pipeline.label')}</SectionLabel>
        <BalancePipeline balances={{ pending: pendingPayment, solidPending: solidPendingPayment, clearing, available: availableBalance }} />
        <p className="text-xs text-muted mt-2">
          {t('pipeline.explainer', { billingDay: BILLING_DAY })}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT */}
        <div className="space-y-6">

          {/* Open backing + paid out stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">{t('stats.openBacking.label')}</div>
              <div className="font-mono text-[24px] font-medium tabular-nums text-foreground">{money(solidOpenBackings)}</div>
              <div className="font-mono text-[10px] text-muted mt-0.5">{t('stats.openBacking.solidSub')}</div>
              {softOpenBackings > 0.005 && (
                <div className="font-mono text-[10px] text-muted mt-0.5">{t('stats.openBacking.softSub', { amount: money(softOpenBackings) })}</div>
              )}
            </Card>
            <Card>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">{t('stats.paidOut.label')}</div>
              <div className="font-mono text-[24px] font-medium tabular-nums text-foreground">{money(paidOut)}</div>
              <div className="font-mono text-[10px] text-muted mt-0.5">{t('stats.paidOut.sub')}</div>
            </Card>
          </div>

          {/* Recent transactions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>{t('transactions.label')}</SectionLabel>
              <Link href="/c/money" className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
                {t('transactions.fullLedger')}
              </Link>
            </div>
            {balanceLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-5 bg-surface-2 animate-pulse rounded" />)}
              </div>
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted">{t('transactions.empty')}</p>
            ) : (
              <div className="divide-y divide-border -mx-5 -my-4">
                {recentTransactions.map((entry) => {
                  const amt = Number(entry.amount);
                  let methodBadge: { label: string; tone: 'info' | 'good' | 'creator' | 'default' } | null = null;
                  let refTitle: string | undefined;
                  if (entry.external_payout_id && entry.external_payout) {
                    const method = entry.external_payout.method;
                    const toneMap: Record<typeof method, 'info' | 'good' | 'creator' | 'default'> = {
                      wise:   'creator',
                      paypal: 'info',
                      wire:   'good',
                      check:  'default',
                      other:  'default',
                    };
                    methodBadge = { label: method, tone: toneMap[method] };
                    refTitle = entry.external_payout.external_reference_id ?? undefined;
                  } else if (entry.creator_withdrawal_id && amt < 0) {
                    methodBadge = { label: 'stripe', tone: 'info' };
                  } else if (entry.fan_payment_id && amt > 0) {
                    methodBadge = { label: t('transactions.earningBadge'), tone: 'creator' };
                  }
                  return (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <span className="text-sm text-muted truncate flex-1">{entry.description}</span>
                      <span className="shrink-0" title={refTitle}>
                        {methodBadge && <Badge tone={methodBadge.tone}>{methodBadge.label}</Badge>}
                      </span>
                      <span className={`font-mono text-sm font-medium shrink-0 ${amt < 0 ? 'text-bad' : 'text-creator'}`}>
                        {amt < 0 ? '-' : '+'}{money(Math.abs(amt))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">
          {/* Available balance — read-only summary; withdrawal lives on /c/payouts */}
          <AvailableBalanceSummary p={p} />

          {/* First payout checklist — the single payout-readiness surface */}
          <Card>
            <SectionLabel className="mb-3">{t('firstPayout.label')}</SectionLabel>
            <PayoutReadinessChecklist taxFormRequired={taxFormRequired} taxFormDone={taxFormDone} />
          </Card>

          {/* Quick links */}
          <Card dashed>
            <Link href="/bounties/new" className="block text-sm text-foreground hover:text-fan transition-colors mb-2">
              {t('quickLinks.newBounty')}
            </Link>
            <Link href={`/${user.slug}`} className="block text-sm text-foreground hover:text-creator transition-colors">
              {t('quickLinks.viewProfile')}
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CreatorDashboardPage() {
  return (
    <Suspense>
      <CreatorDashboardContent />
    </Suspense>
  );
}
