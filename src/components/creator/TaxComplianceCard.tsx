'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { w9 as w9Api, w8ben as w8benApi } from '@/lib/api';
import type { FormW9StatusResponse, FormW8BENStatusResponse } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';

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
      toast('W-9 submitted! We\'ll notify you once your SSN/TIN has been verified.', 'success');
      refreshStatus();
      onStatusChange?.();
    } else if (w9Param === 'cancelled') {
      toast('W-9 not completed — you can come back and finish it any time.', 'error');
    } else if (w8benParam === 'complete') {
      toast('W-8BEN submitted! We\'ll review and confirm shortly.', 'success');
      refreshStatus();
      onStatusChange?.();
    } else if (w8benParam === 'cancelled') {
      toast('W-8BEN not completed — you can finish it any time.', 'error');
    }
  }, [searchParams, router, toast, returnPath, refreshStatus, onStatusChange]);

  const handleGetW9Url = useCallback(async () => {
    setW9UrlLoading(true);
    try {
      const res = await w9Api.w9Url();
      window.open(res.data.w9_url, '_blank', 'noopener,noreferrer');
      refreshStatus();
    } catch (err: unknown) {
      toast((err as { message?: string }).message ?? 'Failed to get W-9 link. Please try again.', 'error');
    } finally {
      setW9UrlLoading(false);
    }
  }, [toast, refreshStatus]);

  const handleGetW8BENUrl = useCallback(async () => {
    setW8benUrlLoading(true);
    try {
      const res = await w8benApi.w8benUrl();
      window.open(res.data.w8ben_url, '_blank', 'noopener,noreferrer');
      refreshStatus();
    } catch (err: unknown) {
      toast((err as { message?: string }).message ?? 'Failed to get W-8BEN link. Please try again.', 'error');
    } finally {
      setW8benUrlLoading(false);
    }
  }, [toast, refreshStatus]);

  if (!user?.creator) return null;

  // No country set yet — can't determine which form applies.
  if (!user.country_code) {
    return (
      <Card dashed>
        <SectionLabel className="mb-2">tax compliance</SectionLabel>
        <p className="text-sm text-muted leading-relaxed">
          Set your tax residence in{' '}
          <a href="/c/settings#location" className="ap-inline-link">settings</a>{' '}
          so we know whether a W-9 (US) or W-8BEN (international) applies.
        </p>
      </Card>
    );
  }

  if (isUS && w9Status) {
    return (
      <Card className={w9Status.record?.tin_matched ? 'border-good/30' : w9Status.requires_w9 ? 'border-warn/30' : ''}>
        <div className="flex items-start justify-between mb-3">
          <SectionLabel>tax compliance — W-9</SectionLabel>
          {w9Status.record && (
            <Badge tone={
              w9Status.record.status === 'tin_matched' ? 'good' :
              w9Status.record.status === 'completed'   ? 'info' :
              w9Status.record.status === 'tin_failed'  ? 'bad' : 'warn'
            }>
              {w9Status.record.status === 'tin_matched' ? 'SSN verified' :
               w9Status.record.status === 'completed'   ? 'submitted' :
               w9Status.record.status === 'tin_failed'  ? 'SSN mismatch' : 'pending'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted leading-relaxed mb-4">
          {w9Status.record?.tin_matched
            ? `Your W-9 is complete and your SSN/TIN has been verified.`
            : w9Status.requires_w9
              ? `Your ${w9Status.tax_year} earnings have reached $${w9Status.ytd_earnings.toFixed(2)}. A W-9 is required before your next withdrawal.`
              : `You've earned $${w9Status.ytd_earnings.toFixed(2)} this year. Artypot requires a W-9 once you hit $${w9Status.threshold.toFixed(0)}.`}
        </p>
        {!w9Status.record?.tin_matched && (
          <>
            {w9Status.record?.status === 'tin_failed' && (
              <Banner tone="bad" className="mb-3">SSN/TIN verification failed. Please re-submit with corrected information.</Banner>
            )}
            <Button
              variant={w9Status.requires_w9 || w9Status.record?.status === 'tin_failed' ? 'primary' : 'default'}
              disabled={w9UrlLoading}
              onClick={handleGetW9Url}
            >
              {w9UrlLoading ? 'Loading…' :
               w9Status.record?.status === 'tin_failed' ? 'Re-submit W-9 →' :
               w9Status.record ? 'Continue W-9 →' : 'Complete W-9 with TaxBandits →'}
            </Button>
            <p className="text-xs text-muted mt-2">Opens TaxBandits in a new tab. Artypot never sees your SSN.</p>
          </>
        )}
      </Card>
    );
  }

  if (!isUS && w8benStatus) {
    return (
      <Card className={w8benStatus.record?.qualifies ? 'border-good/30' : w8benStatus.requires_w8ben ? 'border-warn/30' : ''}>
        <div className="flex items-start justify-between mb-3">
          <SectionLabel>tax compliance — W-8BEN</SectionLabel>
          {w8benStatus.record && (
            <Badge tone={w8benStatus.record.status === 'completed' ? 'good' : w8benStatus.record.status === 'invalid' ? 'bad' : 'warn'}>
              {w8benStatus.record.status === 'completed' ? 'submitted' : w8benStatus.record.status === 'invalid' ? 'invalid' : 'pending'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted leading-relaxed mb-4">
          {w8benStatus.record?.status === 'completed'
            ? `Your W-8BEN has been submitted and confirmed.`
            : w8benStatus.requires_w8ben
              ? `You've earned $${w8benStatus.ytd_earnings.toFixed(2)} this year. A W-8BEN is required before your next withdrawal.`
              : `You've earned $${w8benStatus.ytd_earnings.toFixed(2)} this year. Artypot requires a W-8BEN once you hit $${w8benStatus.threshold.toFixed(0)}.`}
        </p>
        {!w8benStatus.record?.qualifies && (
          <>
            {w8benStatus.record?.status === 'invalid' && (
              <Banner tone="bad" className="mb-3">Your W-8BEN was flagged as invalid. Please re-submit with corrected information.</Banner>
            )}
            <Button
              variant={w8benStatus.requires_w8ben || w8benStatus.record?.status === 'invalid' ? 'primary' : 'default'}
              disabled={w8benUrlLoading}
              onClick={handleGetW8BENUrl}
            >
              {w8benUrlLoading ? 'Loading…' :
               w8benStatus.record?.status === 'invalid' ? 'Re-submit W-8BEN →' :
               w8benStatus.record ? 'Continue W-8BEN →' : 'Complete W-8BEN with TaxBandits →'}
            </Button>
            <p className="text-xs text-muted mt-2">Opens TaxBandits in a new tab. Artypot never sees your personal tax details.</p>
          </>
        )}
      </Card>
    );
  }

  // Loading.
  return (
    <Card>
      <SectionLabel className="mb-3">tax compliance</SectionLabel>
      <div className="h-5 bg-surface-2 animate-pulse rounded w-2/3" />
    </Card>
  );
}
