'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pots as potsApi, billing, pledges as pledgesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Pot, CashBalance, PaginatedResponse, PaymentMethod, PublicUserBid } from '@/lib/types';
import PotCard from '@/components/PotCard';
import PaymentMethodManager from '@/components/PaymentMethodManager';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [myPots, setMyPots] = useState<PaginatedResponse<Pot> | null>(null);
  const [cash, setCash] = useState<CashBalance | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [myPledges, setMyPledges] = useState<PublicUserBid[]>([]);
  const [potsLoading, setPotsLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(true);
  const [pledgesLoading, setPledgesLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    // Load pots where user is initiator (we use their bids as proxy for "their activity")
    potsApi
      .list({ page: 1 })
      .then(setMyPots)
      .catch(() => {})
      .finally(() => setPotsLoading(false));

    billing
      .cash()
      .then(setCash)
      .catch(() => {})
      .finally(() => setCashLoading(false));

    pledgesApi
      .list({ sort: 'date', page: 1 })
      .then((res) => setMyPledges(res.data))
      .catch(() => {})
      .finally(() => setPledgesLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-4">
        <div className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  const roleColor =
    user.role === 'council' ? 'text-council' : user.role === 'summoned' ? 'text-creator' : 'text-brand';

  const roleLabel =
    user.role === 'council' ? 'The Council' : user.role === 'summoned' ? 'The Summoned' : 'The Mob';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className={`text-sm font-medium mt-0.5 ${roleColor}`}>{roleLabel}</p>
        </div>
        <Link
          href="/pots/new"
          className="shrink-0 bg-brand text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-brand-dim transition-colors"
        >
          + New Pot
        </Link>
      </div>

      {/* Balance card */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Available Balance</div>
          {cashLoading ? (
            <div className="h-8 w-24 bg-surface-2 animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold text-brand">
              ${Number(cash?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Pending</div>
          {cashLoading ? (
            <div className="h-8 w-24 bg-surface-2 animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              ${Number(cash?.pending_total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Total Given</div>
          <div className="text-2xl font-bold text-foreground">
            ${Number(user.total_given ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Creator section */}
      {(user.role === 'summoned' || user.role === 'council') && user.summon && (
        <div className="bg-creator/5 border border-creator/30 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-creator font-semibold mb-1">Your Creator Profile</div>
              <div className="text-foreground font-bold text-lg">{user.summon.display_name}</div>
            </div>
            <Link
              href={`/summons/${user.summon.id}`}
              className="text-sm text-creator border border-creator/30 px-4 py-2 rounded-lg hover:bg-creator/10 transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>
      )}

      {/* Admin quick link */}
      {user.role === 'council' && (
        <div className="bg-council/5 border border-council/30 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-council font-semibold mb-1">Admin Panel</div>
              <div className="text-muted text-sm">Manage claims, completions, and billing runs.</div>
            </div>
            <Link
              href="/admin"
              className="text-sm text-council border border-council/30 px-4 py-2 rounded-lg hover:bg-council/10 transition-colors"
            >
              Go to Admin
            </Link>
          </div>
        </div>
      )}

      {/* Payment methods */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Payment Methods</h2>
          <Link href="/billing" className="text-sm text-muted hover:text-brand transition-colors">
            Manage →
          </Link>
        </div>
        {paymentMethods.length === 0 ? (
          <div className="bg-surface border border-brand/30 rounded-xl p-5">
            <p className="text-sm text-muted mb-3">
              No payment methods saved. Add one to start backing pots.
            </p>
            <PaymentMethodManager
              onMethodsChange={setPaymentMethods}
              compact
            />
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-5">
            <PaymentMethodManager
              onMethodsChange={setPaymentMethods}
            />
          </div>
        )}
      </div>

      {/* My Pledges */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">My Pledges</h2>
          <Link href="/pledges" className="text-sm text-muted hover:text-brand transition-colors">
            View all →
          </Link>
        </div>

        {pledgesLoading ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0">
                <div className="h-4 w-48 bg-surface-2 animate-pulse rounded" />
                <div className="h-4 w-16 bg-surface-2 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : myPledges.length === 0 ? (
          <div className="text-center py-10 text-muted border border-dashed border-border rounded-xl">
            No active pledges.{' '}
            <Link href="/pots" className="text-brand hover:underline">Browse pots</Link>
            {' '}to start backing projects.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {myPledges.slice(0, 5).map((bid, i) => (
              <div
                key={bid.id}
                className={`flex items-center justify-between px-5 py-3.5 ${i < Math.min(myPledges.length, 5) - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  {bid.pot ? (
                    <Link
                      href={`/pots/${bid.pot_id}`}
                      className="text-sm text-foreground hover:text-brand transition-colors font-medium truncate block"
                    >
                      {bid.pot.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">Project #{bid.pot_id}</span>
                  )}
                  {bid.expires_at && (
                    <p className="text-xs text-muted mt-0.5">
                      Expires{' '}
                      {new Date(bid.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <span className="text-brand font-semibold text-sm ml-4">
                  ${Number(bid.amount).toFixed(2)}
                </span>
              </div>
            ))}
            {myPledges.length > 5 && (
              <div className="px-5 py-3 border-t border-border">
                <Link href="/pledges" className="text-sm text-muted hover:text-brand transition-colors">
                  +{myPledges.length - 5} more — View all pledges →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent cash transactions */}
      {cash && cash.available.data.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Recent Transactions</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {cash.available.data.slice(0, 5).map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-5 py-3.5 ${i < cash.available.data.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div>
                  <div className="text-sm text-foreground">{entry.description}</div>
                  {entry.pot && (
                    <Link
                      href={`/pots/${entry.pot.id}`}
                      className="text-xs text-muted hover:text-brand transition-colors"
                    >
                      {entry.pot.title}
                    </Link>
                  )}
                </div>
                <div className="text-brand font-semibold text-sm">
                  +${Number(entry.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent pots */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Browse Pots</h2>
          <Link href="/pots" className="text-sm text-muted hover:text-brand transition-colors">
            View all →
          </Link>
        </div>

        {potsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !myPots || myPots.data.length === 0 ? (
          <div className="text-center py-12 text-muted border border-dashed border-border rounded-xl">
            No pots yet.{' '}
            <Link href="/pots/new" className="text-brand hover:underline">
              Create one
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPots.data.slice(0, 6).map((pot) => (
              <PotCard key={pot.id} pot={pot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
