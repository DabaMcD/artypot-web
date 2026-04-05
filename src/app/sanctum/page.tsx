'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { cash as cashApi, plaid as plaidApi, withdrawals as withdrawalsApi, form1099 as form1099Api } from '@/lib/api';
import type { SummonBalance, Form1099StatusResponse } from '@/lib/types';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Plaid: any;
  }
}

function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Plaid) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Plaid Link'));
    document.head.appendChild(script);
  });
}

export default function SanctumPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [balance, setBalance] = useState<SummonBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Plaid state — null means "not yet initialised from server data"
  const [plaidLinkedOverride, setPlaidLinkedOverride] = useState<boolean | null>(null);
  const [plaidLinking, setPlaidLinking] = useState(false);

  // True if the backend says the account is connected OR we just connected it this session.
  const plaidLinked = plaidLinkedOverride ?? user?.summon?.bank_connected ?? false;

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);

  // 1099-K state
  const [form1099Status, setForm1099Status] = useState<Form1099StatusResponse | null>(null);
  const [form1099Loading, setForm1099Loading] = useState(false);
  const [filingUrlLoading, setFilingUrlLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && !user.summon) router.push('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.summon) return;

    cashApi
      .summonBalance()
      .then(setBalance)
      .catch(() => {})

    form1099Api
      .status()
      .then((res) => setForm1099Status(res.data))
      .catch(() => {})
      .finally(() => setBalanceLoading(false));

    // bank_connected comes from /me (MeController appends it); no local override needed on load.
  }, [user]);

  const handleConnectBank = useCallback(async () => {
    if (plaidLinking) return;
    setPlaidLinking(true);
    try {
      await loadPlaidScript();
      const res = await plaidApi.linkToken();
      const linkToken = res.data.link_token;

      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string) => {
          try {
            await plaidApi.exchange(publicToken);
            setPlaidLinkedOverride(true);
            toast('Bank account connected!', 'success');
          } catch {
            toast('Failed to link bank account. Please try again.', 'error');
          } finally {
            setPlaidLinking(false);
          }
        },
        onExit: () => {
          setPlaidLinking(false);
        },
        onEvent: () => {},
      });
      handler.open();
    } catch {
      toast('Failed to start bank connection flow.', 'error');
      setPlaidLinking(false);
    }
  }, [plaidLinking, toast]);

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
      cashApi.summonBalance().then(setBalance).catch(() => {});
      form1099Api.status().then((res) => setForm1099Status(res.data)).catch(() => {});
    } catch (err: unknown) {
      const e = err as { message?: string; requires_1099?: boolean };
      if (e.requires_1099) {
        // Refresh 1099 status so the section below lights up
        form1099Api.status().then((res) => setForm1099Status(res.data)).catch(() => {});
        toast('A 1099-K is required before this withdrawal. See below.', 'error');
      } else {
        toast(e.message ?? 'Payout failed. Please try again.', 'error');
      }
    } finally {
      setWithdrawLoading(false);
    }
  }, [withdrawAmount, toast]);

  const handleGetFilingUrl = useCallback(async () => {
    setFilingUrlLoading(true);
    try {
      const res = await form1099Api.filingUrl();
      // Open in a new tab
      window.open(res.data.filing_url, '_blank', 'noopener,noreferrer');
      // Refresh status
      form1099Api.status().then((r) => setForm1099Status(r.data)).catch(() => {});
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to get 1099 filing link. Please try again.', 'error');
    } finally {
      setFilingUrlLoading(false);
    }
  }, [toast]);

  if (authLoading || !user || !user.summon) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <div className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  const summon = user.summon;
  const availableBalance = balance?.available_balance ?? 0;
  const pendingEarnings = balance?.pending_earnings ?? 0;
  const recentTransactions = balance?.available?.data?.slice(0, 5) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-creator/70 uppercase tracking-widest font-medium mb-1">Summon Sanctum</p>
          <h1 className="text-2xl font-bold text-foreground">{summon.display_name}</h1>
        </div>
        <Link
          href={`/summons/${summon.id}`}
          className="shrink-0 text-sm text-creator border border-creator/30 px-4 py-2 rounded-lg hover:bg-creator/10 transition-colors"
        >
          Public Profile →
        </Link>
      </div>

      {/* Earnings metrics */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {/* Open Votives */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
            Open Votives
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${Number(summon.total_votive_sum ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted mt-1">pledged on open &amp; submitted pots</div>
        </div>

        {/* Pending Votives */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
            Pending Votives
          </div>
          <div className="text-2xl font-bold text-amber-400">
            ${Number(summon.pending_votive_total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted mt-1">locked on approved pots, not yet collected</div>
        </div>

        {/* Total Earned */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
            Total Earned
          </div>
          <div className="text-2xl font-bold text-creator">
            ${Number(summon.amount_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted mt-1">confirmed Stripe-collected payments</div>
        </div>
      </div>

      {/* Wallet */}
      <div className="bg-creator/5 border border-creator/30 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Wallet</h2>
          <Link href="/cash" className="text-sm text-creator/70 hover:text-creator transition-colors">
            Full ledger →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-muted uppercase tracking-wider mb-1">Available Balance</div>
            {balanceLoading ? (
              <div className="h-7 w-28 bg-surface-2 animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-creator">
                ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted uppercase tracking-wider mb-1">Incoming (unbilled)</div>
            {balanceLoading ? (
              <div className="h-7 w-28 bg-surface-2 animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-amber-400">
                ${pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>

        {!balanceLoading && recentTransactions.length > 0 && (
          <div className="border-t border-creator/20 pt-4">
            <div className="text-xs text-muted uppercase tracking-wider mb-2">Recent Transactions</div>
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
          </div>
        )}

        {/* Payout */}
        <div className="border-t border-creator/20 pt-5 mt-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-3">Request Payout</div>

          {!plaidLinked ? (
            <p className="text-sm text-muted">
              Connect a bank account above to withdraw your balance.
            </p>
          ) : availableBalance <= 0 ? (
            <p className="text-sm text-muted">
              Nothing to withdraw yet — your balance is{' '}
              <span className="text-foreground font-medium">
                ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>.
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
                  className="bg-surface border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-creator/60 transition-colors w-36"
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
      </div>

      {/* Bank Connection */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground mb-1">Bank Account</h2>
            <p className="text-sm text-muted leading-relaxed">
              Connect a bank account to receive withdrawals. Artypot uses Plaid for secure,
              direct bank linking — your credentials are never stored.
            </p>
          </div>
          {plaidLinked === true && (
            <span className="shrink-0 text-xs font-semibold text-creator bg-creator/10 border border-creator/30 px-2.5 py-1 rounded-full">
              Connected
            </span>
          )}
        </div>

        <div className="mt-4">
          {plaidLinked === true ? (
            <button
              onClick={handleConnectBank}
              disabled={plaidLinking}
              className="text-sm text-muted border border-border px-4 py-2 rounded-lg hover:border-creator/40 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {plaidLinking ? 'Opening Plaid…' : 'Re-link bank account'}
            </button>
          ) : (
            <button
              onClick={handleConnectBank}
              disabled={plaidLinking}
              className="bg-creator text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {plaidLinking ? 'Opening Plaid…' : 'Connect bank account'}
            </button>
          )}
        </div>
      </div>

      {/* 1099-K Tax Compliance */}
      {form1099Status && (form1099Status.requires_1099 || (form1099Status.record && !form1099Status.record.qualifies)) && (
        <div className={`border rounded-xl p-5 mb-8 ${
          form1099Status.record?.qualifies
            ? 'bg-creator/5 border-creator/30'
            : 'bg-amber-900/10 border-amber-700/40'
        }`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-base font-bold text-foreground mb-1">
                {form1099Status.record?.qualifies ? '✓ 1099-K On File' : '⚠ 1099-K Required'}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {form1099Status.record?.qualifies
                  ? `Your ${form1099Status.tax_year} 1099-K has been received. You're all set to withdraw.`
                  : `Your total ${form1099Status.tax_year} payouts ($${form1099Status.ytd_withdrawals.toFixed(2)}) meet or will meet the $${form1099Status.threshold.toFixed(0)} reporting threshold. Complete your 1099-K with TaxBandits before withdrawing.`
                }
              </p>
            </div>
            {form1099Status.record && (
              <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                form1099Status.record.status === 'accepted'  ? 'text-creator bg-creator/10 border-creator/30' :
                form1099Status.record.status === 'submitted' ? 'text-blue-400 bg-blue-900/20 border-blue-700/40' :
                form1099Status.record.status === 'completed' ? 'text-green-400 bg-green-900/20 border-green-700/40' :
                form1099Status.record.status === 'rejected'  ? 'text-red-400 bg-red-900/20 border-red-700/40' :
                'text-amber-400 bg-amber-900/20 border-amber-700/40'
              }`}>
                {form1099Status.record.status.charAt(0).toUpperCase() + form1099Status.record.status.slice(1)}
              </span>
            )}
          </div>

          {!form1099Status.record?.qualifies && (
            <div className="mt-3">
              {form1099Status.record?.status === 'rejected' && (
                <p className="text-sm text-red-400 mb-3">
                  Your previous submission was rejected by the IRS. Please re-submit.
                </p>
              )}
              <button
                onClick={handleGetFilingUrl}
                disabled={filingUrlLoading || form1099Loading}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {filingUrlLoading
                  ? 'Loading…'
                  : form1099Status.record
                    ? 'Continue 1099-K →'
                    : 'Start 1099-K with TaxBandits →'
                }
              </button>
              <p className="text-xs text-muted mt-2">
                Opens TaxBandits in a new tab. Return here once complete — withdrawals unlock automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/pots/new"
          className="bg-surface border border-border rounded-xl p-4 hover:border-brand/40 transition-colors group"
        >
          <div className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors mb-0.5">
            + New Pot
          </div>
          <div className="text-xs text-muted">Start a new project for your fans to back</div>
        </Link>
        <Link
          href={`/summons/${summon.id}`}
          className="bg-surface border border-border rounded-xl p-4 hover:border-creator/40 transition-colors group"
        >
          <div className="text-sm font-semibold text-foreground group-hover:text-creator transition-colors mb-0.5">
            View Public Profile
          </div>
          <div className="text-xs text-muted">See your summon page as fans see it</div>
        </Link>
      </div>
    </div>
  );
}
