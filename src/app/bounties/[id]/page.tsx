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
import { bounties as bountiesApi } from '@/lib/api';
import { normalizeAvatarUrl } from '@/lib/cloudinary';
import { useAuth } from '@/lib/auth-context';
import { useDefaultUpdatePrompt } from '@/lib/default-update-prompt-context';
import { DEFAULT_BACKING_AMOUNT_FALLBACK } from '@/lib/config';
import { useViewMode } from '@/lib/view-mode-context';
import type { Bounty, BountyBacking, BountyHistoryEvent } from '@/lib/types';
import { handleLink, formatPlatformHandle } from '@/lib/platforms';
import ShareButton from '@/components/ShareButton';
import BountyHistoryChart from '@/components/BountyHistoryChart';
import CommentSection from '@/components/CommentSection';
import { BOUNTY_STATUS_LABELS as STATUS_LABELS, BOUNTY_STATUS_TONES as STATUS_TONES } from '@/components/BountyStatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, Select, FieldLabel, FieldHint } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';

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

export default function BountyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { setCurrentBountyTargetUserId } = useViewMode();
  const { toast } = useToast();
  const { dispatch: dispatchPrompt } = useDefaultUpdatePrompt();
  const router = useRouter();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  // Backing form. Initial empty string lets the placeholder show; once the
  // user object loads, the amount input is seeded with the user's default
  // (or env fallback when the column is null on existing rows).
  const [backingAmount, setBackingAmount] = useState('');
  const [expireValue, setExpireValue] = useState('7');
  const [expireUnit, setExpireUnit] = useState<ExpireUnit>('years');

  // Sync defaults from the user's saved preference. The user-level expiry
  // preference stores singular units (e.g. 'month'); this page uses plural
  // (e.g. 'months'). We normalize on read.
  useEffect(() => {
    if (!user) return;
    if (user.default_expiry_value != null) {
      setExpireValue(String(user.default_expiry_value));
    }
    if (user.default_expiry_unit) {
      const u = user.default_expiry_unit;
      const plural = (u.endsWith('s') ? u : `${u}s`) as ExpireUnit;
      const allowed: ExpireUnit[] = ['years', 'months', 'weeks', 'days', 'hours', 'minutes'];
      if (allowed.includes(plural)) setExpireUnit(plural);
    }
    // Prefill the backing amount with the user's stored default; fall back
    // to the env-driven constant when the column is null (existing rows
    // pre-dating the default_backing_amount column).
    const seededAmount = user.default_backing_amount ?? DEFAULT_BACKING_AMOUNT_FALLBACK;
    if (seededAmount != null) {
      setBackingAmount((prev) => prev === '' ? String(seededAmount) : prev);
    }
  }, [user]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [backingLoading, setBackingLoading] = useState(false);
  const [backingError, setBackingError] = useState<React.ReactNode | null>(null);

  // Last-backing confirm dialog
  const [showLastBackingConfirm, setShowLastBackingConfirm] = useState(false);

  // Pending-bounty revoke warning (shown when bounty.status === 'pending')
  const [showPendingRevokeWarning, setShowPendingRevokeWarning] = useState(false);

  // Edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Completion form
  const [showCompletion, setShowCompletion] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);

  // Creator remove dialog
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removeReason, setRemoveReason]         = useState('');
  const [removeLoading, setRemoveLoading]       = useState(false);

  // Backers / Comments tab
  const [activeTab, setActiveTab]       = useState<'backings' | 'comments'>('backings');
  const [commentCount, setCommentCount] = useState<number | null>(null);

  // ── History ──────────────────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<BountyHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  /** Event the user has selected in the history list */
  const [selectedEvent, setSelectedEvent] = useState<BountyHistoryEvent | null>(null);

  /** When set, the header shows the historical title/description for this snapshot */
  const [snapshotView, setSnapshotView] = useState<{ title: string; description: string | null } | null>(null);

  // Load bounty
  useEffect(() => {
    bountiesApi
      .get(Number(id))
      .then((res) => setBounty(res.data))
      .catch(() => setError('Failed to load bounty.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Register the bounty's target with the view-mode context so the sidebar
  // flips to creator mode whenever the logged-in user is the target.
  useEffect(() => {
    setCurrentBountyTargetUserId(bounty?.target_user_id ?? null);
    return () => setCurrentBountyTargetUserId(null);
  }, [bounty?.target_user_id, setCurrentBountyTargetUserId]);

  // Fetch history the first time the panel is opened
  useEffect(() => {
    if (!showHistory || historyLoaded) return;
    setHistoryLoading(true);
    bountiesApi
      .history(Number(id))
      .then((res) => {
        setHistoryEvents(res.events);
        setHistoryLoaded(true);
      })
      .catch(() => toast('Failed to load history.', 'error'))
      .finally(() => setHistoryLoading(false));
  }, [showHistory, id, toast]);

  const activeBackings = bounty?.backings?.filter((v) => !v.revoked_at) ?? [];
  const userBacking = user ? activeBackings.find((v) => v.user_id === user.id) : null;

  // Fan name terms set by the creator; fall back to generic labels.
  const fanSingular = bounty?.owner_user?.fan_name || 'fan';
  const fanPlural   = bounty?.owner_user?.fan_name_plural || bounty?.owner_user?.fan_name || 'fans';

  // ── Derived display values ────────────────────────────────────────────────
  const displayedTotal = selectedEvent
    ? selectedEvent.running_total
    : (bounty?.solid_total ?? Number(bounty?.total_backed ?? 0));
  const displayedTitle = snapshotView?.title ?? bounty?.title ?? '';
  const displayedDescription = snapshotView !== null ? snapshotView.description : bounty?.description;

  const handleBacking = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(backingAmount);
    if (isNaN(amount) || amount < 1) {
      toast('Minimum is $1.00', 'error');
      return;
    }
    const expVal = parseInt(expireValue, 10);
    if (!Number.isInteger(expVal) || expVal < 1 || expVal > 999) {
      toast('Expiry must be a whole number between 1 and 999.', 'error');
      return;
    }
    const expiresAt = computeExpiresAt(expVal, expireUnit);
    // Backend stores expiry as a singular-unit (value, unit) pair; this page
    // works in plural form, so strip the trailing 's' before sending.
    const expirySingular = expireUnit.endsWith('s') ? expireUnit.slice(0, -1) : expireUnit;
    const isUpdate = !!userBacking;
    setBackingLoading(true);
    setBackingError(null);
    try {
      const res = await bountiesApi.backing(Number(id), amount, expiresAt, expVal, expirySingular);
      // Server-computed "update your default" prompt, if any.
      dispatchPrompt(res.default_update_prompts);
      toast(isUpdate ? 'Updated!' : `You're in for $${amount.toFixed(2)}!`, 'success');
      setBackingAmount('');
      setBounty((prev) => {
        if (!prev) return prev;
        const updatedBacking: BountyBacking = {
          ...res.data,
          user: user ? { id: user.id, display_name: user.display_name, profile_picture: user.profile_picture } : undefined,
        };
        const filteredBackings = (prev.backings ?? []).filter(
          (v) => v.user_id !== user?.id || v.revoked_at,
        );
        return {
          ...prev,
          total_backed: res.data.bounty?.total_backed ?? prev.total_backed,
          backings: [...filteredBackings, updatedBacking],
        };
      });
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        status?: number;
        reason?: string;
        data?: { cap?: number; current_total?: number; requested?: number; grace_expires_at?: string };
      };
      if (e.status === 422 && e.reason === 'backing_cap_exceeded') {
        const cap = e.data?.cap ?? 0;
        const current = e.data?.current_total ?? 0;
        setBackingError(
          <>
            You&apos;ve reached your good faith limit.{' '}
            <Link href="/billing#payment-method" className="underline underline-offset-2 font-semibold">
              Add a payment method
            </Link>{' '}
            to continue.
          </>,
        );
      } else if (e.status === 422 && e.reason === 'payment_grace_period') {
        setBackingError(
          <>
            New backings are paused while you resolve a failed payment.{' '}
            <Link href="/billing#payment-method" className="underline underline-offset-2 font-semibold">
              Update your card
            </Link>{' '}
            to continue.
          </>,
        );
      } else {
        toast(e.message ?? 'Failed to submit.', 'error');
      }
    } finally {
      setBackingLoading(false);
    }
  };

  const handleRevokeBacking = async () => {
    if (!userBacking) return;
    setBackingLoading(true);
    setShowLastBackingConfirm(false);
    try {
      const result = await bountiesApi.removeBacking(Number(id), userBacking.id);
      if (result.bounty_deleted) {
        toast('You backed out — the bounty was deleted.', 'success');
        router.push('/bounties');
        return;
      }
      setBounty((prev) => {
        if (!prev) return prev;
        const updated: Bounty = {
          ...prev,
          total_backed: prev.total_backed - userBacking.amount,
          backings: (prev.backings ?? []).map((v) =>
            v.id === userBacking.id ? { ...v, revoked_at: new Date().toISOString() } : v,
          ),
        };
        if (result.new_initiator_id !== null) {
          updated.initiator_user_id = result.new_initiator_id!;
        }
        return updated;
      });
      toast('Backed out.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to back out.', 'error');
    } finally {
      setBackingLoading(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await bountiesApi.update(Number(id), {
        title: editTitle,
        description: editDescription || undefined,
      });
      setBounty((prev) => (prev ? { ...prev, title: res.data.title, description: res.data.description } : prev));
      toast('Bounty updated!', 'success');
      setShowEditForm(false);
      // Invalidate history cache so next open reflects the new edit
      setHistoryLoaded(false);
      setHistoryEvents([]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to update bounty.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreatorRemove = async () => {
    if (!removeReason.trim()) return;
    setRemoveLoading(true);
    try {
      await bountiesApi.creatorRemove(Number(id), removeReason.trim());
      toast('Bounty removed.', 'success');
      router.push('/bounties');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to remove bounty.', 'error');
      setRemoveLoading(false);
    }
  };

  const handleSubmitCompletion = async (e: FormEvent) => {
    e.preventDefault();
    setCompletionError(null);
    setCompletionLoading(true);
    try {
      const res = await bountiesApi.submitCompletion(
        Number(id),
        submissionUrl,
        submissionNotes || undefined,
      );
      setBounty((prev) => (prev ? { ...prev, status: 'pending', completion: res.data } : prev));
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
    <div>
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted/60 hover:text-muted transition-colors cursor-pointer select-none"
      >
        <span className={`transition-transform duration-150 ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
        Advanced
      </button>
      {showAdvanced && (
        <div className="mt-2 space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Expires in</span>
          <div className="grid gap-0" style={{ gridTemplateColumns: '5rem 1fr' }}>
            <Input
              type="number"
              min="1"
              max="999"
              step="1"
              mono
              value={expireValue}
              onChange={(e) => setExpireValue(e.target.value)}
              className="text-center"
            />
            <Select
              value={expireUnit}
              onChange={(e) => setExpireUnit(e.target.value as ExpireUnit)}
            >
              <option value="years">year(s)</option>
              <option value="months">month(s)</option>
              <option value="weeks">week(s)</option>
              <option value="days">day(s)</option>
              <option value="hours">hour(s)</option>
              <option value="minutes">minute(s)</option>
            </Select>
          </div>
        </div>
      )}
    </div>
  ), [expireValue, expireUnit, showAdvanced]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <div className="h-48 bg-surface border border-border rounded-md animate-pulse" />
        <div className="h-32 bg-surface border border-border rounded-md animate-pulse" />
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="bg-bad-soft border border-bad text-bad rounded-md px-4 py-3">
          {error || 'Bounty not found.'}
        </p>
      </div>
    );
  }

  const isOwner = user && bounty.initiator_user_id === user.id;
  const isCreator =
    user &&
    bounty.owner_user?.id === user.id &&
    (user.role === 'creator' || user.role === 'council');
  // Creators cannot back their own bounty
  const canVote = user && bounty.status === 'open' && !isCreator;
  // Fans can back out during council review, but only if they already have a backing.
  const canRevokeDuringReview = user && bounty.status === 'pending' && !!userBacking;
  const isPayoutBlocked = user?.creator?.payout_category === 3;
  const canSubmitCompletion = isCreator && bounty.status === 'open' && !isPayoutBlocked;
  const canCreatorRemove = isCreator && bounty.status === 'open';

  // ── Backing panel content ────────────────────────────────────────────────────
  const renderBackingPanel = () => {
    if (!canVote && !canRevokeDuringReview) return null;

    // When the bounty is pending review, show a stripped-down panel — just
    // the fan's current commitment and the option to back out.
    if (canRevokeDuringReview && !canVote) {
      return (
        <Card>
          <SectionLabel className="mb-3">Your votive</SectionLabel>
          <div className="bg-fan/10 border border-fan/30 rounded px-4 py-3 text-sm mb-3">
            <div>
              You&apos;re in for{' '}
              <span className="text-fan font-mono font-semibold tabular-nums">
                ${Number(userBacking!.amount).toFixed(2)}
              </span>
            </div>
            {userBacking!.expires_at && (
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">
                Expires{' '}
                {new Date(userBacking!.expires_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPendingRevokeWarning(true)}
            disabled={backingLoading}
            className="w-full justify-center text-muted hover:text-bad cursor-pointer"
          >
            Back out
          </Button>
        </Card>
      );
    }

    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SectionLabel>Chip in</SectionLabel>
          <span className="relative group cursor-default">
            <span className="font-mono text-[10px] text-muted w-4 h-4 rounded-full border border-muted/40 inline-flex items-center justify-center leading-none select-none hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer">
              i
            </span>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-surface-2 border border-border rounded-md p-3 shadow-xl text-xs text-muted leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
              <p className="text-foreground font-semibold mb-1.5">How does backing work?</p>
              <p className="mb-2">You&apos;re committing to pay <strong className="text-foreground">only if this bounty gets completed</strong> and approved by The Council.</p>
              <p className="mb-2">Nothing happens to your card right now. Charges are billed monthly for approved completions.</p>
              <p>Most bounties are never completed, so most commitments are never charged. You can back out at any time.</p>
            </div>
          </span>
        </div>

        {userBacking ? (
          <div className="space-y-3">
            <div className="bg-fan/10 border border-fan/30 rounded px-4 py-3 text-sm">
              <div>
                You&apos;re in for{' '}
                <span className="text-fan font-mono font-semibold tabular-nums">
                  ${Number(userBacking.amount).toFixed(2)}
                </span>
              </div>
              {userBacking.expires_at && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">
                  Expires{' '}
                  {new Date(userBacking.expires_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-muted">
              Change how much you&apos;re in for by entering a new amount and expiry.
            </p>
            <form onSubmit={handleBacking} className="space-y-2">
              {backingError && (
                <div className="bg-bad-soft border border-bad text-foreground rounded px-3 py-2 text-sm">
                  {backingError}
                </div>
              )}
              <div className="flex items-stretch border border-border rounded bg-background">
                <span className="flex items-center px-2.5 bg-surface-2 font-mono text-xs text-muted border-r border-border flex-shrink-0">$</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    min="1"
                    max="999999.99"
                    step="0.01"
                    mono
                    value={backingAmount}
                    onChange={(e) => setBackingAmount(e.target.value)}
                    placeholder="New amount"
                    className="border-0 rounded-none rounded-r focus:border-0"
                  />
                </div>
              </div>
              {renderExpirePicker()}
              <Button
                type="submit"
                variant="primary"
                disabled={backingLoading}
                className="w-full justify-center"
              >
                Update
              </Button>
            </form>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (bounty?.status === 'pending') {
                  setShowPendingRevokeWarning(true);
                } else if (activeBackings.length === 1) {
                  setShowLastBackingConfirm(true);
                } else {
                  handleRevokeBacking();
                }
              }}
              disabled={backingLoading}
              className="w-full justify-center text-muted hover:text-bad cursor-pointer"
            >
              Back out
            </Button>
          </div>
        ) : (
          <form onSubmit={handleBacking} className="space-y-3">
            {backingError && (
              <div className="bg-bad-soft border border-bad text-foreground rounded px-3 py-2 text-sm">
                {backingError}
              </div>
            )}
            <div className="flex items-stretch border border-border rounded bg-background">
              <span className="flex items-center px-2.5 bg-surface-2 font-mono text-xs text-muted border-r border-border flex-shrink-0">$</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="1"
                  max="999999.99"
                  step="0.01"
                  mono
                  value={backingAmount}
                  onChange={(e) => setBackingAmount(e.target.value)}
                  placeholder="Amount"
                  className="border-0 rounded-none rounded-r focus:border-0"
                />
              </div>
            </div>
            {renderExpirePicker()}
            <Button
              type="submit"
              variant="primary"
              disabled={backingLoading}
              className="w-full justify-center"
            >
              {backingLoading ? 'Backing…' : 'Back This Bounty'}
            </Button>
          </form>
        )}
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Pending-bounty revoke warning */}
      {showPendingRevokeWarning && userBacking && (
        <Modal
          title={`Hold on, ${user?.display_name.split(' ')[0]}.`}
          onClose={() => setShowPendingRevokeWarning(false)}
          actions={
            <>
              <Button
                variant="danger"
                onClick={() => {
                  setShowPendingRevokeWarning(false);
                  if (activeBackings.length === 1) {
                    setShowLastBackingConfirm(true);
                  } else {
                    handleRevokeBacking();
                  }
                }}
                disabled={backingLoading}
                className="cursor-pointer"
              >
                Proceed anyway
              </Button>
              <Button
                variant="default"
                onClick={() => setShowPendingRevokeWarning(false)}
                disabled={backingLoading}
                className="cursor-pointer"
              >
                Never mind
              </Button>
            </>
          }
        >
          <p className="text-muted text-sm leading-relaxed mb-2">
            <span className="text-foreground font-semibold">{bounty?.owner_user?.display_name ?? 'The creator'}</span> has
            already submitted their work for completion. Removing your votive at this time may be seen as a dick move.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted/60 mt-2">
            (You can still do it. We&apos;re just saying.)
          </p>
        </Modal>
      )}

      {/* Creator remove dialog */}
      {showRemoveDialog && (
        <Modal
          title="Remove this bounty"
          onClose={() => { setShowRemoveDialog(false); setRemoveReason(''); }}
          actions={
            <>
              <Button
                variant="danger"
                onClick={handleCreatorRemove}
                disabled={removeLoading || removeReason.trim().length < 10}
                className="cursor-pointer"
              >
                {removeLoading ? 'Removing…' : 'Remove bounty'}
              </Button>
              <Button
                variant="default"
                onClick={() => { setShowRemoveDialog(false); setRemoveReason(''); }}
                disabled={removeLoading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </>
          }
        >
          <p className="text-muted text-sm leading-relaxed mb-4">
            All active backers will be notified by email and their commitments will be cancelled. Please provide a reason.
          </p>
          <Textarea
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            rows={4}
            placeholder="Why are you removing this bounty?…"
            maxLength={1000}
            className="mb-1"
          />
          <FieldHint>{removeReason.length} / 1000</FieldHint>
        </Modal>
      )}

      {/* Last-backing confirm dialog */}
      {showLastBackingConfirm && (
        <Modal
          title="Back out completely?"
          onClose={() => setShowLastBackingConfirm(false)}
          actions={
            <>
              <Button
                variant="danger"
                onClick={handleRevokeBacking}
                disabled={backingLoading}
                className="cursor-pointer"
              >
                {backingLoading ? 'Removing…' : 'Yes, back out'}
              </Button>
              <Button
                variant="default"
                onClick={() => setShowLastBackingConfirm(false)}
                disabled={backingLoading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </>
          }
        >
          <p className="text-muted text-sm leading-relaxed">
            You&apos;re the only {fanSingular} supporting this bounty. Backing out will leave it empty — it will be cleared automatically.
          </p>
        </Modal>
      )}

      {/* Bounty header */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {/* Historical snapshot banner */}
              {snapshotView !== null ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone="info">Historical view</Badge>
                    <button
                      onClick={() => { setSnapshotView(null); setSelectedEvent(null); }}
                      className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      ✕ Back to current
                    </button>
                  </div>
                  <h1 className="text-2xl font-display font-bold text-foreground/70 leading-snug flex-1 min-w-0">
                    {displayedTitle}
                  </h1>
                </div>
              ) : (
                <h1 className="text-2xl font-display font-bold text-foreground leading-snug flex-1 min-w-0">
                  {displayedTitle}
                </h1>
              )}
              {isOwner && bounty.status === 'open' && !showEditForm && (
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => {
                    setEditTitle(bounty.title);
                    setEditDescription(bounty.description ?? '');
                    setShowEditForm(true);
                  }}
                  className="shrink-0 mt-1 cursor-pointer"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShareButton
              path={`/bounties/${bounty.id}`}
              title={bounty.title}
              text={`Back "${bounty.title}" on artypot!`}
              size="sm"
            />
            <Badge tone={STATUS_TONES[bounty.status] ?? 'default'} lg>
              {STATUS_LABELS[bounty.status]}
            </Badge>
          </div>
        </div>

        {/* Inline edit form */}
        {showEditForm && isOwner && bounty.status === 'open' && (
          <form onSubmit={handleEditSubmit} className="mb-4 space-y-3">
            <Banner tone="warn">
              <strong>Heads up:</strong> Edits may only clarify details — you cannot change the core nature or purpose of this bounty. The Council reviews the full edit history before approving any bounty.
            </Banner>
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={editLoading}
                className="cursor-pointer"
              >
                {editLoading ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEditForm(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
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
          {(bounty.owner_user || bounty.target_handle) && (
            <div>
              <span className="text-muted">For </span>
              {bounty.owner_user ? (
                <Link
                  href={bounty.owner_user.slug ? `/${bounty.owner_user.slug}` : `/users/${bounty.owner_user.id}`}
                  className="text-creator hover:underline font-medium cursor-pointer"
                >
                  {bounty.owner_user.display_name}
                </Link>
              ) : bounty.target_handle ? (
                // Handle-targeted bounty with no verified account owner. The
                // real platform handle is ALWAYS shown — a fan-supplied
                // display_name must never stand in for it, or anyone could
                // label a random handle "MrBeast" and mislead backers. The
                // handle is the only verifiable identity here.
                <span className="inline-flex items-center gap-x-2 gap-y-1 flex-wrap align-middle">
                  {bounty.display_name && (
                    <span className="text-creator font-medium">{bounty.display_name}</span>
                  )}
                  {(() => {
                    const th = bounty.target_handle!;
                    const { href, external } = handleLink(th.platform, th.username);
                    const label = formatPlatformHandle(th.platform, th.username);
                    const cls = `font-mono cursor-pointer hover:underline break-all ${
                      bounty.display_name
                        ? 'text-xs text-muted hover:text-foreground'
                        : 'text-creator font-medium'
                    }`;
                    return external ? (
                      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className={cls}>
                        {label}
                      </Link>
                    );
                  })()}
                  {bounty.target_handle.status !== 'verified' && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted bg-surface-2 border border-border px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      unverified
                    </span>
                  )}
                </span>
              ) : null}
            </div>
          )}
          {bounty.initiator && (
            <div>
              <span className="text-muted">Created by </span>
              {bounty.initiator.id === 0 ? (
                <span className="text-foreground font-medium">{bounty.initiator.display_name}</span>
              ) : (
                <Link
                  href={`/users/${bounty.initiator.id}`}
                  className="text-foreground font-medium hover:underline cursor-pointer"
                >
                  {bounty.initiator.display_name}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Total backed + history toggle */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-fan font-mono font-bold tabular-nums text-3xl">
            ${displayedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          {!selectedEvent && bounty?.solid_total !== undefined && (Number(bounty.total_backed) - bounty.solid_total) > 0.005 && (
            <div className="font-mono text-[10px] text-muted tabular-nums mt-0.5">
              + ${(Number(bounty.total_backed) - bounty.solid_total).toLocaleString('en-US', { minimumFractionDigits: 2 })} in soft backings
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div>
              <div className="text-muted text-sm">
                backed by {activeBackings.length} {activeBackings.length === 1 ? fanSingular : fanPlural}
              </div>
              {(bounty.status === 'completed' || bounty.status === 'paid_out') && bounty.cleared_amount !== undefined && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5 tabular-nums">
                  ${bounty.cleared_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} of ${Number(bounty.total_backed).toLocaleString('en-US', { minimumFractionDigits: 2 })} cleared
                </div>
              )}
              {selectedEvent && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted/60 italic mt-0.5">
                  *Total backed on {formatHoverDate(selectedEvent.at)}
                </p>
              )}
            </div>
            <Button
              variant="default"
              size="xs"
              onClick={() => setShowHistory((v) => !v)}
              className="shrink-0 cursor-pointer"
            >
              {showHistory ? 'Hide history' : 'Show history'}
            </Button>
          </div>

          {/* History chart panel */}
          {showHistory && (
            <div className="mt-4">
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-surface-2 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <BountyHistoryChart
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
      </Card>

      <div className="grid sm:grid-cols-3 gap-6">
        {/* Action panel */}
        <div className="sm:col-span-1 space-y-4">

          {isCreator ? (
            // ── Creator view: submit completion dominates ───────────────────
            <>
              {/* Primary CTA: submit completion */}
              {canSubmitCompletion && !showCompletion && (
                <Card accent>
                  <SectionLabel className="mb-3">submit completion</SectionLabel>
                  <p className="text-sm text-muted mb-4 leading-relaxed">
                    Ready? Link to your finished work and the Council will review it. Fans are charged once approved.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowCompletion(true)}
                    className="w-full justify-center cursor-pointer"
                  >
                    Submit Completion →
                  </Button>
                </Card>
              )}

              {/* Payout blocked notice */}
              {isCreator && bounty.status === 'open' && isPayoutBlocked && (
                <Banner tone="warn">
                  <div className="font-semibold text-foreground text-sm mb-1">Payout blocked</div>
                  <div className="text-muted text-sm">Your account is not eligible for payouts. Contact support to resolve this.</div>
                </Banner>
              )}

              {/* Inline completion form */}
              {showCompletion && (
                <Card accent>
                  <SectionLabel className="mb-4">Submit Completed Work</SectionLabel>
                  <form onSubmit={handleSubmitCompletion} className="space-y-3">
                    <div>
                      <FieldLabel>Link to the work (URL)</FieldLabel>
                      <Input
                        type="text"
                        required
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                        placeholder="example.com/proof"
                      />
                      <FieldHint>Publicly visible</FieldHint>
                    </div>
                    <div>
                      <FieldLabel>Notes (optional)</FieldLabel>
                      <Textarea
                        rows={2}
                        value={submissionNotes}
                        onChange={(e) => setSubmissionNotes(e.target.value)}
                        placeholder="Anything the council should know…"
                      />
                      <FieldHint>Publicly visible</FieldHint>
                    </div>
                    {completionError && (
                      <div className="rounded bg-bad-soft border border-bad text-bad px-3 py-2.5">
                        <p className="text-xs">{completionError}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={completionLoading}
                        className="flex-1 justify-center cursor-pointer"
                      >
                        {completionLoading ? 'Submitting…' : 'Submit'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowCompletion(false)}
                        className="cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Status notices for non-open bounties */}
              {bounty.status !== 'open' && (() => {
                const notices: Record<string, { heading: string; body: string; tone: 'default' | 'warn' | 'bad' | 'good' }> = {
                  pending: {
                    heading: 'Under Council review',
                    body: 'Your submission is being reviewed. You\'ll be notified of the decision.',
                    tone: 'default',
                  },
                  completed: {
                    heading: 'Approved — payout incoming',
                    body: 'The Council approved your work. Fans will be charged in the next billing cycle.',
                    tone: 'good',
                  },
                  paid_out: {
                    heading: 'Paid out',
                    body: 'Your payout has been processed. Thank you!',
                    tone: 'good',
                  },
                  revoked: {
                    heading: 'Bounty revoked',
                    body: 'This bounty has been revoked and is no longer active.',
                    tone: 'bad',
                  },
                };
                const notice = notices[bounty.status];
                if (!notice) return null;
                return (
                  <Banner tone={notice.tone}>
                    <div>
                      <div className="font-semibold text-foreground text-sm mb-1">{notice.heading}</div>
                      <div className="text-muted text-sm leading-relaxed">{notice.body}</div>
                    </div>
                  </Banner>
                );
              })()}

              {/* Remove bounty */}
              {canCreatorRemove && !showCompletion && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowRemoveDialog(true)}
                  className="w-full justify-center cursor-pointer"
                >
                  Remove this bounty
                </Button>
              )}
            </>
          ) : (
            // ── Fan view: chip in + status notices ─────────────────────────
            <>
              {renderBackingPanel()}

              {/* Not logged in */}
              {!user && bounty.status === 'open' && (
                <Card className="text-center">
                  <p className="text-muted text-sm mb-3">Log in to back this bounty</p>
                  <Link href="/login" className="block w-full cursor-pointer">
                    <Button variant="primary" className="w-full justify-center">
                      Log in
                    </Button>
                  </Link>
                </Card>
              )}

              {/* Status notices for non-open bounties */}
              {bounty.status !== 'open' && (() => {
                const creatorName = bounty.owner_user?.display_name ?? 'The creator';
                const notices: Record<string, { heading: string; body: string; tone: 'default' | 'warn' | 'bad' | 'good' }> = {
                  pending: {
                    heading: 'Awaiting Council review',
                    body: `${creatorName} has submitted their work and the Council is considering it. You can still back out — but it would be a bit of a dick move.`,
                    tone: 'default',
                  },
                  completed: {
                    heading: 'Completed — payout pending',
                    body: 'The Council has approved this bounty. Commitments are now locked — your card will be charged in the next billing cycle.',
                    tone: 'warn',
                  },
                  paid_out: {
                    heading: 'Paid out',
                    body: `This bounty has been paid out. ${creatorName} has been compensated for their work.`,
                    tone: 'good',
                  },
                  revoked: {
                    heading: 'Bounty revoked',
                    body: 'This bounty has been revoked and is no longer active.',
                    tone: 'bad',
                  },
                };
                const notice = notices[bounty.status];
                if (!notice) return null;
                return (
                  <Banner tone={notice.tone}>
                    <div>
                      <div className="font-semibold text-foreground text-sm mb-1">{notice.heading}</div>
                      <div className="text-muted text-sm leading-relaxed">{notice.body}</div>
                    </div>
                  </Banner>
                );
              })()}
            </>
          )}

        </div>

        {/* Backers + completion */}
        <div className="sm:col-span-2 space-y-6">
          {/* Completion info */}
          {bounty.completion && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Submitted Work</SectionLabel>
                <Badge
                  tone={
                    bounty.completion.status === 'approved'
                      ? 'good'
                      : bounty.completion.status === 'rejected'
                        ? 'bad'
                        : 'info'
                  }
                >
                  {bounty.completion.status === 'pending_review'
                    ? 'Pending Review'
                    : bounty.completion.status}
                </Badge>
              </div>
              <a
                href={bounty.completion.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fan hover:underline text-sm break-all cursor-pointer"
              >
                {bounty.completion.submission_url}
              </a>
              {bounty.completion.submission_notes && (
                <p className="text-muted text-sm mt-2">{bounty.completion.submission_notes}</p>
              )}
              {bounty.completion.council_notes && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Council notes: {bounty.completion.council_notes}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Backers / Comments tabbed card */}
          <Card className="overflow-hidden !p-0">

            {/* Tab bar */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('backings')}
                className={`flex-1 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors cursor-pointer ${
                  activeTab === 'backings'
                    ? 'text-foreground border-b-2 border-fan -mb-px bg-transparent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {fanPlural}{' '}
                <span className={activeTab === 'backings' ? 'text-muted font-normal' : ''}>
                  ({activeBackings.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex-1 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors cursor-pointer ${
                  activeTab === 'comments'
                    ? 'text-foreground border-b-2 border-fan -mb-px bg-transparent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Comments{' '}
                <span className={activeTab === 'comments' ? 'text-muted font-normal' : ''}>
                  ({commentCount ?? '…'})
                </span>
              </button>
            </div>

            {/* Backings panel */}
            <div className={`p-5 ${activeTab !== 'backings' ? 'hidden' : ''}`}>
              {activeBackings.length === 0 ? (
                <p className="text-muted text-sm">No {fanPlural} yet. Be the first!</p>
              ) : (
                <div className="space-y-2">
                  {activeBackings.map((backing) => {
                    const isAnon = backing.user_id === 0;
                    const displayName = isAnon ? '[anonymous]' : (backing.user?.display_name ?? 'Unknown');
                    const initial = isAnon ? '?' : (backing.user?.display_name?.charAt(0).toUpperCase() ?? '?');
                    const expiryDate = backing.expires_at
                      ? new Date(backing.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : null;
                    const avatarSrc = !isAnon ? normalizeAvatarUrl(backing.user?.profile_picture ?? null) : null;
                    return (
                      <div
                        key={backing.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={displayName}
                              className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0"
                              style={{ background: '#F5A623', color: '#0a0a0a' }}
                            >
                              {initial}
                            </div>
                          )}
                          <div>
                            {isAnon ? (
                              <span className="text-sm text-muted">{displayName}</span>
                            ) : (
                              <Link
                                href={`/users/${backing.user_id}`}
                                className="text-sm text-foreground hover:underline cursor-pointer"
                              >
                                {displayName}
                              </Link>
                            )}
                            {user && backing.user_id === user.id && (
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted ml-1">(you)</span>
                            )}
                            {expiryDate && (
                              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Expires {expiryDate}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-fan font-mono text-sm font-semibold tabular-nums">
                          ${Number(backing.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments panel — always mounted so it silently fetches the count */}
            <div className={`p-5 ${activeTab !== 'comments' ? 'hidden' : ''}`}>
              <CommentSection bountyId={bounty.id} inline onTotalChange={setCommentCount} />
            </div>

          </Card>
        </div>

      </div>
    </div>
  );
}
