'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Bounty } from '@/lib/types';
import { formatPlatformHandle } from '@/lib/platforms';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { bounties as bountiesApi } from '@/lib/api';
import { requestNudgeRefresh } from '@/lib/nudge-context';
import { DEFAULT_BACKING_AMOUNT_FALLBACK } from '@/lib/config';
import { AvatarOrUnknown } from './ui/AvatarOrUnknown';
import { BountyStatusBadge } from './BountyStatusBadge';
import BackingPolicyNote from './BackingPolicyNote';
import ShareButton from './ShareButton';

/** Mirrors the detail page's expiry math, but takes the singular units the
 *  user-level preference stores ('day' | 'week' | 'month' | 'year'). */
function computeExpiresAt(value: number, unit: string): string {
  const d = new Date();
  if (unit === 'year') d.setFullYear(d.getFullYear() + value);
  else if (unit === 'month') d.setMonth(d.getMonth() + value);
  else if (unit === 'week') d.setDate(d.getDate() + value * 7);
  else d.setDate(d.getDate() + value);
  return d.toISOString();
}

export default function BountyCard({ bounty }: { bounty: Bounty }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Live overrides after a successful quick-back; null until then.
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  // Set to the user's backing amount once they quick-back (so the card flips
  // to the "you're in" state without a full refetch).
  const [liveUserBacking, setLiveUserBacking] = useState<number | null>(null);
  const [quickBackLoading, setQuickBackLoading] = useState(false);
  // Quick-back is a two-step confirm: the first click arms the button and
  // reveals the refund/cancellation policy note, the second click commits.
  // Card-network rules require the policy to be visible before the fan
  // commits, so a hover tooltip isn't enough here.
  const [quickBackArmed, setQuickBackArmed] = useState(false);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
  }, []);

  const armQuickBack = () => {
    setQuickBackArmed(true);
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    disarmTimer.current = setTimeout(() => setQuickBackArmed(false), 12000);
  };

  const fanSingular = bounty.owner_user?.fan_name || 'supporter';
  const fanPlural   = bounty.owner_user?.fan_name_plural || bounty.owner_user?.fan_name || 'supporters';

  // Platform-qualified handle string for owner-less bounties ("youtube/@mrbeast",
  // or the bare URL for 'other'). Rendered on one truncating line.
  const handleText = bounty.target_handle
    ? bounty.target_handle.platform === 'other'
      ? formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)
      : `${bounty.target_handle.platform}/${formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)}`
    : null;

  const activeBackings = bounty.backings?.filter((v) => !v.revoked_at) ?? null;
  // The fan's own active backing on this bounty. List endpoints append it as
  // the scalar `user_backing`; detail-derived payloads carry the full
  // `backings` array instead, so fall back to scanning that. `liveUserBacking`
  // (set right after a quick-back) takes precedence over both.
  const existingUserBacking =
    bounty.user_backing != null
      ? Number(bounty.user_backing)
      : user
        ? activeBackings?.find((v) => v.user_id === user.id)?.amount ?? null
        : null;
  const userBackingAmount =
    liveUserBacking ?? (existingUserBacking != null ? Number(existingUserBacking) : null);
  const justBacked = liveUserBacking != null && existingUserBacking == null;

  // Supporter count: prefer the appended scalar, else the (partial) array.
  const baseBackerCount = bounty.backings_count ?? activeBackings?.length ?? null;
  const backerCount =
    baseBackerCount !== null ? baseBackerCount + (justBacked ? 1 : 0) : null;
  const totalBacked = liveTotal ?? Number(bounty.total_backed);

  const defaultAmount = Number(user?.default_backing_amount ?? DEFAULT_BACKING_AMOUNT_FALLBACK);
  const defaultAmountLabel =
    defaultAmount % 1 === 0 ? String(defaultAmount) : defaultAmount.toFixed(2);

  // Quick-back only makes sense for open bounties, and never for the bounty's
  // own creator/target backing themself.
  const canQuickBack =
    !!user &&
    bounty.status === 'open' &&
    user.id !== bounty.target_user_id &&
    user.id !== (bounty.owner_user_id ?? bounty.owner_user?.id);

  const handleQuickBack = async () => {
    if (!user || quickBackLoading) return;
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    setQuickBackArmed(false);
    const expVal = user.default_expiry_value ?? 7;
    const expUnit = user.default_expiry_unit ?? 'year';
    setQuickBackLoading(true);
    try {
      const res = await bountiesApi.backing(
        bounty.id,
        defaultAmount,
        computeExpiresAt(expVal, expUnit),
        expVal,
        expUnit,
      );
      setLiveTotal(Number(res.bounty.total_backed));
      setLiveUserBacking(Number(res.data.amount));
      toast(`You're in for $${defaultAmount.toFixed(2)}!`, 'success');
      // A new backing can change nudge state (e.g. approaching the good-faith
      // cap surfaces add_payment_method), so re-fetch the bar right away.
      requestNudgeRefresh();
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number; reason?: string };
      if (e.status === 422 && e.reason === 'backing_cap_exceeded') {
        toast('You’ve reached your good faith limit — add a payment method to continue.', 'error');
      } else if (e.status === 422 && e.reason === 'payment_grace_period') {
        toast('New backings are paused until you resolve your failed payment.', 'error');
      } else if (e.status === 422 && e.reason === 'market_unavailable') {
        toast('Backing isn’t available in your country yet.', 'error');
      } else {
        toast(e.message ?? 'Failed to back.', 'error');
      }
    } finally {
      setQuickBackLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-surface border border-border rounded-xl p-5 transition-[transform,border-color,box-shadow] duration-150 hover:border-fan/60 hover:-translate-y-0.5 hover:shadow-soft group">
      {/* Fan-colored accent hairline that fades in on hover */}
      <span
        aria-hidden
        className="absolute inset-x-4 top-0 h-[2px] rounded-b bg-gradient-to-r from-fan/0 via-fan/70 to-fan/0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Stretched link title — ::after pseudo-element covers the whole card */}
        <h3 className="font-semibold text-foreground group-hover:text-fan transition-colors line-clamp-2 leading-snug">
          <Link
            href={`/bounties/${bounty.id}`}
            className="after:absolute after:inset-0 after:rounded-xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-fan/60"
          >
            {bounty.title}
          </Link>
        </h3>
        {/* relative z-10 lifts these above the stretched-link ::after overlay */}
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          <ShareButton path={`/bounties/${bounty.id}`} title={bounty.title} />
          <BountyStatusBadge status={bounty.status} />
        </div>
      </div>

      {bounty.description && (
        <p className="text-sm text-muted line-clamp-2 mb-4">{bounty.description}</p>
      )}

      <div className="mt-auto pt-3 border-t border-border/70">
        {/* Target identity — one compact row that never wraps. Long handles and
            URLs truncate with an ellipsis; the full value lives in the title
            tooltip. The fan-supplied display name (unverified handles only)
            rides inline in parens and gives way first when space runs out. */}
        {(bounty.avatar_url !== undefined || bounty.owner_user) && (
          <div className="flex items-center gap-2 mb-3 min-w-0">
            {bounty.owner_user ? (
              // Registered creator: real picture if they have one, otherwise their
              // initial on the creator-colored chip. The "?" placeholder is only
              // for unclaimed handles (the branch below), never a real account.
              bounty.owner_user.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bounty.owner_user.profile_picture}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-creator/40"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ring-1 ring-creator/40"
                  style={{ background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }}
                >
                  {bounty.owner_user.display_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )
            ) : (
              <AvatarOrUnknown avatarUrl={bounty.avatar_url ?? null} size="xs" />
            )}
            <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted/70 shrink-0">for</span>
              {bounty.owner_user ? (
                <span className="text-sm text-creator font-medium truncate" title={bounty.owner_user.display_name}>
                  {bounty.owner_user.display_name}
                </span>
              ) : handleText ? (
                // No verified account owner — the platform-qualified handle is
                // the only trustworthy identity, so it leads. A fan-supplied
                // display_name is secondary and can't masquerade as someone else.
                <>
                  <span className="font-mono text-[13px] text-creator font-medium truncate min-w-0" title={handleText}>
                    {handleText}
                  </span>
                  {bounty.display_name && (
                    <span className="text-[11px] text-muted truncate min-w-0 shrink-[4]" title={bounty.display_name}>
                      ({bounty.display_name})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-creator font-medium truncate" title={bounty.display_name ?? undefined}>
                  {bounty.display_name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Amount + quick-back action */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-fan font-bold text-xl leading-tight tracking-tight">
              ${totalBacked.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {backerCount !== null && (
              <div className="text-xs text-muted mt-0.5">
                {backerCount} {backerCount === 1 ? fanSingular : fanPlural}
              </div>
            )}
            {(bounty.status === 'completed' || bounty.status === 'paid_out') && bounty.cleared_amount !== undefined && (
              <div className="text-xs text-muted mt-0.5">
                ${bounty.cleared_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${Number(bounty.total_backed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cleared
              </div>
            )}
          </div>

          {canQuickBack && (
            userBackingAmount != null ? (
              <Link
                href={`/bounties/${bounty.id}`}
                title="You're backing this bounty — open it to adjust your backing."
                className="relative z-10 inline-flex flex-col items-end px-2.5 py-1 rounded font-mono text-fan bg-fan/10 border border-fan/40 hover:bg-fan/15 transition-colors shrink-0 text-right leading-tight"
              >
                <span className="text-[8px] uppercase tracking-widest text-fan/70">✓ you back</span>
                <span className="text-[13px] font-bold">
                  ${userBackingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={quickBackArmed ? handleQuickBack : armQuickBack}
                disabled={quickBackLoading}
                title={quickBackArmed ? undefined : `Back with your default ($${defaultAmount.toFixed(2)})`}
                className="relative z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wide bg-fan text-background border border-fan shadow-[2px_2px_0_#000] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_#000] active:translate-x-px active:translate-y-px active:shadow-none transition-[transform,box-shadow] duration-75 cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
              >
                {quickBackLoading
                  ? 'backing…'
                  : quickBackArmed
                    ? `✓ confirm $${defaultAmountLabel}`
                    : `+ back $${defaultAmountLabel}`}
              </button>
            )
          )}
        </div>

        {/* Policy disclosure for the armed quick-back, shown before the
            committing click. */}
        {quickBackArmed && !quickBackLoading && userBackingAmount == null && (
          <BackingPolicyNote className="relative z-10 mt-2" />
        )}
      </div>
    </div>
  );
}
