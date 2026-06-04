'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { cash as cashApi, stripeConnect as stripeConnectApi, withdrawals as withdrawalsApi, w9 as w9Api, w8ben as w8benApi } from '@/lib/api';
import type { CreatorBalance } from '@/lib/types';

export type StripeAccountStatus = {
  account_id: string | null;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
  requirements: string[];
};

/**
 * Shared payout state + handlers for the creator surface. Both the dashboard
 * and the dedicated Payouts page mount this — it owns the single balance fetch,
 * the Stripe Connect account status, all bank connect/continue/disconnect
 * handlers, the withdraw flow, and the `?stripe=` return-redirect handling.
 *
 * @param returnPath Where the Stripe onboarding redirect should land (the page
 *   that mounted the hook). Used for both the return URL sent to Stripe and the
 *   `router.replace` that strips the `?stripe=` param after handling it.
 */
export function useCreatorPayouts(returnPath: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState<CreatorBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [bankConnectedOverride, setBankConnectedOverride] = useState<boolean | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);

  const refreshBalance = useCallback(() => {
    return cashApi.creatorBalance().then(setBalance).catch(() => {});
  }, []);

  const refreshStripeStatus = useCallback(() => {
    return stripeConnectApi.accountStatus().then((res) => setStripeStatus(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.creator) return;
    refreshBalance().finally(() => setBalanceLoading(false));
    if (user.creator.bank_connected) refreshStripeStatus();
  }, [user, refreshBalance, refreshStripeStatus]);

  // Handle the Stripe onboarding return redirect.
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (!stripeParam) return;
    router.replace(returnPath, { scroll: false });
    if (stripeParam === 'complete') {
      toast('Bank setup complete! Verifying your account status…', 'success');
      refreshStripeStatus();
    } else if (stripeParam === 'refresh') {
      toast('Onboarding link expired — click "Continue setup" to try again.', 'error');
    }
  }, [searchParams, router, toast, returnPath, refreshStripeStatus]);

  const handleConnectBank = useCallback(async () => {
    if (stripeLoading) return;
    setStripeLoading(true);
    try {
      const returnUrl  = `${window.location.origin}${returnPath}?stripe=complete`;
      const refreshUrl = `${window.location.origin}${returnPath}?stripe=refresh`;
      const res = await stripeConnectApi.createAccount(returnUrl, refreshUrl);
      window.location.href = res.data.onboarding_url;
    } catch {
      toast('Failed to start bank connection. Please try again.', 'error');
      setStripeLoading(false);
    }
  }, [stripeLoading, toast, returnPath]);

  const handleContinueOnboarding = useCallback(async () => {
    if (stripeLoading) return;
    setStripeLoading(true);
    try {
      const returnUrl  = `${window.location.origin}${returnPath}?stripe=complete`;
      const refreshUrl = `${window.location.origin}${returnPath}?stripe=refresh`;
      const res = await stripeConnectApi.onboardingLink(returnUrl, refreshUrl);
      window.location.href = res.data.onboarding_url;
    } catch {
      toast('Failed to generate setup link. Please try again.', 'error');
      setStripeLoading(false);
    }
  }, [stripeLoading, toast, returnPath]);

  const handleDisconnect = useCallback(async () => {
    if (stripeLoading) return;
    setStripeLoading(true);
    try {
      await stripeConnectApi.disconnect();
      setStripeStatus(null);
      setBankConnectedOverride(false);
      setShowDisconnectConfirm(false);
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
      refreshBalance();
      w9Api.status().catch(() => {});
    } catch (err: unknown) {
      const e = err as { message?: string; requires_w9?: boolean; requires_w8ben?: boolean; requires_location?: boolean };
      if (e.requires_location) {
        toast('Please set your location on your profile before withdrawing.', 'error');
      } else if (e.requires_w8ben) {
        w8benApi.status().catch(() => {});
        toast('A W-8BEN is required before this withdrawal.', 'error');
      } else if (e.requires_w9) {
        w9Api.status().catch(() => {});
        toast('A W-9 is required before this withdrawal.', 'error');
      } else {
        toast(e.message ?? 'Payout failed. Please try again.', 'error');
      }
    } finally {
      setWithdrawLoading(false);
    }
  }, [withdrawAmount, toast, refreshBalance]);

  const creator        = user?.creator ?? null;
  const bankConnected  = bankConnectedOverride ?? (creator?.bank_connected ?? false);
  const payoutsEnabled = stripeStatus?.payouts_enabled === true;
  const payoutHold     = creator?.payout_hold === true;
  const canWithdraw    = payoutsEnabled && !payoutHold;
  const needsLocation  = !user?.location_complete;

  return {
    balance,
    balanceLoading,
    refreshBalance,
    stripeStatus,
    stripeLoading,
    // Derived bank state
    bankConnected,
    payoutsEnabled,
    payoutHold,
    canWithdraw,
    needsLocation,
    // Bank handlers
    handleConnectBank,
    handleContinueOnboarding,
    handleDisconnect,
    showDisconnectConfirm,
    setShowDisconnectConfirm,
    // Withdraw flow
    withdrawAmount,
    setWithdrawAmount,
    withdrawConfirm,
    setWithdrawConfirm,
    withdrawLoading,
    handleWithdraw,
  };
}

export type CreatorPayouts = ReturnType<typeof useCreatorPayouts>;
