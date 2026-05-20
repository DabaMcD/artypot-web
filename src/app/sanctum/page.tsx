'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { cash as cashApi, stripeConnect as stripeConnectApi, withdrawals as withdrawalsApi, w9 as w9Api, w8ben as w8benApi } from '@/lib/api';
import type { CreatorBalance, FormW9StatusResponse, FormW8BENStatusResponse } from '@/lib/types';
import { countryName } from '@/lib/countries';
import { BILLING_DAY } from '@/lib/config';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { BalancePipeline } from '@/components/ui/Pipeline';
import { Input } from '@/components/ui/Input';
import PayoutReadinessChecklist from '@/components/PayoutReadinessChecklist';

type StripeAccountStatus = {
  account_id: string | null;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
  requirements: string[];
};

function SanctumPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState<CreatorBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [bankConnectedOverride, setBankConnectedOverride] = useState<boolean | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [w9Status, setW9Status] = useState<FormW9StatusResponse | null>(null);
  const [w9UrlLoading, setW9UrlLoading] = useState(false);
  const [w8benStatus, setW8benStatus] = useState<FormW8BENStatusResponse | null>(null);
  const [w8benUrlLoading, setW8benUrlLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && !user.creator) router.push('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.creator) return;
    cashApi.creatorBalance().then(setBalance).catch(() => {});
    const isUS = user.country_code === 'US';
    if (isUS) {
      w9Api.status().then((res) => setW9Status(res.data)).catch(() => {}).finally(() => setBalanceLoading(false));
    } else if (user.country_code) {
      w8benApi.status().then((res) => setW8benStatus(res.data)).catch(() => {}).finally(() => setBalanceLoading(false));
    } else {
      setBalanceLoading(false);
    }
    if (user.creator.bank_connected) {
      stripeConnectApi.accountStatus().then((res) => setStripeStatus(res.data)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (!stripeParam) return;
    router.replace('/sanctum', { scroll: false });
    if (stripeParam === 'complete') {
      toast('Bank setup complete! Verifying your account status…', 'success');
      stripeConnectApi.accountStatus().then((res) => setStripeStatus(res.data)).catch(() => {});
    } else if (stripeParam === 'refresh') {
      toast('Onboarding link expired — click "Continue setup" to try again.', 'error');
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
    const w9Param = searchParams.get('w9');
    if (!w9Param) return;
    router.replace('/sanctum', { scroll: false });
    if (w9Param === 'complete') {
      toast('W-9 submitted! We\'ll notify you once your SSN/TIN has been verified.', 'success');
      w9Api.status().then((res) => setW9Status(res.data)).catch(() => {});
    } else if (w9Param === 'cancelled') {
      toast('W-9 not completed — you can come back and finish it any time.', 'error');
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
    const w8benParam = searchParams.get('w8ben');
    if (!w8benParam) return;
    router.replace('/sanctum', { scroll: false });
    if (w8benParam === 'complete') {
      toast('W-8BEN submitted! We\'ll review and confirm shortly.', 'success');
      w8benApi.status().then((res) => setW8benStatus(res.data)).catch(() => {});
    } else if (w8benParam === 'cancelled') {
      toast('W-8BEN not completed — you can finish it any time.', 'error');
    }
  }, [searchParams, router, toast]);

  const handleConnectBank = useCallback(async () => {
    if (stripeLoading) return;
    setStripeLoading(true);
    try {
      const returnUrl  = `${window.location.origin}/sanctum?stripe=complete`;
      const refreshUrl = `${window.location.origin}/sanctum?stripe=refresh`;
      const res = await stripeConnectApi.createAccount(returnUrl, refreshUrl);
      window.location.href = res.data.onboarding_url;
    } catch {
      toast('Failed to start bank connection. Please try again.', 'error');
      setStripeLoading(false);
    }
  }, [stripeLoading, toast]);

  const handleContinueOnboarding = useCallback(async () => {
    if (stripeLoading) return;
    setStripeLoading(true);
    try {
      const returnUrl  = `${window.location.origin}/sanctum?stripe=complete`;
      const refreshUrl = `${window.location.origin}/sanctum?stripe=refresh`;
      const res = await stripeConnectApi.onboardingLink(returnUrl, refreshUrl);
      window.location.href = res.data.onboarding_url;
    } catch {
      toast('Failed to generate setup link. Please try again.', 'error');
      setStripeLoading(false);
    }
  }, [stripeLoading, toast]);

  const handleDisconnect = useCallback(async () => {
    if (stripeLoading) return;
    if (!window.confirm('Disconnect your bank account? You will need to re-link to withdraw funds.')) return;
    setStripeLoading(true);
    try {
      await stripeConnectApi.disconnect();
      setStripeStatus(null);
      setBankConnectedOverride(false);
      toast('Bank account disconnected.', 'success');
    } catch {
      toast('Failed to disconnect. Please try again.', 'error');
    } finally {
      setStripeLoading(false);
    }
  }, [stripeLoading, toast]);

  const handleWithdraw = useCallback(async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 1) { toast('Minimum withdrawal is $1.00', 'error'); return; }
    setWithdrawLoading(true);
    setWithdrawConfirm(false);
    try {
      await withdrawalsApi.request(amount);
      toast(`Payout of $${amount.toFixed(2)} initiated! It'll hit your bank in 1–3 business days.`, 'success');
      setWithdrawAmount('');
      cashApi.creatorBalance().then(setBalance).catch(() => {});
      w9Api.status().then((res) => setW9Status(res.data)).catch(() => {});
    } catch (err: unknown) {
      const e = err as { message?: string; requires_w9?: boolean; requires_w8ben?: boolean; requires_location?: boolean };
      if (e.requires_location) {
        toast('Please set your location on your profile before withdrawing.', 'error');
      } else if (e.requires_w8ben) {
        w8benApi.status().then((res) => setW8benStatus(res.data)).catch(() => {});
        toast('A W-8BEN is required before this withdrawal.', 'error');
      } else if (e.requires_w9) {
        w9Api.status().then((res) => setW9Status(res.data)).catch(() => {});
        toast('A W-9 is required before this withdrawal.', 'error');
      } else {
        toast(e.message ?? 'Payout failed. Please try again.', 'error');
      }
    } finally {
      setWithdrawLoading(false);
    }
  }, [withdrawAmount, toast]);

  const handleGetW9Url = useCallback(async () => {
    setW9UrlLoading(true);
    try {
      const res = await w9Api.w9Url();
      window.open(res.data.w9_url, '_blank', 'noopener,noreferrer');
      w9Api.status().then((r) => setW9Status(r.data)).catch(() => {});
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to get W-9 link. Please try again.', 'error');
    } finally {
      setW9UrlLoading(false);
    }
  }, [toast]);

  const handleGetW8BENUrl = useCallback(async () => {
    setW8benUrlLoading(true);
    try {
      const res = await w8benApi.w8benUrl();
      window.open(res.data.w8ben_url, '_blank', 'noopener,noreferrer');
      w8benApi.status().then((r) => setW8benStatus(r.data)).catch(() => {});
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to get W-8BEN link. Please try again.', 'error');
    } finally {
      setW8benUrlLoading(false);
    }
  }, [toast]);

  if (authLoading || !user || !user.creator) {
    return (
      <div className="space-y-6 pt-2">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="h-24 bg-surface animate-pulse rounded" />
      </div>
    );
  }

  const creator = user.creator;
  const bankConnected  = bankConnectedOverride ?? (creator.bank_connected ?? false);
  const payoutsEnabled = stripeStatus?.payouts_enabled === true;
  const payoutHold     = creator.payout_hold === true;
  const canWithdraw    = payoutsEnabled && !payoutHold;
  const isUS           = user.country_code === 'US';
  const needsLocation  = !user.location_complete;

  const openPledges        = balance?.open_pledges ?? 0;
  const solidOpenPledges   = balance?.solid_open_pledges ?? openPledges;
  const softOpenPledges    = openPledges - solidOpenPledges;
  const pendingPayment     = balance?.pending_payment ?? 0;
  const clearing           = balance?.clearing ?? 0;
  const availableBalance   = balance?.available_balance ?? 0;
  const paidOut            = balance?.paid_out ?? 0;
  const recentTransactions = balance?.available?.data?.slice(0, 5) ?? [];

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const needsW9    = isUS && !!(w9Status?.requires_w9 && !w9Status?.record?.tin_matched);
  const needsW8BEN = !isUS && !!(w8benStatus?.requires_w8ben && !w8benStatus?.record?.qualifies);
  const taxFormOnFile   = isUS ? !!w9Status?.record?.tin_matched : !!w8benStatus?.record?.qualifies;
  const taxFormRequired = needsW9 || needsW8BEN;

  return (
    <div className="space-y-7 pt-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>creator · sanctum</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{creator.display_name}</h1>
        </div>
        <Link href={`/${user.slug}`}>
          <Button variant="default" size="sm">Public Profile →</Button>
        </Link>
      </div>

      {/* Payout hold warning */}
      {payoutHold && (
        <Banner tone="bad" action={
          <Link href="/sanctum">
            <Button variant="primary" size="sm">Complete verification →</Button>
          </Link>
        }>
          <div>
            <strong>Your payouts are currently on hold.</strong>
            {' '}Stripe needs additional verification before funds can be released.
          </div>
        </Banner>
      )}

      {/* Setup checklist */}
      {(needsLocation || !canWithdraw || taxFormRequired) && (
        <Banner tone="warn">
          <div>
            <strong>Before You Can Withdraw</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li className={`flex items-center gap-2 ${!needsLocation ? 'line-through text-muted' : ''}`}>
                <span>{!needsLocation ? '✓' : '1.'}</span>
                Set your location
                {needsLocation && <Link href={`/${user.slug}/edit`} className="ap-inline-link ml-1">edit profile →</Link>}
              </li>
              <li className={`flex items-center gap-2 ${canWithdraw ? 'line-through text-muted' : ''}`}>
                <span>{canWithdraw ? '✓' : '2.'}</span>
                Connect a bank account
              </li>
              <li className={`flex items-center gap-2 ${taxFormOnFile ? 'line-through text-muted' : ''}`}>
                <span>{taxFormOnFile ? '✓' : '3.'}</span>
                Submit your {isUS ? 'W-9' : 'W-8BEN'}
              </li>
            </ul>
          </div>
        </Banner>
      )}

      {/* Balance pipeline */}
      <div>
        <SectionLabel className="mb-3">earnings pipeline</SectionLabel>
        <BalancePipeline balances={{ pending: pendingPayment, clearing, available: availableBalance }} />
        <p className="text-xs text-muted mt-2">
          Contributions flow left &rarr; right. Council approval moves funds to pending. Payment from fans on the {BILLING_DAY}th moves them into clearing. 7 days later they&apos;re available.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT */}
        <div className="space-y-6">

          {/* Open backing + paid out stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">open backing</div>
              <div className="font-mono text-[24px] font-medium tabular-nums text-foreground">{fmt(solidOpenPledges)}</div>
              <div className="font-mono text-[10px] text-muted mt-0.5">solid pledges (active payment method)</div>
              {softOpenPledges > 0.005 && (
                <div className="font-mono text-[10px] text-muted mt-0.5">+ {fmt(softOpenPledges)} soft (no payment method)</div>
              )}
            </Card>
            <Card>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">lifetime paid out</div>
              <div className="font-mono text-[24px] font-medium tabular-nums text-foreground">{fmt(paidOut)}</div>
              <div className="font-mono text-[10px] text-muted mt-0.5">total withdrawn to bank</div>
            </Card>
          </div>

          {/* Recent transactions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>recent transactions</SectionLabel>
              <Link href="/cash" className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
                full ledger →
              </Link>
            </div>
            {balanceLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-5 bg-surface-2 animate-pulse rounded" />)}
              </div>
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted">no transactions yet.</p>
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
                    methodBadge = { label: 'earning', tone: 'creator' };
                  }
                  return (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <span className="text-sm text-muted truncate flex-1">{entry.description}</span>
                      <span className="shrink-0" title={refTitle}>
                        {methodBadge && <Badge tone={methodBadge.tone}>{methodBadge.label}</Badge>}
                      </span>
                      <span className={`font-mono text-sm font-medium shrink-0 ${amt < 0 ? 'text-bad' : 'text-creator'}`}>
                        {amt < 0 ? '-' : '+'}${Math.abs(amt).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Bank account */}
          <Card>
            <div className="flex items-start justify-between mb-3">
              <SectionLabel>bank account</SectionLabel>
              {canWithdraw && <Badge tone="good">connected</Badge>}
            </div>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Artypot uses Stripe for secure, direct bank verification — your credentials are never stored by us.
            </p>
            {needsLocation ? (
              <div>
                <p className="text-sm text-muted mb-3">Set your location before connecting a bank account.</p>
                <Link href={`/${user.slug}/edit`}>
                  <Button variant="primary">Set Location →</Button>
                </Link>
              </div>
            ) : !bankConnected ? (
              <Button variant="primary" disabled={stripeLoading} onClick={handleConnectBank}>
                {stripeLoading ? 'Starting setup…' : 'Connect Bank Account'}
              </Button>
            ) : !canWithdraw ? (
              <div>
                <Button variant="primary" disabled={stripeLoading} onClick={handleContinueOnboarding}>
                  {stripeLoading ? 'Loading…' : 'Continue Setup →'}
                </Button>
                <p className="text-xs text-warn mt-2">Bank connection pending — complete Stripe setup to enable withdrawals.</p>
              </div>
            ) : (
              <Button variant="ghost" size="sm" disabled={stripeLoading} onClick={handleDisconnect}>
                {stripeLoading ? 'Disconnecting…' : 'Disconnect Bank'}
              </Button>
            )}
          </Card>

          {/* Tax — W-9 */}
          {isUS && w9Status && (
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
                    ? `Your ${w9Status.tax_year} payouts have reached $${w9Status.ytd_withdrawals.toFixed(2)}. A W-9 is required before withdrawing.`
                    : `You've earned $${w9Status.ytd_withdrawals.toFixed(2)} this year. Artypot requires a W-9 once you hit $${w9Status.threshold.toFixed(0)}.`}
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
          )}

          {/* Tax — W-8BEN */}
          {!isUS && w8benStatus && (
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
                    ? `Your ${w8benStatus.tax_year} payouts have reached $${w8benStatus.ytd_withdrawals.toFixed(2)}. A W-8BEN is required before withdrawing.`
                    : `You've earned $${w8benStatus.ytd_withdrawals.toFixed(2)} this year. Artypot requires a W-8BEN once you hit $${w8benStatus.threshold.toFixed(0)}.`}
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
          )}
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">
          {/* Withdraw */}
          <Card className="border-[var(--color-role)]/30">
            <SectionLabel className="mb-1">available</SectionLabel>
            <div className="font-mono text-[32px] font-medium tabular-nums text-creator mb-3">
              {balanceLoading ? <span className="text-muted/40">—</span> : fmt(availableBalance)}
            </div>

            {payoutHold ? (
              <p className="text-sm text-bad">
                Payouts are on hold — complete Stripe verification to withdraw.{' '}
                <Link href="/sanctum" className="underline underline-offset-2 hover:opacity-80">Resolve now →</Link>
              </p>
            ) : !canWithdraw ? (
              <p className="text-sm text-muted">
                {bankConnected ? 'Complete bank setup to withdraw.' : 'Connect a bank account to withdraw.'}
              </p>
            ) : availableBalance <= 0 ? (
              <p className="text-sm text-muted">Nothing to withdraw yet.</p>
            ) : withdrawConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  Send <strong className="text-creator">${parseFloat(withdrawAmount || '0').toFixed(2)}</strong> to your linked bank?
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" disabled={withdrawLoading} onClick={handleWithdraw}>
                    {withdrawLoading ? 'Sending…' : 'Yes, Send It'}
                  </Button>
                  <Button variant="ghost" disabled={withdrawLoading} onClick={() => setWithdrawConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted text-sm">$</span>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    max={availableBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={availableBalance.toFixed(2)}
                    className="pl-7"
                  />
                </div>
                <Button
                  variant="primary"
                  disabled={withdrawLoading}
                  onClick={() => {
                    if (!withdrawAmount) setWithdrawAmount(availableBalance.toFixed(2));
                    setWithdrawConfirm(true);
                  }}
                >
                  Withdraw
                </Button>
              </div>
            )}
          </Card>

          {/* Status summary */}
          <Card>
            <SectionLabel className="mb-3">status</SectionLabel>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">location</span>
                <span className={user.location_complete ? 'text-good' : 'text-warn'}>
                  {user.location_complete
                    ? (isUS ? `${user.state_code}, US` : countryName(user.country_code ?? ''))
                    : 'not set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">{isUS ? 'W-9' : 'W-8BEN'}</span>
                <span className={
                  isUS
                    ? (w9Status?.record?.tin_matched ? 'text-good' : w9Status?.requires_w9 ? 'text-warn' : 'text-muted')
                    : (w8benStatus?.record?.qualifies ? 'text-good' : w8benStatus?.requires_w8ben ? 'text-warn' : 'text-muted')
                }>
                  {isUS
                    ? (w9Status?.record?.tin_matched ? 'verified' : w9Status?.record ? 'submitted' : w9Status?.requires_w9 ? 'required' : 'not needed yet')
                    : (w8benStatus?.record?.qualifies ? 'submitted' : w8benStatus?.requires_w8ben ? 'required' : 'not needed yet')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">bank account</span>
                <span className={canWithdraw ? 'text-good' : bankConnected ? 'text-warn' : 'text-warn'}>
                  {canWithdraw ? 'connected' : bankConnected ? 'setup incomplete' : 'not connected'}
                </span>
              </div>
            </div>
            <div className="border-t border-border mt-3 pt-3">
              <Link href={`/${user.slug}/edit`} className="ap-inline-link text-xs">Manage Profile →</Link>
            </div>
          </Card>

          {/* First payout checklist */}
          <Card>
            <SectionLabel className="mb-3">first payout</SectionLabel>
            <PayoutReadinessChecklist />
          </Card>

          {/* Quick links */}
          <Card dashed>
            <Link href="/bounties/new" className="block text-sm text-foreground hover:text-fan transition-colors mb-2">
              + Start a New Bounty
            </Link>
            <Link href={`/${user.slug}`} className="block text-sm text-foreground hover:text-creator transition-colors">
              View Public Profile
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SanctumPage() {
  return (
    <Suspense>
      <SanctumPageContent />
    </Suspense>
  );
}
