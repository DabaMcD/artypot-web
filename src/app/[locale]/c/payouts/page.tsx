'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { w9 as w9Api, w8ben as w8benApi } from '@/lib/api';
import type { FormW9StatusResponse, FormW8BENStatusResponse } from '@/lib/types';
import { BILLING_DAY } from '@/lib/config';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { useCreatorPayouts } from '@/lib/hooks/useCreatorPayouts';
import WithdrawCard from '@/components/creator/WithdrawCard';
import BankAccountCard from '@/components/creator/BankAccountCard';
import PayoutReadinessChecklist from '@/components/PayoutReadinessChecklist';

function PayoutsContent() {
  const t = useTranslations('CreatorMoney');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const p = useCreatorPayouts('/c/payouts');

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

  const needsW9    = isUS && !!(w9Status?.requires_w9 && !w9Status?.record?.tin_matched);
  const needsW8BEN = !isUS && !!(w8benStatus?.requires_w8ben && !w8benStatus?.record?.qualifies);
  const taxFormRequired = needsW9 || needsW8BEN;
  const taxFormDone     = isUS ? !!w9Status?.record?.tin_matched : !!w8benStatus?.record?.qualifies;

  return (
    <div className="space-y-7 pt-2">
      {/* Header */}
      <div>
        <SectionLabel>{t('header.crumbCreator')} · {t('header.crumbMoney')}</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('payouts.title')}</h1>
        <p className="text-sm text-muted mt-1">
          {t('payouts.subtitle')}
        </p>
      </div>

      {/* Payout hold warning */}
      <div id="payout-hold">
        {p.payoutHold && (
          <Banner tone="bad">
            <div>
              {t.rich('payouts.holdWarning', {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </div>
          </Banner>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT */}
        <div className="space-y-6">
          <BankAccountCard p={p} />
          {/* Tax status is no longer duplicated here — it lives once, in the
              "first payout" readiness checklist on the right (and in full on
              the Tax & compliance page). */}
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">
          <WithdrawCard p={p} />

          <Card>
            <SectionLabel className="mb-3">{t('payouts.firstPayout')}</SectionLabel>
            <PayoutReadinessChecklist taxFormRequired={taxFormRequired} taxFormDone={taxFormDone} />
          </Card>

          <Card dashed>
            <p className="text-xs text-muted leading-relaxed">
              {t('payouts.clearNote', { day: BILLING_DAY })}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense>
      <PayoutsContent />
    </Suspense>
  );
}
