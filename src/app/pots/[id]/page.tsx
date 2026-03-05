'use client';

import { useState, useEffect, use, FormEvent } from 'react';
import Link from 'next/link';
import { pots as potsApi, billing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Pot, PotBid, PaymentMethod } from '@/lib/types';
import AddCardForm from '@/components/AddCardForm';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  completed: 'Submitted',
  approved: 'Approved',
  paid_out: 'Paid Out',
  revoked: 'Revoked',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-900/40 text-green-400 border-green-800/50',
  completed: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
  approved: 'bg-creator/10 text-creator border-creator/30',
  paid_out: 'bg-council/10 text-council border-council/30',
  revoked: 'bg-red-900/40 text-red-400 border-red-800/50',
};

export default function PotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [pot, setPot] = useState<Pot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment method gate — null means "still loading"
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[] | null>(null);
  const [pmLoading, setPmLoading] = useState(false);

  // Bid form
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidSuccess, setBidSuccess] = useState('');

  // Completion form
  const [showCompletion, setShowCompletion] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [completionLoading, setCompletionLoading] = useState(false);

  // Load pot
  useEffect(() => {
    potsApi
      .get(Number(id))
      .then((res) => setPot(res.data))
      .catch(() => setError('Failed to load pot.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Load payment methods when the pot is open and user is logged in
  useEffect(() => {
    if (!user || !pot || pot.status !== 'open') return;
    setPmLoading(true);
    billing
      .paymentMethods()
      .then((res) => setPaymentMethods(res.data))
      .catch(() => setPaymentMethods([]))
      .finally(() => setPmLoading(false));
  }, [user, pot?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeBids = pot?.bids?.filter((b) => !b.revoked_at) ?? [];
  const userBid = user ? activeBids.find((b) => b.user_id === user.id) : null;
  const hasPaymentMethod = paymentMethods !== null && paymentMethods.length > 0;

  const handleBid = async (e: FormEvent) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < 1) {
      setBidError('Minimum pledge is $1.00');
      return;
    }
    setBidLoading(true);
    try {
      const res = await potsApi.bid(Number(id), amount);
      setBidSuccess(`Pledge of $${amount.toFixed(2)} placed!`);
      setBidAmount('');
      setPot((prev) => {
        if (!prev) return prev;
        const updatedBid: PotBid = {
          ...res.data,
          user: user ? { id: user.id, name: user.name } : undefined,
        };
        const filteredBids = (prev.bids ?? []).filter(
          (b) => b.user_id !== user?.id || b.revoked_at,
        );
        return {
          ...prev,
          total_pledged: res.data.pot?.total_pledged ?? prev.total_pledged,
          bids: [...filteredBids, updatedBid],
        };
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setBidError(e.message ?? 'Failed to place pledge.');
    } finally {
      setBidLoading(false);
    }
  };

  const handleRevokeBid = async () => {
    if (!userBid) return;
    setBidLoading(true);
    setBidError('');
    try {
      await potsApi.removeBid(Number(id), userBid.id);
      setPot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          total_pledged: prev.total_pledged - userBid.amount,
          bids: (prev.bids ?? []).map((b) =>
            b.id === userBid.id ? { ...b, revoked_at: new Date().toISOString() } : b,
          ),
        };
      });
      setBidSuccess('Your pledge has been revoked.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setBidError(e.message ?? 'Failed to revoke pledge.');
    } finally {
      setBidLoading(false);
    }
  };

  const handleSubmitCompletion = async (e: FormEvent) => {
    e.preventDefault();
    setCompletionError('');
    setCompletionLoading(true);
    try {
      const res = await potsApi.submitCompletion(
        Number(id),
        submissionUrl,
        submissionNotes || undefined,
      );
      setPot((prev) => (prev ? { ...prev, status: 'completed', completion: res.data } : prev));
      setShowCompletion(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCompletionError(e.message ?? 'Failed to submit.');
    } finally {
      setCompletionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <div className="h-48 bg-surface border border-border rounded-xl animate-pulse" />
        <div className="h-32 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !pot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-red-400">
        {error || 'Pot not found.'}
      </div>
    );
  }

  const isOwner = user && pot.initiator_user_id === user.id;
  const isCreator =
    user &&
    pot.summon?.user_id === user.id &&
    (user.role === 'summoned' || user.role === 'council');
  const canBid = user && pot.status === 'open';
  const canSubmitCompletion = isCreator && pot.status === 'open';

  // ── Bid panel content ────────────────────────────────────────────────────
  const renderBidPanel = () => {
    if (!canBid) return null;

    // Still checking for payment methods
    if (pmLoading || paymentMethods === null) {
      return (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="h-4 w-32 bg-surface-2 animate-pulse rounded mb-4" />
          <div className="h-10 bg-surface-2 animate-pulse rounded-lg mb-3" />
          <div className="h-10 bg-surface-2 animate-pulse rounded-lg" />
        </div>
      );
    }

    // No payment method saved — show gate
    if (!hasPaymentMethod) {
      return (
        <div className="bg-surface border border-brand/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-brand text-lg">💳</span>
            <h2 className="font-semibold text-foreground text-sm">Add a card to back this pot</h2>
          </div>
          <p className="text-xs text-muted mb-4 leading-relaxed">
            You&apos;re only charged when a pot pays out — not when you pledge. Save a card now so
            you&apos;re ready.
          </p>
          <AddCardForm
            onSuccess={() => {
              // Refresh payment methods after successful card add
              billing.paymentMethods().then((res) => setPaymentMethods(res.data));
            }}
          />
        </div>
      );
    }

    // Has payment method — show normal bid form
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Back this pot</h2>

        {userBid ? (
          <div className="space-y-3">
            <div className="bg-brand/10 border border-brand/30 rounded-lg px-4 py-3 text-sm">
              Your pledge:{' '}
              <span className="text-brand font-semibold">
                ${Number(userBid.amount).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted">
              Increase your pledge by submitting a new amount — your previous pledge will be
              replaced.
            </p>
            <form onSubmit={handleBid} className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  max="999999.99"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="New amount"
                  className="w-full bg-surface-2 border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={bidLoading}
                className="w-full bg-brand text-black font-semibold py-2 text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50"
              >
                Update Pledge
              </button>
            </form>
            <button
              onClick={handleRevokeBid}
              disabled={bidLoading}
              className="w-full text-sm text-muted hover:text-red-400 transition-colors py-1"
            >
              Revoke pledge
            </button>
          </div>
        ) : (
          <form onSubmit={handleBid} className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
                $
              </span>
              <input
                type="number"
                min="1"
                max="999999.99"
                step="0.01"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Amount"
                className="w-full bg-surface-2 border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={bidLoading}
              className="w-full bg-brand text-black font-semibold py-2.5 text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50"
            >
              {bidLoading ? 'Placing…' : 'Pledge'}
            </button>
          </form>
        )}

        {bidError && <p className="text-red-400 text-xs mt-2">{bidError}</p>}
        {bidSuccess && <p className="text-green-400 text-xs mt-2">{bidSuccess}</p>}

        {/* Card on file indicator */}
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-muted">
          <span>💳</span>
          <span>
            Charged to your saved card on the next billing cycle.{' '}
            <Link href="/billing" className="text-brand hover:underline">
              Manage
            </Link>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Pot header */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-foreground leading-snug">{pot.title}</h1>
          <span
            className={`shrink-0 text-sm font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[pot.status]}`}
          >
            {STATUS_LABELS[pot.status]}
          </span>
        </div>

        {pot.description && (
          <p className="text-muted leading-relaxed mb-5">{pot.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {pot.summon && (
            <div>
              <span className="text-muted">For </span>
              <Link
                href={`/summons/${pot.summon.id}`}
                className="text-creator hover:underline font-medium"
              >
                {pot.summon.display_name}
              </Link>
            </div>
          )}
          {pot.initiator && (
            <div>
              <span className="text-muted">Created by </span>
              <span className="text-foreground font-medium">{pot.initiator.name}</span>
            </div>
          )}
        </div>

        {/* Total pledged */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-brand font-bold text-3xl">
            ${Number(pot.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-muted text-sm mt-0.5">
            pledged by {activeBids.length} {activeBids.length === 1 ? 'backer' : 'backers'}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {/* Action panel */}
        <div className="sm:col-span-1 space-y-4">
          {/* Payment-gated bid panel */}
          {renderBidPanel()}

          {/* Not logged in */}
          {!user && pot.status === 'open' && (
            <div className="bg-surface border border-border rounded-xl p-5 text-center">
              <p className="text-muted text-sm mb-3">Log in to back this pot</p>
              <Link
                href="/login"
                className="block w-full bg-brand text-black font-semibold py-2.5 text-sm rounded-lg hover:bg-brand-dim transition-colors"
              >
                Log in
              </Link>
            </div>
          )}

          {/* Creator: submit completion */}
          {canSubmitCompletion && !showCompletion && (
            <button
              onClick={() => setShowCompletion(true)}
              className="w-full bg-creator/10 border border-creator/30 text-creator text-sm font-semibold py-2.5 rounded-xl hover:bg-creator/20 transition-colors"
            >
              Submit Completion
            </button>
          )}

          {showCompletion && (
            <div className="bg-surface border border-creator/30 rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Submit Completed Work</h3>
              <form onSubmit={handleSubmitCompletion} className="space-y-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Link to the work (URL)</label>
                  <input
                    type="url"
                    required
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-creator transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Anything the council should know…"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-creator transition-colors resize-none"
                  />
                </div>
                {completionError && <p className="text-red-400 text-xs">{completionError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={completionLoading}
                    className="flex-1 bg-creator text-black font-semibold py-2 text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {completionLoading ? 'Submitting…' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompletion(false)}
                    className="px-4 py-2 text-sm text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pot initiator: delete */}
          {isOwner && pot.status === 'open' && (
            <button
              className="w-full text-xs text-muted hover:text-red-400 transition-colors py-1"
              onClick={async () => {
                if (!confirm('Delete this pot? This cannot be undone.')) return;
                try {
                  await potsApi.delete(Number(id));
                  window.location.href = '/pots';
                } catch (err: unknown) {
                  const e = err as { message?: string };
                  alert(e.message ?? 'Failed to delete pot.');
                }
              }}
            >
              Delete pot
            </button>
          )}
        </div>

        {/* Backers + completion */}
        <div className="sm:col-span-2 space-y-6">
          {/* Completion info */}
          {pot.completion && (
            <div
              className={`border rounded-xl p-5 ${
                pot.completion.status === 'approved'
                  ? 'bg-creator/5 border-creator/30'
                  : pot.completion.status === 'rejected'
                    ? 'bg-red-900/10 border-red-800/30'
                    : 'bg-blue-900/10 border-blue-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Submitted Work</h3>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    pot.completion.status === 'approved'
                      ? 'bg-creator/10 text-creator border-creator/30'
                      : pot.completion.status === 'rejected'
                        ? 'bg-red-900/30 text-red-400 border-red-800/50'
                        : 'bg-blue-900/30 text-blue-400 border-blue-800/50'
                  }`}
                >
                  {pot.completion.status === 'pending_review'
                    ? 'Pending Review'
                    : pot.completion.status}
                </span>
              </div>
              <a
                href={pot.completion.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline text-sm break-all"
              >
                {pot.completion.submission_url}
              </a>
              {pot.completion.submission_notes && (
                <p className="text-muted text-sm mt-2">{pot.completion.submission_notes}</p>
              )}
              {pot.completion.council_notes && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-xs text-muted">
                    Council notes: {pot.completion.council_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Backers list */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">
              Backers{' '}
              <span className="text-muted font-normal text-sm">({activeBids.length})</span>
            </h2>
            {activeBids.length === 0 ? (
              <p className="text-muted text-sm">No backers yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {activeBids.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#F5A623', color: '#0a0a0a' }}
                      >
                        {bid.user?.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm text-foreground">
                        {bid.user?.name ?? 'Anonymous'}
                        {user && bid.user_id === user.id && (
                          <span className="text-muted text-xs ml-1">(you)</span>
                        )}
                      </span>
                    </div>
                    <span className="text-brand text-sm font-semibold">
                      ${Number(bid.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
