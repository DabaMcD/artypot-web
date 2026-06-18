'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { w9 as w9Api, w8ben as w8benApi } from '@/lib/api';
import type { FormW9StatusResponse, FormW8BENStatusResponse } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { useMoney } from '@/lib/format';

interface TaxComplianceCardProps {
  /**
   * Path the TaxBandits redirect should return to. Defaults to the dedicated
   * Tax & compliance page. The card strips its own `?w9=` / `?w8ben=` params
   * off this path after handling the return.
   */
  returnPath?: string;
  /** Fired whenever the W-9 / W-8BEN status changes (submit, verify). */
  onStatusChange?: () => void;
}

/**
 * Self-contained W-9 (US) / W-8BEN (non-US) compliance card. Owns its own
 * status fetch, the TaxBandits redirect handlers, and the return-param toast
 * handling, so it can be dropped onto any creator page.
 */
export default function TaxComplianceCard({
  returnPath = '/c/tax',
  onStatusChange,
}: TaxComplianceCardProps = {}) {
  const t = useTranslations('TaxComplianceCard');
  const money = useMoney();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [w9Status, setW9Status] = useState<FormW9StatusResponse | null>(null);
  const [w8benStatus, setW8benStatus] = useState<FormW8BENStatusResponse | null>(null);
  const [w9UrlLoading, setW9UrlLoading] = useState(false);
  const [w8benUrlLoading, setW8benUrlLoading] = useState(false);

  const isUS = user?.country_code === 'US';

  const refreshStatus = useCallback(() => {
    if (!user?.creator) return;
    if (isUS) {
      w9Api.status().then((res) => setW9Status(res.data)).catch(() => {});
    } else if (user.country_code) {
      w8benApi.status().then((res) => setW8benStatus(res.data)).catch(() => {});
    }
  }, [user, isUS]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  // Handle the TaxBandits return redirect.
  useEffect(() => {
    const w9Param = searchParams.get('w9');
    const w8benParam = searchParams.get('w8ben');
    if (!w9Param && !w8benParam) return;
    router.replace(returnPath, { scroll: false });
    if (w9Param === 'complete') {
      toast(t('toast.w9Submitted'), 'success');
      refreshStatus();
      onStatusChange?.();
    } else if (w9Param === 'cancelled') {
      toast(t('toast.w9Cancelled'), 'error');
    } else if (w8benParam === 'complete') {
      toast(t('toast.w8benSubmitted'), 'success');
      refreshStatus();
      onStatusChange?.();
    } else if (w8benParam === 'cancelled') {
      toast(t('toast.w8benCancelled'), 'error');
    }
  }, [searchParams, router, toast, returnPath, refreshStatus, onStatusChange, t]);

  const handleGetW9Url = useCallback(async () => {
    setW9UrlLoading(true);
    try {
      const res = await w9Api.w9Url();
      window.open(res.data.w9_url, '_blank', 'noopener,noreferrer');
      refreshStatus();
    } catch (err: unknown) {
      toast((err as { message?: string }).message ?? t('error.w9LinkFailed'), 'error');
    } finally {
      setW9UrlLoading(false);
    }
  }, [toast, refreshStatus, t]);

  const handleGetW8BENUrl = useCallback(async () => {
    setW8benUrlLoading(true);
    try {
      const res = await w8benApi.w8benUrl();
      window.open(res.data.w8ben_url, '_blank', 'noopener,noreferrer');
      refreshStatus();
    } catch (err: unknown) {
      toast((err as { message?: string }).message ?? t('error.w8benLinkFailed'), 'error');
    } finally {
      setW8benUrlLoading(false);
    }
  }, [toast, refreshStatus, t]);

  if (!user?.creator) return null;

  // No country set yet — can't determine which form applies.
  if (!user.country_code) {
    return (
      <Card dashed>
        <SectionLabel className="mb-2">{t('sectionLabel')}</SectionLabel>
        <p className="text-sm text-muted leading-relaxed">
          {t.rich('noCountry', {
            link: (chunks) => (
              <a href="/c/settings#location" className="ap-inline-link">{chunks}</a>
            ),
          })}
        </p>
      </Card>
    );
  }

  if (isUS && w9Status) {
    return (
      <Card className={w9Status.record?.tin_matched ? 'border-good/30' : w9Status.requires_w9 ? 'border-warn/30' : ''}>
        <div className="flex items-start justify-between mb-3">
          <SectionLabel>{t('w9.sectionLabel')}</SectionLabel>
          {w9Status.record && (
            <Badge tone={
              w9Status.record.status === 'tin_matched' ? 'good' :
              w9Status.record.status === 'completed'   ? 'info' :
              w9Status.record.status === 'tin_failed'  ? 'bad' : 'warn'
            }>
              {w9Status.record.status === 'tin_matched' ? t('w9.badge.ssnVerified') :
               w9Status.record.status === 'completed'   ? t('w9.badge.submitted') :
               w9Status.record.status === 'tin_failed'  ? t('w9.badge.ssnMismatch') : t('w9.badge.pending')}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted leading-relaxed mb-4">
          {w9Status.record?.tin_matched
            ? t('w9.body.verified')
            : w9Status.requires_w9
              ? t('w9.body.required', { taxYear: w9Status.tax_year, earnings: money(w9Status.ytd_earnings) })
              : t('w9.body.belowThreshold', { earnings: money(w9Status.ytd_earnings), threshold: money(w9Status.threshold) })}
        </p>
        {!w9Status.record?.tin_matched && (
          <>
            {w9Status.record?.status === 'tin_failed' && (
              <Banner tone="bad" className="mb-3">{t('w9.banner.tinFailed')}</Banner>
            )}
            <Button
              variant={w9Status.requires_w9 || w9Status.record?.status === 'tin_failed' ? 'primary' : 'default'}
              disabled={w9UrlLoading}
              onClick={handleGetW9Url}
            >
              {w9UrlLoading ? t('loading') :
               w9Status.record?.status === 'tin_failed' ? t('w9.button.resubmit') :
               w9Status.record ? t('w9.button.continue') : t('w9.button.complete')}
            </Button>
            <p className="text-xs text-muted mt-2">{t('w9.helper')}</p>
          </>
        )}
      </Card>
    );
  }

  if (!isUS && w8benStatus) {
    return (
      <Card className={w8benStatus.record?.qualifies ? 'border-good/30' : w8benStatus.requires_w8ben ? 'border-warn/30' : ''}>
        <div className="flex items-start justify-between mb-3">
          <SectionLabel>{t('w8ben.sectionLabel')}</SectionLabel>
          {w8benStatus.record && (
            <Badge tone={w8benStatus.record.status === 'completed' ? 'good' : w8benStatus.record.status === 'invalid' ? 'bad' : 'warn'}>
              {w8benStatus.record.status === 'completed' ? t('w8ben.badge.submitted') : w8benStatus.record.status === 'invalid' ? t('w8ben.badge.invalid') : t('w8ben.badge.pending')}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted leading-relaxed mb-4">
          {w8benStatus.record?.status === 'completed'
            ? t('w8ben.body.confirmed')
            : w8benStatus.requires_w8ben
              ? t('w8ben.body.required', { earnings: money(w8benStatus.ytd_earnings) })
              : t('w8ben.body.belowThreshold', { earnings: money(w8benStatus.ytd_earnings), threshold: money(w8benStatus.threshold) })}
        </p>
        {!w8benStatus.record?.qualifies && (
          <>
            {w8benStatus.record?.status === 'invalid' && (
              <Banner tone="bad" className="mb-3">{t('w8ben.banner.invalid')}</Banner>
            )}
            <Button
              variant={w8benStatus.requires_w8ben || w8benStatus.record?.status === 'invalid' ? 'primary' : 'default'}
              disabled={w8benUrlLoading}
              onClick={handleGetW8BENUrl}
            >
              {w8benUrlLoading ? t('loading') :
               w8benStatus.record?.status === 'invalid' ? t('w8ben.button.resubmit') :
               w8benStatus.record ? t('w8ben.button.continue') : t('w8ben.button.complete')}
            </Button>
            <p className="text-xs text-muted mt-2">{t('w8ben.helper')}</p>
          </>
        )}
      </Card>
    );
  }

  // Loading.
  return (
    <Card>
      <SectionLabel className="mb-3">{t('sectionLabel')}</SectionLabel>
      <div className="h-5 bg-surface-2 animate-pulse rounded w-2/3" />
    </Card>
  );
}
