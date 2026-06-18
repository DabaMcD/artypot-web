'use client';

import { useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { countryName } from '@/lib/countries';
import { Card, SectionLabel } from '@/components/ui/Card';
import TaxComplianceCard from '@/components/creator/TaxComplianceCard';

function TaxContent() {
  const t = useTranslations('CreatorTax');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !user.creator) router.push('/dashboard');
  }, [loading, user, router]);

  if (loading || !user || !user.creator) return null;

  const isUS = user.country_code === 'US';
  const residence = user.location_complete
    ? (isUS ? `${user.state_code}, US` : countryName(user.country_code ?? ''))
    : null;

  return (
    <div className="space-y-7 pt-2">
      <div>
        <SectionLabel>{t('breadcrumb.creator')} · {t('breadcrumb.money')}</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('heading')}</h1>
        <p className="text-sm text-muted mt-1">
          {t('intro')}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT — the form */}
        <div className="space-y-6">
          <TaxComplianceCard returnPath="/c/tax" />
        </div>

        {/* RIGHT — residence + future documents */}
        <div className="space-y-4">
          {/* Compact mirror of the real editor on /c/settings#location — shows
              the declared residence and links out; it does not edit here. */}
          <Card>
            <SectionLabel className="mb-3">{t('residence.label')}</SectionLabel>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{t('residence.declared')}</span>
              <span className={residence ? 'text-foreground' : 'text-warn'}>
                {residence ?? t('residence.notSet')}
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-2">
              {t('residence.formNote')}{' '}
              <Link href="/c/settings#location" className="ap-inline-link">{t('residence.updateLink')}</Link>
            </p>
          </Card>

          <Card dashed>
            <SectionLabel className="mb-2">{t('documents.label')}</SectionLabel>
            <p className="text-xs text-muted leading-relaxed">
              {t('documents.pending', { form: isUS ? '1099-K' : '1042-S' })}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TaxPage() {
  return (
    <Suspense>
      <TaxContent />
    </Suspense>
  );
}
