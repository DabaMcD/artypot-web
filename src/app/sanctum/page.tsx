'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { cash as cashApi, stripeConnect as stripeConnectApi, withdrawals as withdrawalsApi, w9 as w9Api, w8ben as w8benApi } from '@/lib/api';
import type { CreatorBalance, FormW9StatusResponse, FormW8BENStatusResponse } from '@/lib/types';
import { countryName } from '@/lib/countries';
import EarningsPipeline from '@/components/EarningsPipeline';

type StripeAccountStatus = {
  account_id: string | null;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
  requirements: string[];
};

function InfoTip({ content }: { content: string }) {
  return (
    <span className="relative group cursor-default ml-1 inline-flex items-center">
      <span className="italic font-serif text-muted text-xs w-3.5 h-3.5 rounded-full border border-muted/40 inline-flex items-center justify-center leading-none select-none hover:border-foreground/40 hover:text-foreground transition-colors">
        i
      </span>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-surface-2 border border-border rounded-xl p-3 shadow-xl text-xs text-muted leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 text-left">
        {content}
      </div>
    </span>
  );
}

function SanctumPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState<CreatorBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  // Track disconnect locally so UI reflects it before /me refetches
  const [bankConnectedOverride, setBankConnectedOverride] = useState<boolean | null>(null);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);

  // W-9 state (US creators only)
  const [w9Status, setW9Status] = useState<FormW9StatusResponse | null>(null);
  const [w9UrlLoading, setW9UrlLoading] = useState(false);

  // W-8BEN state (non-US creators only)
  const [w8benStatus, setW8benStatus] = useState<FormW8BENStatusResponse | null>(null);
  const [w8benUrlLoading, setW8benUrlLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && !user.creator) router.push('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.creator) return;

    cashApi
      .creatorBalance()
      .then(setBalance)
      .catch(() => {});

    // Load the appropriate tax form status depending on creator location
    const isUS = user.creator.country_code === 'US';
    if (isUS) {
      w9Api
        .status()
        .then((res) => setW9Status(res.data))
        .catch(() => {})
        .finally(() => setBalanceLoading(false));
    } else if (user.creator.country_code) {
      // Non-US creator with a country set — load W-8BEN status
      w8benApi
        .status()
        .then((res) => setW8benStatus(res.data))
        .catch(() => {})
        .finally(() => setBalanceLoading(false));
    } else {
      // No country set — skip tax form fetch
      setBalanceLoading(false);
    }

    // Fetch live Stripe Connect status (payouts_enabled etc.) if an account exists
    if (user.creator.bank_connected) {
      stripeConnectApi
        .accountStatus()
        .then((res) => setStripeStatus(res.data))
        .catch(() => {});
    }
  }, [user]);

  // Handle return from Stripe Account Link onboarding
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (!stripeParam) return;

    // Clean the query param from the URL without adding a history entry
    router.replace('/sanctum', { scroll: false });

    if (stripeParam === 'complete') {
      toast('Bank setup complete! Verifying your account status…', 'success');
      // Re-fetch live status so payouts_enabled updates immediately
      stripeConnectApi
        .accountStatus()
        .then((res) => setStripeStatus(res.data))
        .catch(() => {});
    } else if (stripeParam === 'refresh') {
      toast('Onboarding link expired — click "Continue setup" to try again.', 'error');
    }
  }, [searchParams, router, toast]);

  // Handle return from TaxBandits W-9 form
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

  // Handle return from TaxBandits W-8BEN form
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

  // ── Bank connection handlers ────────────────────────────────────────────────

  /** Start Stripe Connect onboarding for a new account. */
  const handleConnectBank = useCallback(async () => {
    if (stripeLoading) return;
    setStripeLoading(true);
    try {
      const returnUrl  = `${window.location.origin}/sanctum?stripe=complete`;
      const refreshUrl = `${window.location.origin}/sanctum?stripe=refresh`;
      const res = await stripeConnectApi.createAccount(returnUrl, refreshUrl);
      // Navigate to Stripe-hosted onboarding — don't reset stripeLoading, we're leaving
      window.location.href = res.data.onboarding_url;
    } catch {
      toast('Failed to start bank connection. Please try again.', 'error');
      setStripeLoading(false);
    }
  }, [stripeLoading, toast]);

  /** Resume onboarding for an account that exists but isn't fully set up yet. */
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

  /** Disconnect (delete) the Stripe Connect account so the creator can re-onboard. */
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

  // ── Withdrawal handler ──────────────────────────────────────────────────────

  const handleWithdraw = useCallback(async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 1) {
      toast('Minimum withdrawal is $1.00', 'error');
      return;
    }
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
        toast('A W-8BEN is required before this withdrawal — see the Tax Compliance section below.', 'error');
      } else if (e.requires_w9) {
        w9Api.status().then((res) => setW9Status(res.data)).catch(() => {});
        toast('A W-9 is required before this withdrawal — see the Tax Compliance section below.', 'error');
      } else {
        toast(e.message ?? 'Payout failed. Please try again.', 'error');
      }
    } finally {
      setWithdrawLoading(false);
    }
  }, [withdrawAmount, toast]);

  // ── W-9 handler ─────────────────────────────────────────────────────────────

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

  // ── W-8BEN handler ──────────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  if (authLoading || !user || !user.creator) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        <div className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  const creator = user.creator;

  // `bank_connected` from /me = connect account ID exists (not necessarily fully onboarded)
  // `payoutsEnabled` = onboarding complete + bank verified
  const bankConnected  = bankConnectedOverride ?? (creator.bank_connected ?? false);
  const payoutsEnabled = stripeStatus?.payouts_enabled === true;
  const canWithdraw    = payoutsEnabled;

  const isUS          = creator.country_code === 'US';
  const needsLocation = !creator.location_complete;

  const openVotives         = balance?.open_votives ?? 0;
  const pendingVerification = balance?.pending_verification ?? 0;
  const pendingPayment      = balance?.pending_payment ?? 0;
  const clearing            = balance?.clearing ?? 0;
  const availableBalance    = balance?.available_balance ?? 0;
  const paidOut             = balance?.paid_out ?? 0;
  const recentTransactions  = balance?.available?.data?.slice(0, 5) ?? [];

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const pipelineStages = [
    { label: 'Open Backing',         amount: fmt(openVotives),         sub: 'soft pledges, no charge locked' },
    { label: 'Pending Verification', amount: fmt(pendingVerification), sub: 'Council reviewing' },
    { label: 'Pending Payment',      amount: fmt(pendingPayment),      sub: 'billing next 24th' },
    { label: 'Clearing',             amount: fmt(clearing),            sub: '7-day hold' },
    { label: 'Available',            amount: fmt(availableBalance),    sub: 'ready to withdraw', isActive: true },
    { label: 'Paid Out',             amount: fmt(paidOut),             sub: 'lifetime' },
  ];

  const needsW9    = isUS && !!(w9Status?.requires_w9 && !w9Status?.record?.tin_matched);
  const needsW8BEN = !isUS && !!(w8benStatus?.requires_w8ben && !w8benStatus?.record?.qualifies);
  const needsBank  = needsLocation || !canWithdraw;

  // For the setup checklist — "on file" means the form qualifies (not just submitted)
  const taxFormOnFile  = isUS ? !!w9Status?.record?.tin_matched : !!w8benStatus?.record?.qualifies;
  const taxFormRequired = needsW9 || needsW8BEN;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-creator/70 uppercase tracking-widest font-medium mb-1">Creator Sanctum</p>
          <h1 className="text-2xl font-display font-bold text-foreground">{creator.display_name}</h1>
        </div>
        <Link
          href={`/creators/${creator.id}`}
          className="shrink-0 text-sm text-creator border border-creator/30 px-4 py-2 rounded-lg hover:bg-creator/10 transition-colors"
        >
          Public Profile →
        </Link>
      </div>

      {/* Withdrawal setup checklist — visible until every step is complete */}
      {(needsLocation || !canWithdraw || taxFormRequired) && (
        <div className="border border-border bg-surface rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">Before you can withdraw</h2>
            {(needsLocation || taxFormRequired) && (
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2.5 py-0.5 rounded-full">
                Action required
              </span>
            )}
          </div>
          <ol className="space-y-3">

            {/* 1 — Location */}
            <li className="flex items-start gap-3">
              <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                !needsLocation
                  ? 'bg-creator/20 border-creator text-creator'
                  : 'bg-amber-900/20 border-amber-600 text-amber-400'
              }`}>
                {!needsLocation ? '✓' : '1'}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!needsLocation ? 'text-muted line-through' : 'text-foreground font-medium'}`}>
                  Set your location
                </p>
                {needsLocation && (
                  <p className="text-xs text-muted mt-0.5">
                    Required to determine which tax form applies.{' '}
                    <Link href={`/creators/${creator.id}/edit`} className="text-creator hover:underline underline-offset-2">
                      Edit profile →
                    </Link>
                  </p>
                )}
              </div>
            </li>

            {/* 2 — Bank account */}
            <li className="flex items-start gap-3">
              <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                canWithdraw
                  ? 'bg-creator/20 border-creator text-creator'
                  : needsLocation
                    ? 'border-border text-muted/40'
                    : 'bg-amber-900/20 border-amber-600 text-amber-400'
              }`}>
                {canWithdraw ? '✓' : '2'}
              </span>
              <p className={`mt-0.5 text-sm leading-snug ${
                canWithdraw ? 'text-muted line-through' : needsLocation ? 'text-muted/40' : 'text-foreground font-medium'
              }`}>
                Connect a bank account
                {!canWithdraw && !needsLocation && (
                  <span className="font-normal text-muted">
                    {bankConnected ? ' — complete Stripe setup below' : ' — see Bank Account section below'}
                  </span>
                )}
              </p>
            </li>

            {/* 3 — Tax form */}
            <li className="flex items-start gap-3">
              <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                taxFormOnFile
                  ? 'bg-creator/20 border-creator text-creator'
                  : taxFormRequired
                    ? 'bg-amber-900/20 border-amber-600 text-amber-400'
                    : 'border-border text-muted/40'
              }`}>
                {taxFormOnFile ? '✓' : '3'}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${
                  taxFormOnFile ? 'text-muted line-through' : taxFormRequired ? 'text-foreground font-medium' : 'text-muted/40'
                }`}>
                  Submit your {isUS ? 'W-9' : 'W-8BEN'}
                  {taxFormRequired && <span className="font-normal text-muted"> — see Tax Compliance section below</span>}
                </p>
                {!taxFormRequired && !taxFormOnFile && (
                  <p className="text-xs text-muted/60 mt-0.5">Required once annual payouts exceed $100.</p>
                )}
              </div>
            </li>

          </ol>
        </div>
      )}

      {/* Earnings pipeline strip */}
      <div className="mb-8">
        <EarningsPipeline stages={pipelineStages} loading={balanceLoading} />
      </div>

      {/* Two-column grid */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT column */}
        <div className="space-y-6">

          {/* Recent Transactions */}
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Recent Transactions</h2>
              <Link href="/cash" className="text-sm text-creator/70 hover:text-creator transition-colors">
                Full ledger →
              </Link>
            </div>
            {balanceLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-5 bg-surface-2 animate-pulse rounded" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted">No transactions yet.</p>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted truncate mr-4">{entry.description}</span>
                    <span className={`font-semibold shrink-0 ${Number(entry.amount) < 0 ? 'text-red-400' : 'text-creator'}`}>
                      {Number(entry.amount) < 0 ? '-' : '+'}${Math.abs(Number(entry.amount)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bank Account */}
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">Bank Account</h2>
                <p className="text-sm text-muted leading-relaxed">
                  Connect a bank account to receive withdrawals. Artypot uses Stripe for secure,
                  direct bank verification — your credentials are never stored by us.
                </p>
              </div>
              {canWithdraw && (
                <span className="shrink-0 text-xs font-semibold text-creator bg-creator/10 border border-creator/30 px-2.5 py-1 rounded-full">
                  Connected
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-2 flex-wrap items-center">
              {needsLocation ? (
                // Location not set — must set country (+ state for US) before Stripe Connect
                <div>
                  <p className="text-sm text-muted mb-3">
                    Set your location on your profile before connecting a bank account.
                  </p>
                  <Link
                    href={`/creators/${creator.id}/edit`}
                    className="bg-creator text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity inline-block"
                  >
                    Set location →
                  </Link>
                </div>
              ) : !bankConnected ? (
                // No account at all — start fresh
                <button
                  onClick={handleConnectBank}
                  disabled={stripeLoading}
                  className="bg-creator text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {stripeLoading ? 'Starting setup…' : 'Connect bank account'}
                </button>
              ) : !canWithdraw ? (
                // Has account but onboarding not complete
                <button
                  onClick={handleContinueOnboarding}
                  disabled={stripeLoading}
                  className="bg-creator text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {stripeLoading ? 'Loading…' : 'Continue setup →'}
                </button>
              ) : (
                // Fully onboarded — offer disconnect
                <button
                  onClick={handleDisconnect}
                  disabled={stripeLoading}
                  className="text-sm text-muted border border-border px-4 py-2 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {stripeLoading ? 'Disconnecting…' : 'Disconnect bank'}
                </button>
              )}
            </div>

            {/* Pending onboarding hint */}
            {bankConnected && !canWithdraw && (
              <p className="text-xs text-amber-400 mt-3 leading-relaxed">
                Your bank connection is pending — complete the Stripe setup above to enable withdrawals.
              </p>
            )}
          </div>

          {/* Tax Compliance — W-9 (US creators) */}
          {isUS && w9Status && (
            <div className={`border rounded-xl p-5 ${
              w9Status.record?.tin_matched
                ? 'bg-creator/5 border-creator/30'
                : w9Status.record?.qualifies
                  ? 'bg-surface border-border'
                  : w9Status.requires_w9
                    ? 'bg-amber-900/10 border-amber-700/40'
                    : 'bg-surface border-border'
            }`}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground mb-1">Tax Compliance — W-9</h2>
                  <p className="text-sm text-muted leading-relaxed">
                    {w9Status.record?.tin_matched
                      ? `Your W-9 is complete and your SSN/TIN has been verified. You're all set to withdraw.`
                      : w9Status.record?.status === 'completed'
                        ? `Your W-9 has been received. SSN/TIN verification is in progress — withdrawals are unlocked while we wait.`
                        : w9Status.record?.status === 'tin_failed'
                          ? `SSN/TIN verification failed. Please re-submit your W-9 with corrected information.`
                          : w9Status.requires_w9
                            ? `Your ${w9Status.tax_year} payouts have reached $${w9Status.ytd_withdrawals.toFixed(2)}. Artypot requires a W-9 on file once annual payouts hit $${w9Status.threshold.toFixed(0)} — please complete yours before withdrawing.`
                            : `You've earned $${w9Status.ytd_withdrawals.toFixed(2)} this year. Artypot requires a W-9 on file once you hit $${w9Status.threshold.toFixed(0)} in annual payouts — getting ahead of it now means no interruption to withdrawals later.`
                    }
                  </p>
                </div>
                {/* Overall status badge */}
                {w9Status.record && (
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    w9Status.record.status === 'tin_matched' ? 'text-creator bg-creator/10 border-creator/30' :
                    w9Status.record.status === 'completed'   ? 'text-blue-400 bg-blue-900/20 border-blue-700/40' :
                    w9Status.record.status === 'tin_failed'  ? 'text-red-400 bg-red-900/20 border-red-700/40' :
                    'text-amber-400 bg-amber-900/20 border-amber-700/40'
                  }`}>
                    {w9Status.record.status === 'tin_matched' ? 'SSN Verified' :
                     w9Status.record.status === 'completed'   ? 'Submitted' :
                     w9Status.record.status === 'tin_failed'  ? 'SSN Mismatch' :
                     'Pending'}
                  </span>
                )}
              </div>

              {/* Progress steps */}
              {w9Status.record && (
                <div className="flex items-center gap-2 mb-4 text-xs">
                  {/* Step 1: Form submitted */}
                  <div className={`flex items-center gap-1.5 ${
                    w9Status.record.completed_at ? 'text-creator' : 'text-muted'
                  }`}>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      w9Status.record.completed_at
                        ? 'bg-creator/20 border-creator text-creator'
                        : 'border-border text-muted'
                    }`}>
                      {w9Status.record.completed_at ? '✓' : '1'}
                    </span>
                    W-9 Submitted
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  {/* Step 2: SSN/TIN matched */}
                  <div className={`flex items-center gap-1.5 ${
                    w9Status.record.tin_matched
                      ? 'text-creator'
                      : w9Status.record.tin_failed
                        ? 'text-red-400'
                        : 'text-muted'
                  }`}>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      w9Status.record.tin_matched
                        ? 'bg-creator/20 border-creator text-creator'
                        : w9Status.record.tin_failed
                          ? 'bg-red-900/20 border-red-500 text-red-400'
                          : 'border-border text-muted'
                    }`}>
                      {w9Status.record.tin_matched ? '✓' : w9Status.record.tin_failed ? '✕' : '2'}
                    </span>
                    SSN / TIN Match
                  </div>
                </div>
              )}

              {/* Action button — show unless fully verified */}
              {!w9Status.record?.tin_matched && (
                <div>
                  {w9Status.record?.status === 'tin_failed' && (
                    <p className="text-sm text-red-400 mb-3">
                      The SSN/TIN you provided could not be matched. Please re-submit your W-9 with corrected details.
                    </p>
                  )}
                  <button
                    onClick={handleGetW9Url}
                    disabled={w9UrlLoading}
                    className={`font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors ${
                      w9Status.requires_w9 || w9Status.record?.status === 'tin_failed'
                        ? 'bg-amber-500 hover:bg-amber-400 text-black'
                        : 'bg-surface-2 hover:bg-surface border border-border text-foreground'
                    }`}
                  >
                    {w9UrlLoading
                      ? 'Loading…'
                      : w9Status.record?.status === 'tin_failed'
                        ? 'Re-submit W-9 →'
                        : w9Status.record
                          ? 'Continue W-9 →'
                          : 'Complete W-9 with TaxBandits →'
                    }
                  </button>
                  <p className="text-xs text-muted mt-2">
                    Opens TaxBandits in a new tab. Your SSN is collected and verified by TaxBandits — Artypot never sees it.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tax Compliance — W-8BEN (non-US creators) */}
          {!isUS && w8benStatus && (
            <div className={`border rounded-xl p-5 ${
              w8benStatus.record?.qualifies
                ? 'bg-creator/5 border-creator/30'
                : w8benStatus.requires_w8ben
                  ? 'bg-amber-900/10 border-amber-700/40'
                  : 'bg-surface border-border'
            }`}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground mb-1">Tax Compliance — W-8BEN</h2>
                  <p className="text-sm text-muted leading-relaxed">
                    {w8benStatus.record?.status === 'completed'
                      ? `Your W-8BEN has been submitted and confirmed. You're all set to withdraw.`
                      : w8benStatus.record?.status === 'invalid'
                        ? `Your W-8BEN was flagged as invalid. Please re-submit with corrected information.`
                        : w8benStatus.requires_w8ben
                          ? `Your ${w8benStatus.tax_year} payouts have reached $${w8benStatus.ytd_withdrawals.toFixed(2)}. Artypot requires a W-8BEN on file once annual payouts hit $${w8benStatus.threshold.toFixed(0)} — please complete yours before withdrawing.`
                          : `You've earned $${w8benStatus.ytd_withdrawals.toFixed(2)} this year. Artypot requires a W-8BEN on file once you hit $${w8benStatus.threshold.toFixed(0)} in annual payouts — getting ahead of it now means no interruption to withdrawals later.`
                    }
                  </p>
                </div>
                {/* Status badge */}
                {w8benStatus.record && (
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    w8benStatus.record.status === 'completed' ? 'text-creator bg-creator/10 border-creator/30' :
                    w8benStatus.record.status === 'invalid'   ? 'text-red-400 bg-red-900/20 border-red-700/40' :
                    'text-amber-400 bg-amber-900/20 border-amber-700/40'
                  }`}>
                    {w8benStatus.record.status === 'completed' ? 'Submitted' :
                     w8benStatus.record.status === 'invalid'   ? 'Invalid' :
                     'Pending'}
                  </span>
                )}
              </div>

              {/* Single progress step — W-8BEN has no TIN matching */}
              {w8benStatus.record && (
                <div className="flex items-center gap-2 mb-4 text-xs">
                  <div className={`flex items-center gap-1.5 ${
                    w8benStatus.record.completed_at ? 'text-creator' : 'text-muted'
                  }`}>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      w8benStatus.record.completed_at
                        ? 'bg-creator/20 border-creator text-creator'
                        : 'border-border text-muted'
                    }`}>
                      {w8benStatus.record.completed_at ? '✓' : '1'}
                    </span>
                    W-8BEN Submitted
                  </div>
                </div>
              )}

              {/* Action button — show unless completed */}
              {!w8benStatus.record?.qualifies && (
                <div>
                  {w8benStatus.record?.status === 'invalid' && (
                    <p className="text-sm text-red-400 mb-3">
                      Your W-8BEN was flagged as invalid. Please re-submit with corrected details.
                    </p>
                  )}
                  <button
                    onClick={handleGetW8BENUrl}
                    disabled={w8benUrlLoading}
                    className={`font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors ${
                      w8benStatus.requires_w8ben || w8benStatus.record?.status === 'invalid'
                        ? 'bg-amber-500 hover:bg-amber-400 text-black'
                        : 'bg-surface-2 hover:bg-surface border border-border text-foreground'
                    }`}
                  >
                    {w8benUrlLoading
                      ? 'Loading…'
                      : w8benStatus.record?.status === 'invalid'
                        ? 'Re-submit W-8BEN →'
                        : w8benStatus.record
                          ? 'Continue W-8BEN →'
                          : 'Complete W-8BEN with TaxBandits →'
                    }
                  </button>
                  <p className="text-xs text-muted mt-2">
                    Opens TaxBandits in a new tab. Your information is collected and verified by TaxBandits — Artypot never sees your personal tax details.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">

          {/* Available to Withdraw */}
          <div className="bg-creator/5 border border-creator/30 rounded-xl p-5">
            <div className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center">
              AVAILABLE
              <InfoTip content="Take it already! There's actually no point in waiting. No extra fees or anything" />
            </div>
            {balanceLoading ? (
              <div className="h-8 w-32 bg-surface-2 animate-pulse rounded mb-3" />
            ) : (
              <div className="text-3xl font-bold text-creator font-mono mb-3">
                {fmt(availableBalance)}
              </div>
            )}

            {!canWithdraw ? (
              <p className="text-sm text-muted">
                {bankConnected
                  ? 'Complete bank setup to withdraw your balance.'
                  : 'Connect a bank account to withdraw your balance.'}
              </p>
            ) : availableBalance <= 0 ? (
              <p className="text-sm text-muted">
                Nothing to withdraw yet.
              </p>
            ) : withdrawConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  Send{' '}
                  <span className="font-bold text-creator">
                    ${parseFloat(withdrawAmount || '0').toFixed(2)}
                  </span>{' '}
                  to your linked bank account?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawLoading}
                    className="bg-creator text-black font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {withdrawLoading ? 'Sending…' : 'Yes, send it'}
                  </button>
                  <button
                    onClick={() => setWithdrawConfirm(false)}
                    disabled={withdrawLoading}
                    className="text-sm text-muted border border-border px-4 py-2 rounded-lg hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    max={availableBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={availableBalance.toFixed(2)}
                    className="bg-surface border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-creator/60 transition-colors w-32"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!withdrawAmount) setWithdrawAmount(availableBalance.toFixed(2));
                    setWithdrawConfirm(true);
                  }}
                  disabled={withdrawLoading}
                  className="bg-creator text-black font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => setWithdrawAmount(availableBalance.toFixed(2))}
                  className="text-xs text-creator/70 hover:text-creator transition-colors"
                >
                  Max
                </button>
              </div>
            )}
          </div>

          {/* Clearing */}
          <div className="border border-border rounded-xl p-5">
            <div className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center">
              CLEARING
              <InfoTip content="For logistical reasons I have to wait 7 days before giving you money, chill bro. Lmk if your rent is due or something, I gotchu" />
            </div>
            {balanceLoading ? (
              <div className="h-7 w-24 bg-surface-2 animate-pulse rounded mb-1" />
            ) : (
              <div className="text-xl font-bold text-foreground font-mono">{fmt(clearing)}</div>
            )}
            <div className="text-xs text-muted mt-1">7-day hold</div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Held to cover potential chargebacks. Releases automatically after 7 days.
            </p>
          </div>

          {/* Upcoming / Status */}
          <div className="border border-border rounded-xl p-5">
            <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Upcoming</h3>
            <div className="space-y-2 text-sm">
              {/* Location row */}
              <div className="flex items-center justify-between">
                <span className="text-muted">Location</span>
                <span className={creator.location_complete ? 'text-creator font-medium' : 'text-amber-400 font-medium'}>
                  {creator.location_complete
                    ? (isUS
                        ? `${creator.state_code}, US`
                        : countryName(creator.country_code ?? ''))
                    : 'Not set'}
                </span>
              </div>
              {/* Tax form status row — conditional on US vs non-US */}
              <div className="flex items-center justify-between">
                <span className="text-muted">{isUS ? 'W-9 status' : 'W-8BEN status'}</span>
                <span className={
                  isUS
                    ? (w9Status?.record?.tin_matched ? 'text-creator font-medium' :
                       w9Status?.requires_w9 ? 'text-amber-400 font-medium' : 'text-muted')
                    : (w8benStatus?.record?.qualifies ? 'text-creator font-medium' :
                       w8benStatus?.requires_w8ben ? 'text-amber-400 font-medium' : 'text-muted')
                }>
                  {isUS
                    ? (w9Status?.record?.tin_matched ? 'Verified' :
                       w9Status?.record ? 'Submitted' :
                       w9Status?.requires_w9 ? 'Required' :
                       'Not needed yet')
                    : (w8benStatus?.record?.qualifies ? 'Submitted' :
                       w8benStatus?.requires_w8ben ? 'Required' :
                       'Not needed yet')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Bank account</span>
                <span className={
                  canWithdraw
                    ? 'text-creator font-medium'
                    : bankConnected
                      ? 'text-amber-400 font-medium'
                      : 'text-amber-400 font-medium'
                }>
                  {canWithdraw ? 'Connected' : bankConnected ? 'Setup incomplete' : 'Not connected'}
                </span>
              </div>
            </div>
            <Link
              href={`/creators/${creator.id}/edit`}
              className="text-xs text-creator/70 hover:text-creator transition-colors mt-3 inline-block"
            >
              Manage profile →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <Link
          href="/bounties/new"
          className="bg-surface border border-border rounded-xl p-4 hover:border-fan/40 transition-colors group"
        >
          <div className="text-sm font-semibold text-foreground group-hover:text-fan transition-colors mb-0.5">
            + New Bounty
          </div>
          <div className="text-xs text-muted">Start a new project for your fans to back</div>
        </Link>
        <Link
          href={`/creators/${creator.id}`}
          className="bg-surface border border-border rounded-xl p-4 hover:border-creator/40 transition-colors group"
        >
          <div className="text-sm font-semibold text-foreground group-hover:text-creator transition-colors mb-0.5">
            View Public Profile
          </div>
          <div className="text-xs text-muted">See your creator page as fans see it</div>
        </Link>
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
