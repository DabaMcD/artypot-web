'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pots as potsApi, billing, votives as votivesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Pot, CashBalance, PaginatedResponse, PaymentMethod, PublicUserVotive } from '@/lib/types';
import PotCard from '@/components/PotCard';
import PaymentMethodManager from '@/components/PaymentMethodManager';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { ROLE_TEXT_CLASSES, ROLE_LABELS } from '@/lib/theme';
import type { RoleKey } from '@/lib/theme';

// Small info-tooltip component (reused for creator metrics)
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [myPots, setMyPots] = useState<PaginatedResponse<Pot> | null>(null);
  const [cash, setCash] = useState<CashBalance | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [myVotives, setMyVotives] = useState<PublicUserVotive[]>([]);
  const [totalActiveVotiveAmount, setTotalActiveVotiveAmount] = useState<number>(0);

  const [potsLoading, setPotsLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(true);
  const [votivesLoading, setVotivesLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

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

    votivesApi
      .list({ sort: 'date', page: 1 })
      .then((res) => {
        setMyVotives(res.data);
        setTotalActiveVotiveAmount(res.total_active_amount ?? 0);
      })
      .catch(() => {})
      .finally(() => setVotivesLoading(false));

  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-4">
        <div className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  const roleColor = ROLE_TEXT_CLASSES[user.role as RoleKey];
  const roleLabel = ROLE_LABELS[user.role as RoleKey];

  const isCreator = (user.role === 'creator' || user.role === 'council') && !!user.creator;

  // balance is negative when the user owes money (locked fan charges not yet billed)
  const balance = Number(cash?.balance ?? 0);
  const balanceIsNegative = balance < 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {!user.email_verified_at && <EmailVerificationBanner email={user.email} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <p className={`text-sm font-medium mt-0.5 ${roleColor}`}>
            {user.name.split(' ')[0]} · {roleLabel}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/users/${user.id}`}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            View public profile →
          </Link>
          <Link
            href="/bounties/new"
            className="bg-fan text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-fan-dim transition-colors"
          >
            + New Bounty
          </Link>
        </div>
      </div>

      {/* ── Fan metric cards ─────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {/* Total Votives */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Total Committed</div>
          {votivesLoading ? (
            <div className="h-8 w-24 bg-surface-2 animate-pulse rounded" />
          ) : (
            <>
              <div className="text-2xl font-bold text-fan">
                ${totalActiveVotiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted mt-1">across open &amp; approved bounties</div>
            </>
          )}
        </div>

        {/* Balance */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Balance</div>
          {cashLoading ? (
            <div className="h-8 w-24 bg-surface-2 animate-pulse rounded" />
          ) : (
            <>
              <div className={`text-2xl font-bold ${balanceIsNegative ? 'text-red-400' : 'text-foreground'}`}>
                {balanceIsNegative ? '-' : ''}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted mt-1">
                {balanceIsNegative ? (
                  <Link href="/billing" className="text-red-400 hover:underline">Outstanding — pay now →</Link>
                ) : 'No outstanding balance'}
              </div>
            </>
          )}
        </div>

        {/* Total Given */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Total Given</div>
          <div className="text-2xl font-bold text-foreground">
            ${Number(user.total_given ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted mt-1">lifetime payments made</div>
        </div>
      </div>

      {/* ── Creator Profile box ──────────────────────────────────────────────── */}
      {isCreator && (
        <div className="bg-creator/5 border border-creator/30 rounded-xl p-5 mb-8">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-creator font-semibold mb-0.5">Your Creator Profile</div>
              <div className="text-foreground font-bold text-lg">{user.creator!.display_name}</div>
            </div>
            <Link
              href={`/creators/${user.creator!.id}`}
              className="shrink-0 text-sm text-creator border border-creator/30 px-4 py-2 rounded-lg hover:bg-creator/10 transition-colors"
            >
              View Profile
            </Link>
          </div>

          {/* Creator metric row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-creator/20">
            <div>
              <div className="text-xs text-muted tracking-wider mb-1 flex items-center">
                OPEN BACKING
                <InfoTip content="Total committed by fans to your open or submitted bounties. Nothing is charged yet — it locks in once the Council approves." />
              </div>
              <div className="text-xl font-bold text-foreground">
                ${Number(user.creator!.total_votive_sum ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted tracking-wider mb-1 flex items-center">
                PENDING PAYMENT
                <InfoTip content="Fan obligations locked on council-approved bounties, not yet billed. Fans have up to 50 days to pay or declare broke." />
              </div>
              <div className="text-xl font-bold text-amber-400">
                ${Number(user.creator!.pending_votive_total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted tracking-wider mb-1 flex items-center">
                TOTAL EARNED
                <InfoTip content="Lifetime earnings credited to your wallet — all fan payments collected via Stripe, including amounts still in clearing or available to withdraw." />
              </div>
              <div className="text-xl font-bold text-creator">
                ${Number(user.creator!.amount_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <Link href="/cash" className="text-xs text-creator/70 hover:text-creator transition-colors">
                View wallet →
              </Link>
            </div>
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

      {/* My Votives */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">What I&apos;m Backing</h2>
          <Link href="/pledges" className="text-sm text-muted hover:text-fan transition-colors">
            View all →
          </Link>
        </div>

        {votivesLoading ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0">
                <div className="h-4 w-48 bg-surface-2 animate-pulse rounded" />
                <div className="h-4 w-16 bg-surface-2 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : myVotives.length === 0 ? (
          <div className="text-center py-10 text-muted border border-dashed border-border rounded-xl">
            Not backing anything yet.{' '}
            <Link href="/bounties" className="text-fan hover:underline">Browse bounties</Link>
            {' '}to get started.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {myVotives.slice(0, 5).map((votive, i) => (
              <div
                key={votive.id}
                className={`flex items-center justify-between px-5 py-3.5 ${i < Math.min(myVotives.length, 5) - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  {votive.pot ? (
                    <Link
                      href={`/bounties/${votive.pot_id}`}
                      className="text-sm text-foreground hover:text-fan transition-colors font-medium truncate block"
                    >
                      {votive.pot.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">Project #{votive.pot_id}</span>
                  )}
                  {votive.expires_at && (
                    <p className="text-xs text-muted mt-0.5">
                      Expires{' '}
                      {new Date(votive.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <span className="text-fan font-semibold text-sm ml-4">
                  ${Number(votive.amount).toFixed(2)}
                </span>
              </div>
            ))}
            {myVotives.length > 5 && (
              <div className="px-5 py-3 border-t border-border">
                <Link href="/pledges" className="text-sm text-muted hover:text-fan transition-colors">
                  +{myVotives.length - 5} more — View all →
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
                      href={`/bounties/${entry.pot.id}`}
                      className="text-xs text-muted hover:text-fan transition-colors"
                    >
                      {entry.pot.title}
                    </Link>
                  )}
                </div>
                <div className={`font-semibold text-sm ${Number(entry.amount) < 0 ? 'text-red-400' : 'text-fan'}`}>
                  {Number(entry.amount) < 0 ? '-' : '+'}${Math.abs(Number(entry.amount)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse Pots */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Browse Bounties</h2>
          <Link href="/bounties" className="text-sm text-muted hover:text-fan transition-colors">
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
            No bounties yet.{' '}
            <Link href="/bounties/new" className="text-fan hover:underline">Create one</Link>
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
