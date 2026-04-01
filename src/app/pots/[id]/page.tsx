'use client';

import { useState, useEffect, use, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type ExpireUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes';

function computeExpiresAt(value: number, unit: ExpireUnit): string {
  const d = new Date();
  if (unit === 'years')   d.setFullYear(d.getFullYear() + value);
  else if (unit === 'months')  d.setMonth(d.getMonth() + value);
  else if (unit === 'weeks')   d.setDate(d.getDate() + value * 7);
  else if (unit === 'days')    d.setDate(d.getDate() + value);
  else if (unit === 'hours')   d.setHours(d.getHours() + value);
  else if (unit === 'minutes') d.setMinutes(d.getMinutes() + value);
  return d.toISOString();
}
import { useToast } from '@/lib/toast-context';
import Link from 'next/link';
import { pots as potsApi, billing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Pot, PotVotive, PaymentMethod, PotHistoryEvent } from '@/lib/types';
import AddCardForm from '@/components/AddCardForm';
import ShareButton from '@/components/ShareButton';
import PotHistoryChart from '@/components/PotHistoryChart';

const STATUS_LABELS: Record<string, string> = {
  open:      'Open',
  pending:   'Pending Review',
  completed: 'Completed',
  paid_out:  'Paid Out',
  revoked:   'Revoked',
};

const STATUS_COLORS: Record<string, string> = {
  open:      'bg-green-900/40 text-green-400 border-green-800/50',
  pending:   'bg-blue-900/40 text-blue-400 border-blue-800/50',
  completed: 'bg-creator/10 text-creator border-creator/30',
  paid_out:  'bg-council/10 text-council border-council/30',
  revoked:   'bg-red-900/40 text-red-400 border-red-800/50',
};

function formatHoverDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month:  'long',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [pot, setPot] = useState<Pot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment method gate — null means "still loading"
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[] | null>(null);
  const [pmLoading, setPmLoading] = useState(false);

  // Votive form
  const [votiveAmount, setVotiveAmount] = useState('');
  const [expireValue, setExpireValue] = useState('10');
  const [expireUnit, setExpireUnit] = useState<ExpireUnit>('years');
  const [votiveLoading, setVotiveLoading] = useState(false);

  // Last-votive confirm dialog
  const [showLastVotiveConfirm, setShowLastVotiveConfirm] = useState(false);

  // Edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Completion form
  const [showCompletion, setShowCompletion] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [completionLoading, setCompletionLoading] = useState(false);

  // ── History ──────────────────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<PotHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  /** Event the user has selected in the history list */
  const [selectedEvent, setSelectedEvent] = useState<PotHistoryEvent | null>(null);

  /** When set, the header shows the historical title/description for this snapshot */
  const [snapshotView, setSnapshotView] = useState<{ title: string; description: string | null } | null>(null);

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

  // Fetch history the first time the panel is opened
  useEffect(() => {
    if (!showHistory || historyLoaded) return;
    setHistoryLoading(true);
    potsApi
      .history(Number(id))
      .then((res) => {
        setHistoryEvents(res.events);
        setHistoryLoaded(true);
      })
      .catch(() => toast('Failed to load history.', 'error'))
      .finally(() => setHistoryLoading(false));
  }, [showHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeVotives = pot?.votives?.filter((v) => !v.revoked_at) ?? [];
  const userVotive = user ? activeVotives.find((v) => v.user_id === user.id) : null;
  const hasPaymentMethod = paymentMethods !== null && paymentMethods.length > 0;

  // ── Derived display values ────────────────────────────────────────────────
  const displayedTotal = selectedEvent ? selectedEvent.running_total : Number(pot?.total_pledged ?? 0);
  const displayedTitle = snapshotView?.title ?? pot?.title ?? '';
  const displayedDescription = snapshotView !== null ? snapshotView.description : pot?.description;

  const handleVotive = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(votiveAmount);
    if (isNaN(amount) || amount < 1) {
      toast('Minimum votive is $1.00', 'error');
      return;
    }
    const expVal = parseInt(expireValue, 10);
    if (!Number.isInteger(expVal) || expVal < 1 || expVal > 999) {
      toast('Expiry must be a whole number between 1 and 999.', 'error');
      return;
    }
    const expiresAt = computeExpiresAt(expVal, expireUnit);
    const isUpdate = !!userVotive;
    setVotiveLoading(true);
    try {
      const res = await potsApi.votive(Number(id), amount, expiresAt);
      toast(isUpdate ? 'Votive updated!' : `Votive of $${amount.toFixed(2)} placed!`, 'success');
      setVotiveAmount('');
      setPot((prev) => {
        if (!prev) return prev;
        const updatedVotive: PotVotive = {
          ...res.data,
          user: user ? { id: user.id, name: user.name } : undefined,
        };
        const filteredVotives = (prev.votives ?? []).filter(
          (v) => v.user_id !== user?.id || v.revoked_at,
        );
        return {
          ...prev,
          total_pledged: res.data.pot?.total_pledged ?? prev.total_pledged,
          votives: [...filteredVotives, updatedVotive],
        };
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to place votive.', 'error');
    } finally {
      setVotiveLoading(false);
    }
  };

  const handleRevokeVotive = async () => {
    if (!userVotive) return;
    setVotiveLoading(true);
    setShowLastVotiveConfirm(false);
    try {
      const result = await potsApi.removeVotive(Number(id), userVotive.id);
      if (result.pot_deleted) {
        toast('Your votive was revoked and the pot was deleted.', 'success');
        router.push('/pots');
        return;
      }
      setPot((prev) => {
        if (!prev) return prev;
        const updated: Pot = {
          ...prev,
          total_pledged: prev.total_pledged - userVotive.amount,
          votives: (prev.votives ?? []).map((v) =>
            v.id === userVotive.id ? { ...v, revoked_at: new Date().toISOString() } : v,
          ),
        };
        if (result.new_initiator_id !== null) {
          updated.initiator_user_id = result.new_initiator_id!;
        }
        return updated;
      });
      toast('Votive revoked.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to revoke votive.', 'error');
    } finally {
      setVotiveLoading(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await potsApi.update(Number(id), {
        title: editTitle,
        description: editDescription || undefined,
      });
      setPot((prev) => (prev ? { ...prev, title: res.data.title, description: res.data.description } : prev));
      toast('Pot updated!', 'success');
      setShowEditForm(false);
      // Invalidate history cache so next open reflects the new edit
      setHistoryLoaded(false);
      setHistoryEvents([]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to update pot.', 'error');
    } finally {
      setEditLoading(false);
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
      setPot((prev) => (prev ? { ...prev, status: 'pending', completion: res.data } : prev));
      setShowCompletion(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCompletionError(e.message ?? 'Failed to submit.');
    } finally {
      setCompletionLoading(false);
    }
  };

  // ── Expiry picker (shared between new + update forms) ───────────────────────
  // Must be declared before any early returns to satisfy Rules of Hooks.
  const renderExpirePicker = useCallback(() => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted shrink-0">Expires in</span>
      <input
        type="number"
        min="1"
        max="999"
        step="1"
        value={expireValue}
        onChange={(e) => setExpireValue(e.target.value)}
        className="w-16 bg-surface-2 border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors text-center"
      />
      <select
        value={expireUnit}
        onChange={(e) => setExpireUnit(e.target.value as ExpireUnit)}
        className="flex-1 bg-surface-2 border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
      >
        <option value="years">year(s)</option>
        <option value="months">month(s)</option>
        <option value="weeks">week(s)</option>
        <option value="days">day(s)</option>
        <option value="hours">hour(s)</option>
        <option value="minutes">minute(s)</option>
      </select>
    </div>
  ), [expireValue, expireUnit]);

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
  const canVote = user && pot.status === 'open';
  const canSubmitCompletion = isCreator && pot.status === 'open';

  // ── Votive panel content ────────────────────────────────────────────────────
  const renderVotivePanel = () => {
    if (!canVote) return null;

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
            You&apos;re only charged when a pot pays out — not when you place a votive. Save a card now so
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

    // Has payment method — show normal votive form
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-foreground">Back this pot</h2>
          <span className="relative group cursor-default">
            <span className="text-muted text-xs w-4 h-4 rounded-full border border-muted/40 inline-flex items-center justify-center leading-none select-none hover:border-foreground/40 hover:text-foreground transition-colors">
              i
            </span>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-surface-2 border border-border rounded-xl p-3 shadow-xl text-xs text-muted leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
              <p className="text-foreground font-semibold mb-1.5">What&apos;s a votive?</p>
              <p className="mb-2">A votive is a pledge of support — like backing a Kickstarter. Your card is <strong className="text-foreground">not charged when you place a votive</strong>.</p>
              <p className="mb-2">Cards are <strong className="text-foreground">only charged for pots that have been completed</strong> and approved by The Council, billed monthly.</p>
              <p>Most pots on Artypot are never completed, so most votives are never charged. You can revoke your votive at any time.</p>
            </div>
          </span>
        </div>

        {userVotive ? (
          <div className="space-y-3">
            <div className="bg-brand/10 border border-brand/30 rounded-lg px-4 py-3 text-sm">
              <div>
                Your votive:{' '}
                <span className="text-brand font-semibold">
                  ${Number(userVotive.amount).toFixed(2)}
                </span>
              </div>
              {userVotive.expires_at && (
                <div className="text-xs text-muted mt-0.5">
                  Expires{' '}
                  {new Date(userVotive.expires_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-muted">
              Replace your votive by submitting a new amount and expiry.
            </p>
            <form onSubmit={handleVotive} className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  max="999999.99"
                  step="0.01"
                  value={votiveAmount}
                  onChange={(e) => setVotiveAmount(e.target.value)}
                  placeholder="New amount"
                  className="w-full bg-surface-2 border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              {renderExpirePicker()}
              <button
                type="submit"
                disabled={votiveLoading}
                className="w-full bg-brand text-black font-semibold py-2 text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50"
              >
                Update Votive
              </button>
            </form>
            <button
              onClick={() => {
                if (activeVotives.length === 1) {
                  setShowLastVotiveConfirm(true);
                } else {
                  handleRevokeVotive();
                }
              }}
              disabled={votiveLoading}
              className="w-full text-sm text-muted hover:text-red-400 transition-colors py-1"
            >
              Revoke votive
            </button>
          </div>
        ) : (
          <form onSubmit={handleVotive} className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
                $
              </span>
              <input
                type="number"
                min="1"
                max="999999.99"
                step="0.01"
                value={votiveAmount}
                onChange={(e) => setVotiveAmount(e.target.value)}
                placeholder="Amount"
                className="w-full bg-surface-2 border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            {renderExpirePicker()}
            <button
              type="submit"
              disabled={votiveLoading}
              className="w-full bg-brand text-black font-semibold py-2.5 text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50"
            >
              {votiveLoading ? 'Placing…' : 'Place Votive'}
            </button>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Last-votive confirm dialog */}
      {showLastVotiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-foreground text-lg mb-2">Remove last votive?</h3>
            <p className="text-muted text-sm leading-relaxed mb-6">
              You&apos;re the only backer of this pot. Removing your votive will leave the pot empty — it
              will be cleared automatically.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRevokeVotive}
                disabled={votiveLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 text-sm rounded-lg disabled:opacity-50 transition-colors"
              >
                {votiveLoading ? 'Removing…' : 'Yes, remove votive'}
              </button>
              <button
                onClick={() => setShowLastVotiveConfirm(false)}
                disabled={votiveLoading}
                className="flex-1 bg-surface-2 border border-border text-muted hover:text-foreground font-medium py-2 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pot header */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {/* Historical snapshot banner */}
              {snapshotView !== null ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-2 py-0.5">
                      Historical view
                    </span>
                    <button
                      onClick={() => { setSnapshotView(null); setSelectedEvent(null); }}
                      className="text-xs text-muted hover:text-foreground transition-colors"
                    >
                      ✕ Back to current
                    </button>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground/70 leading-snug flex-1 min-w-0">
                    {displayedTitle}
                  </h1>
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-foreground leading-snug flex-1 min-w-0">
                  {displayedTitle}
                </h1>
              )}
              {isOwner && pot.status === 'open' && !showEditForm && (
                <button
                  onClick={() => {
                    setEditTitle(pot.title);
                    setEditDescription(pot.description ?? '');
                    setShowEditForm(true);
                  }}
                  className="shrink-0 text-xs text-muted hover:text-foreground transition-colors mt-1 px-2 py-1 rounded border border-border hover:border-foreground/30"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShareButton
              path={`/pots/${pot.id}`}
              title={pot.title}
              text={`Back "${pot.title}" on artypot!`}
              size="sm"
            />
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[pot.status]}`}
            >
              {STATUS_LABELS[pot.status]}
            </span>
          </div>
        </div>

        {/* Inline edit form */}
        {showEditForm && isOwner && pot.status === 'open' && (
          <form onSubmit={handleEditSubmit} className="mb-4 space-y-3">
            {/* Edit policy warning */}
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2.5 text-xs text-amber-300/90 leading-relaxed">
              <strong className="text-amber-300">Heads up:</strong> Edits may only clarify details
              — you cannot change the core nature or purpose of this pot. The Council reviews the
              full edit history before approving any pot.
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={255}
                required
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={editLoading}
                className="bg-brand text-black font-semibold px-4 py-2 text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50 transition-colors"
              >
                {editLoading ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Description — show historical if in snapshot view */}
        {!showEditForm && (
          displayedDescription ? (
            <p className={`leading-relaxed mb-5 ${snapshotView !== null ? 'text-muted/60' : 'text-muted'}`}>
              {displayedDescription}
            </p>
          ) : null
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

        {/* Total pledged + history toggle */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-brand font-bold text-3xl">
            ${displayedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div>
              <div className="text-muted text-sm">
                supported by {activeVotives.length} {activeVotives.length === 1 ? 'backer' : 'backers'}
              </div>
              {(pot.status === 'completed' || pot.status === 'paid_out') && pot.cleared_amount !== undefined && (
                <div className="text-xs text-muted mt-0.5">
                  ${pot.cleared_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} of ${Number(pot.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2 })} cleared
                </div>
              )}
              {selectedEvent && (
                <p className="text-xs text-muted/60 italic mt-0.5">
                  *Votive total on {formatHoverDate(selectedEvent.at)}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-foreground/30 shrink-0"
            >
              {showHistory ? 'Hide history' : 'Show history'}
            </button>
          </div>

          {/* History chart panel */}
          {showHistory && (
            <div className="mt-4">
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-surface-2 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <PotHistoryChart
                  events={historyEvents}
                  selectedEvent={selectedEvent}
                  onSelect={(event) => {
                    setSelectedEvent(event);
                    if (event && (event.type === 'created' || event.type === 'details_edited')) {
                      setSnapshotView(event.snapshot);
                    } else {
                      setSnapshotView(null);
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {/* Action panel */}
        <div className="sm:col-span-1 space-y-4">
          {/* Payment-gated votive panel */}
          {renderVotivePanel()}

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

          {/* Closed-pot notice — shown for every non-open status */}
          {pot.status !== 'open' && (() => {
            const summonName = pot.summon?.display_name ?? 'The creator';
            const notices: Record<string, { icon: string; heading: string; body: string; style: string }> = {
              pending: {
                icon: '📋',
                heading: 'Awaiting Council review',
                body: `${summonName} has submitted this pot for review. Votives are locked while the Council considers the completion.`,
                style: 'border-blue-800/40 bg-blue-900/10',
              },
              completed: {
                icon: '✅',
                heading: 'Completed — payout pending',
                body: 'The Council has approved this pot. Votives are now locked — your card will be charged in the next billing cycle.',
                style: 'border-creator/30 bg-creator/5',
              },
              paid_out: {
                icon: '💸',
                heading: 'Paid out',
                body: `This pot has been paid out. ${summonName} has been compensated for their work.`,
                style: 'border-council/30 bg-council/5',
              },
              revoked: {
                icon: '🚫',
                heading: 'Pot revoked',
                body: 'This pot has been revoked and is no longer active.',
                style: 'border-red-800/40 bg-red-900/10',
              },
            };
            const notice = notices[pot.status];
            if (!notice) return null;

            return (
              <div className={`border rounded-xl p-5 ${notice.style}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{notice.icon}</span>
                  <h3 className="font-semibold text-foreground text-sm">{notice.heading}</h3>
                </div>
                <p className="text-muted text-sm leading-relaxed">{notice.body}</p>
              </div>
            );
          })()}

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
              <span className="text-muted font-normal text-sm">({activeVotives.length})</span>
            </h2>
            {activeVotives.length === 0 ? (
              <p className="text-muted text-sm">No backers yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {activeVotives.map((votive) => {
                  const isAnon = votive.user_id === 0;
                  const displayName = isAnon ? '[anonymous]' : (votive.user?.name ?? 'Unknown');
                  const initial = isAnon ? '?' : (votive.user?.name?.charAt(0).toUpperCase() ?? '?');
                  const expiryDate = votive.expires_at
                    ? new Date(votive.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : null;
                  return (
                    <div
                      key={votive.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: '#F5A623', color: '#0a0a0a' }}
                        >
                          {initial}
                        </div>
                        <div>
                          {isAnon ? (
                            <span className="text-sm text-muted">{displayName}</span>
                          ) : (
                            <Link
                              href={`/users/${votive.user_id}`}
                              className="text-sm text-foreground hover:underline"
                            >
                              {displayName}
                            </Link>
                          )}
                          {user && votive.user_id === user.id && (
                            <span className="text-muted text-xs ml-1">(you)</span>
                          )}
                          {expiryDate && (
                            <p className="text-xs text-muted">Expires {expiryDate}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-brand text-sm font-semibold">
                        ${Number(votive.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
