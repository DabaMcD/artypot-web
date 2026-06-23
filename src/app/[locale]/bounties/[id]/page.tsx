'use client';

import { useState, useEffect, use, FormEvent, useCallback } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useMoney, useDateFormats } from '@/lib/format';

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
import { bounties as bountiesApi, admin as adminApi } from '@/lib/api';
import { normalizeAvatarUrl } from '@/lib/cloudinary';
import { toExternalUrl, urlHost, submissionLinkLabel } from '@/lib/url';
import { useAuth } from '@/lib/auth-context';
import { useDefaultUpdatePrompt } from '@/lib/default-update-prompt-context';
import { requestNudgeRefresh } from '@/lib/nudge-context';
import { maybeFireBadApple } from '@/lib/badApple';
import { DEFAULT_BACKING_AMOUNT_FALLBACK } from '@/lib/config';
import { useViewMode } from '@/lib/view-mode-context';
import type { Bounty, BountyHistoryEvent } from '@/lib/types';
import { handleLink, handleExternalUrl, formatPlatformHandle, bareUsername } from '@/lib/platforms';
import ShareButton from '@/components/ShareButton';
import BackingPolicyNote from '@/components/BackingPolicyNote';
import PayOnVerifiedNote from '@/components/PayOnVerifiedNote';
import BountyHistoryChart from '@/components/BountyHistoryChart';
import BountyCard from '@/components/BountyCard';
import CommentSection from '@/components/CommentSection';
import { BOUNTY_STATUS_LABELS as STATUS_LABELS, BOUNTY_STATUS_TONES as STATUS_TONES } from '@/components/BountyStatusBadge';
import { AvatarOrUnknown } from '@/components/ui/AvatarOrUnknown';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { InfoDot } from '@/components/ui/InfoDot';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, Select, FieldLabel, FieldHint } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';

/** Whole-dollar pot formatting for share text ("$1,250"). */
function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function BountyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('BountyDetail');
  const money = useMoney();
  const dateFmt = useDateFormats();
  const format = useFormatter();
  const { user } = useAuth();
  const { setCurrentBountyTargetUserId } = useViewMode();
  const { toast } = useToast();
  const { dispatch: dispatchPrompt } = useDefaultUpdatePrompt();
  const router = useRouter();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Up to six *other* bounties that share this bounty's creator (preferred) or,
  // for an unclaimed handle, its target handle — rendered in an optional
  // "more bounties" section at the bottom of the page.
  const [relatedBounties, setRelatedBounties] = useState<Bounty[]>([]);


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
  }, [user]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [backingLoading, setBackingLoading] = useState(false);
  const [backingError, setBackingError] = useState<React.ReactNode | null>(null);

  // Last-backing confirm dialog
  const [showLastBackingConfirm, setShowLastBackingConfirm] = useState(false);

  // Pending-bounty revoke warning (shown when bounty.status === 'pending')
  const [showPendingRevokeWarning, setShowPendingRevokeWarning] = useState(false);

  // Content Policy report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Admin-only ownership reassignment (council). Raw-id inputs; '' = leave/clear.
  const [showOwnership, setShowOwnership] = useState(false);
  const [ownTargetUser, setOwnTargetUser] = useState('');
  const [ownEditUser, setOwnEditUser] = useState('');
  const [ownTargetHandle, setOwnTargetHandle] = useState('');
  const [ownNotes, setOwnNotes] = useState('');
  const [ownLoading, setOwnLoading] = useState(false);

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

  // Deep-link to a specific comment (?commentId=) — from a notification or email.
  // When present, open the comments tab so the linked comment is visible.
  const searchParams = useSearchParams();
  const commentIdParam = searchParams.get('commentId');
  const highlightCommentId = commentIdParam ? Number(commentIdParam) : undefined;
  useEffect(() => {
    if (highlightCommentId && !Number.isNaN(highlightCommentId)) {
      setActiveTab('comments');
    }
  }, [highlightCommentId]);

  // ── History ──────────────────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<BountyHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  /** Event the user has selected in the history list */
  const [selectedEvent, setSelectedEvent] = useState<BountyHistoryEvent | null>(null);

  /** When set, the header shows the historical title/description/name for this snapshot */
  const [snapshotView, setSnapshotView] = useState<{ title: string; description: string | null; display_name: string | null } | null>(null);

  // Pull a fresh copy of the bounty (incl. total_backed, solid_total, and the
  // full backings list) from the server. Used on initial load and after any
  // mutation that changes the totals, so the info panel always reflects
  // server-computed values rather than optimistic patches.
  const refreshBounty = useCallback(
    () => bountiesApi.get(Number(id)).then((res) => setBounty(res.data)),
    [id],
  );

  // Load bounty
  useEffect(() => {
    refreshBounty()
      .catch(() => setError(t('errors.loadBounty')))
      .finally(() => setLoading(false));
  }, [refreshBounty]);

  // The identity this bounty belongs to, for the "other bounties for …"
  // section. A claimed creator (owner) is canonical when present; otherwise
  // fall back to the unclaimed target handle. Both are stable primitives so
  // the fetch below only re-runs when the identity actually changes — not on
  // every backing/total refresh.
  const relatedOwnerId  = bounty?.target_user_id ?? bounty?.owner_user?.id ?? null;
  const relatedHandleId = bounty?.target_handle_id ?? bounty?.target_handle?.id ?? null;
  const currentBountyId = bounty?.id ?? null;

  // Fetch siblings. Optional, best-effort: any failure (or no siblings) just
  // leaves the section hidden. Revoked bounties and this bounty itself are
  // filtered out; we keep at most six, newest first (the list endpoint's order).
  useEffect(() => {
    if (currentBountyId == null) return;
    const params =
      relatedOwnerId != null
        ? { creator_id: relatedOwnerId }
        : relatedHandleId != null
          ? { handle_id: relatedHandleId }
          : null;
    if (!params) {
      setRelatedBounties([]);
      return;
    }
    let cancelled = false;
    bountiesApi
      .list(params)
      .then((res) => {
        if (cancelled) return;
        setRelatedBounties(
          res.data
            .filter((b) => b.id !== currentBountyId && b.status !== 'revoked')
            .slice(0, 6),
        );
      })
      .catch(() => {
        if (!cancelled) setRelatedBounties([]);
      });
    return () => {
      cancelled = true;
    };
  }, [relatedOwnerId, relatedHandleId, currentBountyId]);

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
      .catch(() => toast(t('errors.loadHistory'), 'error'))
      .finally(() => setHistoryLoading(false));
  }, [showHistory, id, toast]);

  const activeBackings = bounty?.backings?.filter((v) => !v.revoked_at) ?? [];
  const userBacking = user ? activeBackings.find((v) => v.user_id === user.id) : null;

  // Seed the amount input. When the fan already backs this bounty, the update
  // field mirrors their *current* commitment — not the account default — so
  // "update" starts from where they actually are. With no backing yet, fall
  // back to the user's saved default (or the env constant for legacy rows).
  // Keyed on the backing's id + amount (stable primitives) so it re-seeds on
  // load and after a server refresh, but never clobbers what the user types.
  const userBackingId = userBacking?.id ?? null;
  const userBackingAmount = userBacking?.amount ?? null;
  useEffect(() => {
    if (userBackingId != null) {
      setBackingAmount(String(Number(userBackingAmount)));
      return;
    }
    const seededAmount = user?.default_backing_amount ?? DEFAULT_BACKING_AMOUNT_FALLBACK;
    if (seededAmount != null) {
      setBackingAmount((prev) => (prev === '' ? String(seededAmount) : prev));
    }
  }, [userBackingId, userBackingAmount, user]);

  // Fan name terms set by the creator; fall back to generic labels.
  const fanSingular = bounty?.owner_user?.fan_name || t('fan.singular');
  const fanPlural   = bounty?.owner_user?.fan_name_plural || bounty?.owner_user?.fan_name || t('fan.plural');

  // ── Derived display values ────────────────────────────────────────────────
  const displayedTotal = selectedEvent
    ? selectedEvent.running_total
    : (bounty?.solid_total ?? Number(bounty?.total_backed ?? 0));
  const displayedTitle = snapshotView?.title ?? bounty?.title ?? '';
  const displayedDescription = snapshotView !== null ? snapshotView.description : bounty?.description;
  const displayedDisplayName = snapshotView !== null ? snapshotView.display_name : bounty?.display_name;

  // The creator_assigned event marks the moment a verified creator was attached
  // to a previously handle-only bounty. When the user is viewing a snapshot from
  // before that moment, the "For" line must show the original handle + fan name
  // as it stood then — the "For [creator]" attribution did not yet exist.
  const creatorAssignedAt = historyEvents.find((e) => e.type === 'creator_assigned')?.at ?? null;
  const viewingPreAssignment =
    selectedEvent != null && creatorAssignedAt != null && selectedEvent.at < creatorAssignedAt;

  const handleBacking = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(backingAmount);
    if (isNaN(amount) || amount < 1) {
      toast(t('toast.minimumAmount'), 'error');
      return;
    }
    const expVal = parseInt(expireValue, 10);
    if (!Number.isInteger(expVal) || expVal < 1 || expVal > 999) {
      toast(t('toast.expiryRange'), 'error');
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
      // Backing changes can affect nudge state (e.g. nearing the good-faith
      // cap surfaces add_payment_method), so the bar re-fetches right away.
      requestNudgeRefresh();
      toast(isUpdate ? t('toast.updated') : t('toast.youreInFor', { amount: money(amount) }), 'success');
      // Leave the amount field as-is; the seed effect re-syncs it to the
      // fan's now-current backing once the refreshed bounty lands.
      // Re-fetch the whole bounty so total_backed AND solid_total both reflect
      // the new backing. An optimistic patch only bumped total_backed, which
      // made the user's just-placed backing surface under "soft backings".
      await refreshBounty();
      // Easter egg: backing the shadow bounty (or any backing of exactly $3.39,
      // the song's runtime) summons Bad Apple. Fresh backings only, never on an
      // update, and fully downstream of / isolated from the backing itself.
      if (!isUpdate) maybeFireBadApple(bounty, amount, res);
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        status?: number;
        reason?: string;
        data?: { cap?: number; current_total?: number; requested?: number; grace_expires_at?: string };
      };
      if (e.status === 422 && e.reason === 'backing_cap_exceeded') {
        setBackingError(
          t.rich('backingError.capExceeded', {
            link: (chunks) => (
              <Link href="/billing#payment-method" className="underline underline-offset-2 font-semibold">
                {chunks}
              </Link>
            ),
          }),
        );
      } else if (e.status === 422 && e.reason === 'payment_grace_period') {
        setBackingError(
          t.rich('backingError.gracePeriod', {
            link: (chunks) => (
              <Link href="/billing#payment-method" className="underline underline-offset-2 font-semibold">
                {chunks}
              </Link>
            ),
          }),
        );
      } else if (e.status === 422 && e.reason === 'per_bounty_limit_exceeded') {
        setBackingError(
          <>{t('backingError.perBountyLimit', { limit: money(user?.backing?.per_bounty_limit ?? 0) })}</>,
        );
      } else if (e.status === 422 && e.reason === 'market_unavailable') {
        setBackingError(
          <>{t('backingError.marketUnavailable')}</>,
        );
      } else {
        toast(e.message ?? t('toast.failedSubmit'), 'error');
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
        toast(t('toast.backedOutDeleted'), 'success');
        router.push('/bounties');
        return;
      }
      // Full refresh so total_backed, solid_total, the backings list, and any
      // server-side initiator reassignment all stay in sync.
      await refreshBounty();
      toast(t('toast.backedOut'), 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toast.failedBackOut'), 'error');
    } finally {
      setBackingLoading(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    // Only send display_name for owner-less (unverified-handle) bounties; the
    // backend rejects it once a verified owner exists.
    const canEditName = !bounty?.owner_user && !!bounty?.target_handle;
    try {
      const res = await bountiesApi.update(Number(id), {
        title: editTitle,
        description: editDescription || undefined,
        ...(canEditName ? { display_name: editDisplayName.trim() || null } : {}),
      });
      setBounty((prev) => (prev ? { ...prev, title: res.data.title, description: res.data.description, display_name: res.data.display_name } : prev));
      toast(t('toast.bountyUpdated'), 'success');
      setShowEditForm(false);
      // Invalidate history cache so next open reflects the new edit
      setHistoryLoaded(false);
      setHistoryEvents([]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toast.failedUpdate'), 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Admin-only: reassign ownership fields. Recorded in the admin activity ledger
  // (server-side), NOT in bounty history. Inputs are pre-filled with current
  // values, so a blank field means "clear it".
  const handleOwnershipSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOwnLoading(true);
    const toIdOrNull = (v: string) => {
      const trimmed = v.trim();
      return trimmed === '' ? null : Number(trimmed);
    };
    try {
      const res = await adminApi.updateBountyOwnership(Number(id), {
        target_user_id:   toIdOrNull(ownTargetUser),
        edit_user_id:     toIdOrNull(ownEditUser),
        target_handle_id: toIdOrNull(ownTargetHandle),
        notes: ownNotes.trim() || undefined,
      });
      setBounty((prev) => (prev ? { ...prev, ...res.data } : prev));
      toast('Bounty ownership updated.', 'success');
      setShowOwnership(false);
      setOwnNotes('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to update ownership.', 'error');
    } finally {
      setOwnLoading(false);
    }
  };

  const handleCreatorRemove = async () => {
    if (!removeReason.trim()) return;
    setRemoveLoading(true);
    try {
      await bountiesApi.creatorRemove(Number(id), removeReason.trim());
      toast(t('toast.bountyRemoved'), 'success');
      router.push('/bounties');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toast.failedRemove'), 'error');
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
      setCompletionError(e.message ?? t('toast.failedSubmit'));
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
        {t('expiry.advanced')}
      </button>
      {showAdvanced && (
        <div className="mt-2 space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('expiry.expiresIn')}</span>
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
              <option value="years">{t('expiry.units.years')}</option>
              <option value="months">{t('expiry.units.months')}</option>
              <option value="weeks">{t('expiry.units.weeks')}</option>
              <option value="days">{t('expiry.units.days')}</option>
              <option value="hours">{t('expiry.units.hours')}</option>
              <option value="minutes">{t('expiry.units.minutes')}</option>
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
          {error || t('errors.notFound')}
        </p>
      </div>
    );
  }

  // Editing is gated on the current edit-privilege holder (edit_user_id), which
  // starts as the initiator and transfers to the largest backer if they leave —
  // mirrors BountyController::update(). NOT initiator_user_id (the immutable opener).
  // Council may also edit any bounty (the backend allows it + records history).
  const isCouncil = user?.role === 'council';
  const canEdit = user && (bounty.edit_user_id === user.id || isCouncil);
  const isCreator =
    user &&
    bounty.owner_user?.id === user.id &&
    (user.role === 'creator' || user.role === 'council');
  // Creators cannot back their own bounty
  const canVote = user && bounty.status === 'open' && !isCreator;
  // Fans can back out during council review, but only if they already have a backing.
  const canRevokeDuringReview = user && bounty.status === 'pending' && !!userBacking;
  const isPayoutBlocked = user?.creator?.payout_category === 3;
  // Phase 1 US-only gate: creators outside an open market can't submit completions.
  const creatorMarketClosed = user?.creator?.creator_market_open === false;
  const canSubmitCompletion = isCreator && bounty.status === 'open' && !isPayoutBlocked && !creatorMarketClosed;
  const canCreatorRemove = isCreator && bounty.status === 'open';

  // Where the owner's name links: their vanity slug page once creator mode is
  // on; before that, the handle page (it shows the verified owner's identity)
  // when the target handle has an internal page; else the bare user profile.
  // Mirrors BountyCard's ownerHref.
  const ownerHandleHref = bounty.target_handle
    ? handleLink(bounty.target_handle.platform, bounty.target_handle.username, bounty.target_handle.id)
    : null;
  const ownerHref = bounty.owner_user
    ? bounty.owner_user.slug
      ? `/${bounty.owner_user.slug}`
      : ownerHandleHref && !ownerHandleHref.external
        ? ownerHandleHref.href
        : `/users/${bounty.owner_user.id}`
    : null;

  // Platform-qualified handle string for the "other bounties for …" heading
  // ("youtube/@mrbeast", or the bare URL for 'other'). Mirrors the header and
  // BountyCard identity formatting so the label reads consistently everywhere.
  const relatedHandleLabel = bounty.target_handle
    ? bounty.target_handle.platform === 'other'
      ? formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)
      : `${bounty.target_handle.platform}/${bareUsername(bounty.target_handle.platform, bounty.target_handle.username)}`
    : null;

  // ── Backing panel content ────────────────────────────────────────────────────
  const renderBackingPanel = () => {
    if (!canVote && !canRevokeDuringReview) return null;

    // When the bounty is pending review, show a stripped-down panel — just
    // the fan's current commitment and the option to back out.
    if (canRevokeDuringReview && !canVote) {
      return (
        <Card>
          <SectionLabel className="mb-3">{t('panel.yourVotive')}</SectionLabel>
          <div className="bg-fan/10 border border-fan/30 rounded px-4 py-3 text-sm mb-3">
            <div>
              {t('panel.youreInFor')}{' '}
              <span className="text-fan font-mono font-bold text-base tabular-nums">
                {money(Number(userBacking!.amount))}
              </span>
            </div>
            {userBacking!.expires_at && (
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">
                {t('panel.expires')}{' '}
                {dateFmt.short(userBacking!.expires_at)}
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
            {t('panel.backOut')}
          </Button>
        </Card>
      );
    }

    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SectionLabel>{t('panel.chipIn')}</SectionLabel>
          <InfoDot heading={t('panel.howBackingWorksHeading')}>
            <p className="mb-2">{t.rich('panel.howBackingWorks1', { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}</p>
            <p className="mb-2">{t('panel.howBackingWorks2')}</p>
            <p>{t('panel.howBackingWorks3')}</p>
          </InfoDot>
        </div>

        {userBacking ? (
          <div className="space-y-3">
            <div className="bg-fan/10 border border-fan/30 rounded px-4 py-3 text-sm">
              <div>
                {t('panel.youreInFor')}{' '}
                <span className="text-fan font-mono font-bold text-base tabular-nums">
                  {money(Number(userBacking.amount))}
                </span>
              </div>
              {userBacking.expires_at && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">
                  {t('panel.expires')}{' '}
                  {dateFmt.short(userBacking.expires_at)}
                </div>
              )}
            </div>
            <p className="text-xs text-muted">
              {t('panel.changeCommitment')}
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
                    placeholder={t('panel.newAmountPlaceholder')}
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
                {t('panel.update')}
              </Button>
              <BackingPolicyNote />
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
              {t('panel.backOut')}
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
                  placeholder={t('panel.amountPlaceholder')}
                  className="border-0 rounded-none rounded-r focus:border-0"
                />
              </div>
            </div>
            {renderExpirePicker()}
            <PayOnVerifiedNote />
            <Button
              type="submit"
              variant="primary"
              disabled={backingLoading}
              className="w-full justify-center"
            >
              {backingLoading ? t('panel.backingLoading') : t('panel.backThisBounty')}
            </Button>
            <BackingPolicyNote />
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
          title={t('revokeWarning.title', { name: user?.display_name.split(' ')[0] ?? '' })}
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
                {t('revokeWarning.proceed')}
              </Button>
              <Button
                variant="default"
                onClick={() => setShowPendingRevokeWarning(false)}
                disabled={backingLoading}
                className="cursor-pointer"
              >
                {t('revokeWarning.nevermind')}
              </Button>
            </>
          }
        >
          <p className="text-muted text-sm leading-relaxed mb-2">
            {t.rich('revokeWarning.body', {
              creator: bounty?.owner_user?.display_name ?? t('creatorFallback'),
              strong: (chunks) => <span className="text-foreground font-semibold">{chunks}</span>,
            })}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted/60 mt-2">
            {t('revokeWarning.aside')}
          </p>
        </Modal>
      )}

      {/* Creator remove dialog */}
      {showRemoveDialog && (
        <Modal
          title={t('removeDialog.title')}
          onClose={() => { setShowRemoveDialog(false); setRemoveReason(''); }}
          actions={
            <>
              <Button
                variant="danger"
                onClick={handleCreatorRemove}
                disabled={removeLoading || removeReason.trim().length < 10}
                className="cursor-pointer"
              >
                {removeLoading ? t('removeDialog.removing') : t('removeDialog.remove')}
              </Button>
              <Button
                variant="default"
                onClick={() => { setShowRemoveDialog(false); setRemoveReason(''); }}
                disabled={removeLoading}
                className="cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
            </>
          }
        >
          <p className="text-muted text-sm leading-relaxed mb-4">
            {t('removeDialog.body')}
          </p>
          <Textarea
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            rows={4}
            placeholder={t('removeDialog.reasonPlaceholder')}
            maxLength={1000}
            className="mb-1"
          />
          <FieldHint>{removeReason.length} / 1000</FieldHint>
        </Modal>
      )}

      {/* Last-backing confirm dialog */}
      {showLastBackingConfirm && (
        <Modal
          title={t('lastBacking.title')}
          onClose={() => setShowLastBackingConfirm(false)}
          actions={
            <>
              <Button
                variant="danger"
                onClick={handleRevokeBacking}
                disabled={backingLoading}
                className="cursor-pointer"
              >
                {backingLoading ? t('removeDialog.removing') : t('lastBacking.confirm')}
              </Button>
              <Button
                variant="default"
                onClick={() => setShowLastBackingConfirm(false)}
                disabled={backingLoading}
                className="cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
            </>
          }
        >
          <p className="text-muted text-sm leading-relaxed">
            {t('lastBacking.body', { fan: fanSingular })}
          </p>
        </Modal>
      )}

      {/* Bounty header */}
      <Card className="mb-6 overflow-hidden">
        {/* Always-on fan accent hairline — same visual signature as the
            bounty cards' hover state, anchoring the page to the fan role. */}
        <span
          aria-hidden
          className="absolute inset-x-4 top-0 h-[2px] rounded-b bg-gradient-to-r from-fan/0 via-fan/60 to-fan/0"
        />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {/* Historical snapshot banner */}
              {snapshotView !== null ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone="info">{t('header.historicalView')}</Badge>
                    <button
                      onClick={() => { setSnapshotView(null); setSelectedEvent(null); }}
                      className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      {t('header.backToCurrent')}
                    </button>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground/70 leading-snug flex-1 min-w-0 normal-case break-words">
                    {displayedTitle}
                  </h1>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-snug flex-1 min-w-0 normal-case break-words">
                  {displayedTitle}
                </h1>
              )}
              {canEdit && bounty.status === 'open' && !showEditForm && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setEditTitle(bounty.title);
                    setEditDescription(bounty.description ?? '');
                    setEditDisplayName(bounty.display_name ?? '');
                    setShowEditForm(true);
                  }}
                  className="shrink-0 mt-1 cursor-pointer"
                >
                  {t('header.edit')}
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShareButton
              path={`/bounties/${bounty.id}`}
              title={`${formatUsd(Number(bounty.total_backed))} bounty: ${bounty.title}`}
              text={
                bounty.target_handle?.username
                  ? `💰 There's a ${formatUsd(Number(bounty.total_backed))} bounty waiting for @${bounty.target_handle.username}: "${bounty.title}" — back it on Artypot!`
                  : `💰 ${formatUsd(Number(bounty.total_backed))} bounty: "${bounty.title}" — back it on Artypot!`
              }
              size="sm"
            />
            <Badge tone={STATUS_TONES[bounty.status] ?? 'default'} lg>
              {STATUS_LABELS[bounty.status]}
            </Badge>
          </div>
        </div>

        {/* Inline edit form */}
        {showEditForm && canEdit && bounty.status === 'open' && (
          <form onSubmit={handleEditSubmit} className="mb-4 space-y-3">
            <Banner tone="warn">
              {t.rich('editForm.warning', { strong: (chunks) => <strong>{chunks}</strong> })}
            </Banner>
            <div>
              <FieldLabel>{t('editForm.titleLabel')}</FieldLabel>
              <Input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div>
              <FieldLabel>{t('editForm.descriptionLabel')}</FieldLabel>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            {!bounty.owner_user && bounty.target_handle && (
              <div>
                <FieldLabel>{t('editForm.creatorNameLabel')}</FieldLabel>
                <Input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  maxLength={255}
                  placeholder={formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)}
                />
                <FieldHint>
                  {t('editForm.creatorNameHint')}
                </FieldHint>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={editLoading}
                className="cursor-pointer"
              >
                {editLoading ? t('editForm.saving') : t('editForm.save')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEditForm(false)}
                className="cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}

        {/* Admin — ownership reassignment (council only). Recorded in the admin
            activity ledger, NOT the bounty history. */}
        {isCouncil && (
          <div className="mb-4 border border-bad/30 rounded-md bg-bad/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-bad/80">admin · ownership</span>
              {!showOwnership && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setOwnTargetUser(bounty.target_user_id != null ? String(bounty.target_user_id) : '');
                    setOwnEditUser(bounty.edit_user_id != null ? String(bounty.edit_user_id) : '');
                    setOwnTargetHandle(bounty.target_handle_id != null ? String(bounty.target_handle_id) : '');
                    setOwnNotes('');
                    setShowOwnership(true);
                  }}
                  className="cursor-pointer"
                >
                  edit ownership
                </Button>
              )}
            </div>

            {showOwnership && (
              <form onSubmit={handleOwnershipSubmit} className="mt-3 space-y-3">
                <Banner tone="warn">
                  Reassigning ownership is recorded in the admin activity ledger (not the bounty history).
                  Enter user / handle IDs; leave a field blank to clear it.
                </Banner>
                <div>
                  <FieldLabel>target_user_id <span className="normal-case text-muted">(creator-of-record)</span></FieldLabel>
                  <Input type="number" value={ownTargetUser} onChange={(e) => setOwnTargetUser(e.target.value)} placeholder="user id" mono />
                </div>
                <div>
                  <FieldLabel>edit_user_id <span className="normal-case text-muted">(edit privilege)</span></FieldLabel>
                  <Input type="number" value={ownEditUser} onChange={(e) => setOwnEditUser(e.target.value)} placeholder="user id" mono />
                </div>
                <div>
                  <FieldLabel>target_handle_id</FieldLabel>
                  <Input type="number" value={ownTargetHandle} onChange={(e) => setOwnTargetHandle(e.target.value)} placeholder="handle id" mono />
                </div>
                <div>
                  <FieldLabel>notes <span className="normal-case text-muted">(optional)</span></FieldLabel>
                  <Textarea value={ownNotes} onChange={(e) => setOwnNotes(e.target.value)} rows={2} placeholder="reason for the reassignment" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={ownLoading} className="cursor-pointer">
                    {ownLoading ? 'Saving…' : 'Save ownership'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowOwnership(false)} className="cursor-pointer">
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            )}
          </div>
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
            <div className="flex items-center gap-2">
              {/* Creator face — same trio as BountyCard, one notch larger:
                  real picture, else initial chip, else the unknown-avatar
                  placeholder for unclaimed handles (and pre-assignment
                  snapshots, where the owner attribution didn't exist yet). */}
              {bounty.owner_user && !viewingPreAssignment ? (
                bounty.owner_user.profile_picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizeAvatarUrl(bounty.owner_user.profile_picture)!}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-creator/40"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-creator/40"
                    style={{ background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }}
                  >
                    {bounty.owner_user.display_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )
              ) : (
                // avatar_url is the CURRENT owner's photo (backend accessor), so a
                // pre-assignment snapshot must not show it — the owner attribution
                // didn't exist at that point in history.
                <AvatarOrUnknown avatarUrl={viewingPreAssignment ? null : (bounty.avatar_url ?? null)} size="sm" />
              )}
              <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted/70 mr-1.5">{t('header.for')}</span>
              {bounty.owner_user && !viewingPreAssignment ? (
                <Link
                  href={ownerHref!}
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
                  {(() => {
                    const th = bounty.target_handle!;
                    // Pass the id so 'other' resolves to its internal /h/{id}
                    // page instead of dead-ending on the external site.
                    const { href, external } = handleLink(th.platform, th.username, th.id);
                    // Primary, verifiable identity: `youtube/@bbnomoney`. The
                    // platform-qualified handle is the only thing a fan can
                    // actually trust, so it always leads.
                    const label = th.platform === 'other'
                      ? formatPlatformHandle(th.platform, th.username)
                      : `${th.platform}/${bareUsername(th.platform, th.username)}`;
                    // 'other' now links internally; offer a ↗ to still jump out.
                    const external_url = th.platform === 'other'
                      ? handleExternalUrl(th.platform, th.username)
                      : null;
                    const cls = 'text-creator font-medium font-mono cursor-pointer hover:underline break-all';
                    return external ? (
                      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
                        {label}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <Link href={href} className={cls}>
                          {label}
                        </Link>
                        {external_url && (
                          <a
                            href={external_url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            title={t('header.visit', { label })}
                            aria-label={t('header.visit', { label })}
                            className="shrink-0 text-muted hover:text-creator transition-colors"
                          >
                            ↗
                          </a>
                        )}
                      </span>
                    );
                  })()}
                  {/* Fan-supplied display name is secondary context, never the
                      headline. Reflects the historical value in snapshot view. */}
                  {displayedDisplayName && (
                    <span className={snapshotView !== null ? 'text-muted/60' : 'text-muted'}>
                      ({displayedDisplayName})
                    </span>
                  )}
                  {(bounty.target_handle.status !== 'verified' || viewingPreAssignment) && (
                    <Badge tone="default">{t('header.unverified')}</Badge>
                  )}
                </span>
              ) : null}
              </div>
            </div>
          )}
          {bounty.initiator && (
            <div className="flex items-center gap-2">
              {/* Initiator face — same treatment as the creator block above,
                  fan-toned. Anonymous initiators (id 0) get the same "?" chip
                  as anonymous backers in the list below. */}
              {bounty.initiator.id !== 0 && bounty.initiator.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizeAvatarUrl(bounty.initiator.profile_picture)!}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-fan/40"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-fan/40"
                  style={{ background: 'var(--color-fan)', color: 'var(--color-brand-dark)' }}
                >
                  {bounty.initiator.id === 0 ? '?' : (bounty.initiator.display_name?.charAt(0).toUpperCase() ?? '?')}
                </div>
              )}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted/70 mr-1.5">{t('header.startedBy')}</span>
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
            </div>
          )}
        </div>

        {/* Total backed + history toggle */}
        <div className="mt-5 pt-5 border-t border-border/70">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted/70 mb-1">{t('totals.totalBacked')}</div>
              <div className="text-fan font-mono font-bold tabular-nums text-3xl sm:text-4xl leading-none tracking-tight">
                {money(displayedTotal)}
              </div>
              {!selectedEvent && bounty?.solid_total !== undefined && (Number(bounty.total_backed) - bounty.solid_total) > 0.005 && (
                <div className="font-mono text-[10px] text-muted tabular-nums mt-1.5">
                  {t('totals.softBackings', { amount: money(Number(bounty.total_backed) - bounty.solid_total) })}
                </div>
              )}
              <div className="text-muted text-sm mt-1.5">
                {t('totals.backedBy', { count: activeBackings.length, fan: activeBackings.length === 1 ? fanSingular : fanPlural })}
              </div>
              {(bounty.status === 'completed' || bounty.status === 'paid_out') && bounty.cleared_amount !== undefined && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5 tabular-nums">
                  {t('totals.cleared', { cleared: money(bounty.cleared_amount), total: money(Number(bounty.total_backed)) })}
                </div>
              )}
              {selectedEvent && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted/60 italic mt-0.5">
                  {t('totals.totalBackedOn', { date: dateFmt.full(selectedEvent.at) })}
                </p>
              )}
            </div>
            <Button
              variant="default"
              size="xs"
              onClick={() => setShowHistory((v) => !v)}
              className="shrink-0 cursor-pointer"
            >
              {showHistory ? t('totals.hideHistory') : t('totals.showHistory')}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Action panel */}
        <div className="md:col-span-1 space-y-4">

          {isCreator ? (
            // ── Creator view: submit completion dominates ───────────────────
            <>
              {/* Primary CTA: submit completion */}
              {canSubmitCompletion && !showCompletion && (
                <Card accent>
                  <SectionLabel className="mb-3">{t('completion.cardLabel')}</SectionLabel>
                  <p className="text-sm text-muted mb-4 leading-relaxed">
                    {t('completion.intro')}
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowCompletion(true)}
                    className="w-full justify-center cursor-pointer"
                  >
                    {t('completion.submitCta')}
                  </Button>
                </Card>
              )}

              {/* Payout blocked notice */}
              {isCreator && bounty.status === 'open' && isPayoutBlocked && (
                <Banner tone="warn">
                  <div className="font-semibold text-foreground text-sm mb-1">{t('payoutBlocked.heading')}</div>
                  <div className="text-muted text-sm">{t('payoutBlocked.body')}</div>
                </Banner>
              )}

              {/* Phase 1 US-only creator gate */}
              {isCreator && bounty.status === 'open' && !isPayoutBlocked && creatorMarketClosed && (
                <Banner tone="warn">
                  <div className="font-semibold text-foreground text-sm mb-1">{t('marketClosed.heading')}</div>
                  <div className="text-muted text-sm">
                    {t('marketClosed.body')}
                  </div>
                </Banner>
              )}

              {/* Inline completion form */}
              {showCompletion && (
                <Card accent>
                  <SectionLabel className="mb-4">{t('completionForm.title')}</SectionLabel>
                  <form onSubmit={handleSubmitCompletion} className="space-y-3">
                    <div>
                      <FieldLabel>{t('completionForm.urlLabel')}</FieldLabel>
                      <Input
                        type="text"
                        required
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                        placeholder={t('completionForm.urlPlaceholder')}
                      />
                      <FieldHint>{t('completionForm.publiclyVisible')}</FieldHint>
                    </div>
                    <div>
                      <FieldLabel>{t('completionForm.notesLabel')}</FieldLabel>
                      <Textarea
                        rows={2}
                        value={submissionNotes}
                        onChange={(e) => setSubmissionNotes(e.target.value)}
                        placeholder={t('completionForm.notesPlaceholder')}
                      />
                      <FieldHint>{t('completionForm.publiclyVisible')}</FieldHint>
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
                        {completionLoading ? t('completionForm.submitting') : t('completionForm.submit')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowCompletion(false)}
                        className="cursor-pointer"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Status notices for non-open bounties */}
              {bounty.status !== 'open' && (() => {
                const notices: Record<string, { heading: string; body: string; tone: 'default' | 'warn' | 'bad' | 'good' }> = {
                  pending: {
                    heading: t('creatorNotices.pending.heading'),
                    body: t('creatorNotices.pending.body'),
                    tone: 'default',
                  },
                  completed: {
                    heading: t('creatorNotices.completed.heading'),
                    body: t('creatorNotices.completed.body'),
                    tone: 'good',
                  },
                  paid_out: {
                    heading: t('creatorNotices.paidOut.heading'),
                    body: t('creatorNotices.paidOut.body'),
                    tone: 'good',
                  },
                  revoked: {
                    heading: t('creatorNotices.revoked.heading'),
                    body: t('creatorNotices.revoked.body'),
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
                  {t('removeDialog.title')}
                </Button>
              )}
            </>
          ) : (
            // ── Fan view: chip in + status notices ─────────────────────────
            <>
              {renderBackingPanel()}

              {/* Not logged in — this is the one shot to explain the model to a
                  first-time visitor. They already sense the crowdfunding from the
                  backer list and the running total; what converts is the risk
                  reversal: you only ever pay if the work actually gets made. Lead
                  with that, reassure, then send them to sign up (not just log in). */}
              {!user && bounty.status === 'open' && (
                <Card>
                  <SectionLabel>{t('howThisWorks.label')}</SectionLabel>
                  <p className="text-foreground font-semibold text-[15px] leading-snug mt-3 mb-2">
                    {t('howThisWorks.headline')}
                  </p>
                  <p className="text-muted text-sm leading-relaxed mb-4">
                    {t.rich('howThisWorks.body', { strong: (chunks) => <strong className="text-foreground font-medium">{chunks}</strong> })}
                  </p>

                  <div className="space-y-1.5 mb-5">
                    {[t('howThisWorks.bullet1'), t('howThisWorks.bullet2'), t('howThisWorks.bullet3')].map((line) => (
                      <div
                        key={line}
                        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted"
                      >
                        <span className="text-fan">✓</span>
                        {line}
                      </div>
                    ))}
                  </div>

                  <Link href={`/register?next=${encodeURIComponent(`/bounties/${id}`)}`} className="block w-full cursor-pointer">
                    <Button variant="primary" className="w-full justify-center">
                      {activeBackings.length > 0
                        ? t('howThisWorks.ctaBack')
                        : t('howThisWorks.ctaFirst')}
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-muted mt-3">
                    {t.rich('howThisWorks.alreadyHaveAccount', {
                      link: (chunks) => (
                        <Link href={`/login?next=${encodeURIComponent(`/bounties/${id}`)}`} className="text-fan hover:underline cursor-pointer">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </p>
                </Card>
              )}

              {/* Status notices for non-open bounties */}
              {bounty.status !== 'open' && (() => {
                const creatorName = bounty.owner_user?.display_name ?? t('creatorFallback');
                const notices: Record<string, { heading: string; body: string; tone: 'default' | 'warn' | 'bad' | 'good' }> = {
                  completed: {
                    heading: t('fanNotices.completed.heading'),
                    body: t('fanNotices.completed.body'),
                    tone: 'warn',
                  },
                  paid_out: {
                    heading: t('fanNotices.paidOut.heading'),
                    body: t('fanNotices.paidOut.body', { creator: creatorName }),
                    tone: 'good',
                  },
                  revoked: {
                    heading: t('fanNotices.revoked.heading'),
                    body: t('fanNotices.revoked.body'),
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
        <div className="md:col-span-2 space-y-6">
          {/* Completion info */}
          {bounty.completion && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>{t('submittedWork.label')}</SectionLabel>
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
                    ? t('submittedWork.pendingReview')
                    : bounty.completion.status}
                </Badge>
              </div>
              {/* Prominent CTA — the submitted work is the payoff of the whole
                  bounty, so it gets a full-width, can't-miss button out to the
                  video/stream rather than a thin inline link. */}
              <a
                href={toExternalUrl(bounty.completion.submission_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 w-full rounded-lg border border-creator/40 bg-creator/10 px-4 py-4 transition-colors hover:bg-creator/20 hover:border-creator"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-creator text-brand-dark">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                  </svg>
                </span>
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-foreground text-base leading-tight">
                    {submissionLinkLabel(bounty.completion.submission_url)}
                  </span>
                  <span className="font-mono text-[11px] text-muted truncate mt-0.5">
                    {urlHost(bounty.completion.submission_url) || bounty.completion.submission_url}
                  </span>
                </span>
                <span className="shrink-0 text-creator text-xl transition-transform group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </a>
              {bounty.completion.submission_notes && (
                <p className="text-muted text-sm mt-3">{bounty.completion.submission_notes}</p>
              )}
              {bounty.completion.council_notes && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {t('submittedWork.councilNotes', { notes: bounty.completion.council_notes })}
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
                {t('tabs.comments')}{' '}
                <span className={activeTab === 'comments' ? 'text-muted font-normal' : ''}>
                  ({commentCount ?? '…'})
                </span>
              </button>
            </div>

            {/* Backings panel */}
            <div className={`p-5 ${activeTab !== 'backings' ? 'hidden' : ''}`}>
              {activeBackings.length === 0 ? (
                <p className="text-muted text-sm">{t('backers.empty', { fan: fanPlural })}</p>
              ) : (
                <div className="space-y-2">
                  {activeBackings.map((backing) => {
                    const isAnon = backing.user_id === 0;
                    const displayName = isAnon ? t('backers.anonymous') : (backing.user?.display_name ?? t('backers.unknown'));
                    const initial = isAnon ? '?' : (backing.user?.display_name?.charAt(0).toUpperCase() ?? '?');
                    const expiryDate = backing.expires_at
                      ? format.dateTime(new Date(backing.expires_at), { month: 'short', year: 'numeric' })
                      : null;
                    const avatarSrc = !isAnon ? normalizeAvatarUrl(backing.user?.profile_picture ?? null) : null;
                    return (
                      <div
                        key={backing.id}
                        className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded border-b border-border/60 last:border-0 hover:bg-surface-2/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={displayName}
                              className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0"
                              style={{ background: 'var(--color-fan)', color: 'var(--color-brand-dark)' }}
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
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted ml-1">{t('backers.you')}</span>
                            )}
                            {expiryDate && (
                              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('backers.expires', { date: expiryDate })}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-fan font-mono text-sm font-semibold tabular-nums">
                          {money(Number(backing.amount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments panel — always mounted so it silently fetches the count */}
            <div className={`p-5 ${activeTab !== 'comments' ? 'hidden' : ''}`}>
              <CommentSection
                bountyId={bounty.id}
                inline
                onTotalChange={setCommentCount}
                highlightCommentId={highlightCommentId && !Number.isNaN(highlightCommentId) ? highlightCommentId : undefined}
              />
            </div>

          </Card>

          {/* Content Policy report — subtle, logged-in non-participants only */}
          {user && !canEdit && bounty.initiator_user_id !== user.id && bounty.target_user_id !== user.id && (
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="font-mono text-[10px] uppercase tracking-widest text-muted/50 hover:text-bad transition-colors cursor-pointer"
              >
                {t('report.trigger')}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Other bounties for this creator / handle (optional) ───────────────
          Hidden entirely when there are no siblings. Grouped by the claimed
          creator when there is one, else by the unclaimed target handle. */}
      {relatedBounties.length > 0 && (
        <section className="mt-12 pt-8 border-t border-border">
          <SectionLabel className="mb-1.5">{t('related.label')}</SectionLabel>
          <h2 className="font-display font-bold text-xl text-foreground mb-5">
            {t('related.heading')}{' '}
            {bounty.owner_user && ownerHref ? (
              <Link href={ownerHref} className="text-creator hover:underline">
                {bounty.owner_user.display_name}
              </Link>
            ) : relatedHandleLabel && ownerHandleHref ? (
              ownerHandleHref.external ? (
                <a
                  href={ownerHandleHref.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-mono text-creator hover:underline break-all"
                >
                  {relatedHandleLabel}
                </a>
              ) : (
                <Link href={ownerHandleHref.href} className="font-mono text-creator hover:underline break-all">
                  {relatedHandleLabel}
                </Link>
              )
            ) : (
              <span className="text-creator">
                {bounty.owner_user?.display_name ?? relatedHandleLabel}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {relatedBounties.map((b) => (
              <BountyCard key={b.id} bounty={b} />
            ))}
          </div>
        </section>
      )}

      {showReportModal && (
        <Modal title={t('report.title')} onClose={() => setShowReportModal(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setReportSubmitting(true);
              try {
                await bountiesApi.report(bounty.id, reportReason, reportDetails.trim() || undefined);
                setShowReportModal(false);
                setReportDetails('');
                toast(t('report.received'), 'success');
              } catch (err) {
                toast(err instanceof Error ? err.message : t('report.failed'), 'error');
              } finally {
                setReportSubmitting(false);
              }
            }}
            className="space-y-3"
          >
            <p className="text-sm text-muted">
              {t.rich('report.intro', {
                link: (chunks) => <Link href="/tos#content" className="underline underline-offset-2">{chunks}</Link>,
              })}
            </p>
            <Select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              <option value="harassment">{t('report.reasons.harassment')}</option>
              <option value="illegal">{t('report.reasons.illegal')}</option>
              <option value="adult_content">{t('report.reasons.adultContent')}</option>
              <option value="spam">{t('report.reasons.spam')}</option>
              <option value="other">{t('report.reasons.other')}</option>
            </Select>
            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder={t('report.detailsPlaceholder')}
              rows={3}
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setShowReportModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" type="submit" disabled={reportSubmitting}>
                {reportSubmitting ? t('report.submitting') : t('report.submit')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
