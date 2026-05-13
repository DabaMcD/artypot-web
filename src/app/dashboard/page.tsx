'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pots as potsApi, billing, votives as votivesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Pot, CashBalance, PaginatedResponse, PublicUserVotive } from '@/lib/types';
import PotCard from '@/components/PotCard';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';

const STATUS_LABELS: Record<string, string> = {
  open:      'Open',
  completed: 'Submitted',
  approved:  'Approved',
  paid_out:  'Paid Out',
  revoked:   'Revoked',
};

const STATUS_COLORS: Record<string, string> = {
  open:      'bg-surface-2 text-muted border border-border',
  completed: 'bg-blue-900/40 text-blue-400 border border-blue-800/50',
  approved:  'bg-fan/10 text-fan border border-fan/20',
  paid_out:  'bg-creator/10 text-creator border border-creator/20',
  revoked:   'bg-red-900/40 text-red-400 border border-red-800/50',
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [myPots, setMyPots] = useState<PaginatedResponse<Pot> | null>(null);
  const [cash, setCash] = useState<CashBalance | null>(null);
  const [myVotives, setMyVotives] = useState<PublicUserVotive[]>([]);
  const [totalActiveVotiveAmount, setTotalActiveVotiveAmount] = useState<number>(0);
  const [revoking, setRevoking] = useState<Set<number>>(new Set());

  const [potsLoading, setPotsLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(true);
  const [votivesLoading, setVotivesLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadVotives = useCallback(() => {
    setVotivesLoading(true);
    votivesApi
      .list({ sort: 'date', page: 1 })
      .then((res) => {
        setMyVotives(res.data);
        setTotalActiveVotiveAmount(res.total_active_amount ?? 0);
      })
      .catch(() => {})
      .finally(() => setVotivesLoading(false));
  }, []);

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

    loadVotives();
  }, [user, loadVotives]);

  const handleRevoke = useCallback(async (votive: PublicUserVotive) => {
    if (revoking.has(votive.id)) return;
    setRevoking((prev) => new Set(prev).add(votive.id));
    try {
      await potsApi.removeVotive(votive.pot_id, votive.id);
      loadVotives();
      billing.cash().then(setCash).catch(() => {});
    } catch {
      // ignore
    } finally {
      setRevoking((prev) => { const s = new Set(prev); s.delete(votive.id); return s; });
    }
  }, [revoking, loadVotives]);

  if (authLoading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-4">
        <div className="h-12 w-64 bg-surface animate-pulse rounded-xl" />
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-40 bg-surface border border-border rounded-xl animate-pulse" />
            <div className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const isCreator = (user.role === 'creator' || user.role === 'council') && !!user.creator;
  const balance = Number(cash?.balance ?? 0);
  const balanceIsNegative = balance < 0;
  const outstandingAmount = balanceIsNegative ? Math.abs(balance) : 0;

  // Derive unique creators from votives (API may or may not populate creator on pot)
  const followedCreators = myVotives.reduce<Array<{ id: number; display_name: string }>>((acc, v) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creator = (v.pot as any)?.creator;
    if (creator && !acc.find((c) => c.id === creator.id)) acc.push(creator);
    return acc;
  }, []);

  // Next billing date: 24th of this month, or next month if we've passed it
  const now = new Date();
  const nextBilling = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 24 ? 1 : 0), 24);
  const nextBillingStr = nextBilling.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Active votives (not paid out or revoked)
  const activeVotives = myVotives.filter((v) => v.pot?.status !== 'revoked' && v.pot?.status !== 'paid_out');

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {!user.email_verified_at && <EmailVerificationBanner email={user.email} />}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Your Contributions</h1>
          <p className="text-sm text-muted mt-0.5">
            {user.name.split(' ')[0]} · backing work you want made.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/bounties" className="text-sm text-muted hover:text-foreground transition-colors">
            Browse bounties →
          </Link>
          <Link
            href="/bounties/new"
            className="bg-fan text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-fan-dim transition-colors"
          >
            + New Bounty
          </Link>
        </div>
      </div>

      {/* ── Billing banner (shown when there's an outstanding balance) ────── */}
      {!cashLoading && balanceIsNegative && (
        <div className="border border-fan/30 bg-fan/5 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground">
            <strong className="text-fan">Billing on {nextBillingStr}</strong>
            {' '}— you&apos;ll be charged{' '}
            <strong>${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            {' '}across approved bounties.{' '}
            <Link href="/billing" className="text-fan/80 hover:text-fan underline">
              See breakdown →
            </Link>
          </p>
          <Link
            href="/billing"
            className="shrink-0 bg-fan text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-fan-dim transition-colors"
          >
            Pay now
          </Link>
        </div>
      )}

      {/* ── Main fan grid ─────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6 mb-8">

        {/* LEFT — active contributions + followed creators */}
        <div className="space-y-4">

          {/* Active contributions list */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Active Contributions
              </h2>
              <Link href="/pledges" className="text-xs text-muted hover:text-fan transition-colors">
                View all →
              </Link>
            </div>

            {votivesLoading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-52 bg-surface-2 animate-pulse rounded" />
                      <div className="h-3 w-20 bg-surface-2 animate-pulse rounded" />
                    </div>
                    <div className="h-5 w-14 bg-surface-2 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : activeVotives.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">
                Not backing anything yet.{' '}
                <Link href="/bounties" className="text-fan hover:underline">Browse bounties</Link>
                {' '}to get started.
              </div>
            ) : (
              <div>
                {activeVotives.slice(0, 8).map((votive, i) => {
                  const status = votive.pot?.status;
                  const canRevoke = status === 'open';
                  return (
                    <div
                      key={votive.id}
                      className={`flex items-center gap-3 px-5 py-3.5 ${i < Math.min(activeVotives.length, 8) - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        {votive.pot ? (
                          <Link
                            href={`/bounties/${votive.pot_id}`}
                            className="text-sm font-medium text-foreground hover:text-fan transition-colors truncate block"
                          >
                            {votive.pot.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted">Bounty #{votive.pot_id}</span>
                        )}
                        {status && (
                          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[status] ?? 'text-muted'}`}>
                            {STATUS_LABELS[status] ?? status}
                          </span>
                        )}
                      </div>

                      <span className="text-fan font-bold text-sm shrink-0 font-mono tabular-nums">
                        ${Number(votive.amount).toFixed(2)}
                      </span>

                      {canRevoke && (
                        <button
                          onClick={() => handleRevoke(votive)}
                          disabled={revoking.has(votive.id)}
                          className="text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                          title="Back out of this commitment"
                        >
                          {revoking.has(votive.id) ? '…' : 'revoke'}
                        </button>
                      )}
                    </div>
                  );
                })}
                {activeVotives.length > 8 && (
                  <div className="px-5 py-3 border-t border-border">
                    <Link href="/pledges" className="text-sm text-muted hover:text-fan transition-colors">
                      +{activeVotives.length - 8} more — View all →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Creators you're backing */}
          <div className="border border-dashed border-border rounded-xl p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Creators You&apos;re Backing
            </h2>
            {votivesLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-7 w-24 bg-surface-2 animate-pulse rounded-full" />)}
              </div>
            ) : followedCreators.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {followedCreators.map((creator) => (
                  <Link
                    key={creator.id}
                    href={`/creators/${creator.id}`}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-full text-sm text-foreground hover:border-fan/40 hover:text-fan transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-fan/20 text-fan text-[9px] font-bold flex items-center justify-center shrink-0">
                      {creator.display_name.charAt(0).toUpperCase()}
                    </span>
                    {creator.display_name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted leading-relaxed">
                Artypot is creator-centric — you find creators by name or direct link, not through a feed.{' '}
                <Link href="/bounties" className="text-fan hover:underline">Browse open bounties</Link>
                {' '}to discover work you want to see made.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — billing sidebar */}
        <div className="space-y-4">

          {/* Billing at a glance */}
          <div className="border border-border rounded-xl p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Billing at a Glance
            </h2>
            <div className="text-xs text-muted uppercase tracking-wider mb-1">Total committed</div>
            {votivesLoading ? (
              <div className="h-9 w-28 bg-surface-2 animate-pulse rounded mb-1" />
            ) : (
              <div className="text-3xl font-bold font-mono tabular-nums text-fan">
                ${totalActiveVotiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )}
            <div className="text-xs text-muted mt-1">
              {!cashLoading && balanceIsNegative
                ? <><span className="text-amber-400 font-medium">${outstandingAmount.toFixed(2)} outstanding</span> · due {nextBillingStr}</>
                : `next billing · ${nextBillingStr}`}
            </div>

          </div>

          {/* Payment method */}
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Payment
              </h2>
              <Link href="/billing" className="text-xs text-muted hover:text-fan transition-colors">
                Manage →
              </Link>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-3">
              View saved cards and manage your monthly billing.
            </p>
            <Link
              href="/billing"
              className="text-xs border border-border text-muted px-3 py-1.5 rounded-lg hover:border-fan/40 hover:text-fan transition-colors inline-block"
            >
              Go to Billing →
            </Link>
          </div>

          {/* Lifetime total */}
          <div className="border border-border rounded-xl p-4">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">Lifetime Backed</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              ${Number(user.total_given ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted mt-0.5">total payments made</div>
          </div>
        </div>
      </div>

      {/* ── Creator profile (if creator) ──────────────────────────────────── */}
      {isCreator && (
        <div className="bg-creator/5 border border-creator/30 rounded-xl p-5 mb-8">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-creator font-semibold mb-0.5">Your Creator Profile</div>
              <div className="text-foreground font-bold text-lg">{user.creator!.display_name}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/sanctum"
                className="text-sm text-creator border border-creator/30 px-4 py-2 rounded-lg hover:bg-creator/10 transition-colors"
              >
                Sanctum →
              </Link>
              <Link
                href={`/creators/${user.creator!.id}`}
                className="text-sm text-muted border border-border px-4 py-2 rounded-lg hover:border-creator/30 transition-colors"
              >
                Public Profile
              </Link>
            </div>
          </div>

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
                <InfoTip content="Lifetime earnings credited to your wallet — including amounts still clearing or available to withdraw." />
              </div>
              <div className="text-xl font-bold text-creator">
                ${Number(user.creator!.amount_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <Link href="/sanctum" className="text-xs text-creator/70 hover:text-creator transition-colors">
                Manage earnings →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Council quick link */}
      {user.role === 'council' && (
        <div className="bg-council/5 border border-council/30 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-council font-semibold mb-1">Council Chamber</div>
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

      {/* Browse Bounties */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-foreground">Browse Bounties</h2>
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
            <Link href="/bounties/new" className="text-fan hover:underline">Create the first one</Link>
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
