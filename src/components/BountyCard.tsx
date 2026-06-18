'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useMoney } from '@/lib/format';
import type { Bounty } from '@/lib/types';
import { formatPlatformHandle, bareUsername, handleLink, handleExternalUrl } from '@/lib/platforms';
import { normalizeAvatarUrl } from '@/lib/cloudinary';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { bounties as bountiesApi } from '@/lib/api';
import { requestNudgeRefresh } from '@/lib/nudge-context';
import { DEFAULT_BACKING_AMOUNT_FALLBACK } from '@/lib/config';
import { trackSpotlight } from '@/lib/spotlight';
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
  const t = useTranslations('Components');
  const money = useMoney();
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

  // Platform-qualified handle string for owner-less bounties ("youtube/mrbeast",
  // or the bare URL for 'other'). The platform slug already names the platform,
  // so the username is bare (no '@' / 'twitch.tv/' prefix). Rendered on one
  // truncating line.
  const handleText = bounty.target_handle
    ? bounty.target_handle.platform === 'other'
      ? formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)
      : `${bounty.target_handle.platform}/${bareUsername(bounty.target_handle.platform, bounty.target_handle.username)}`
    : null;
  // Where the handle points: the internal handle page — /{platform}/{username}
  // for curated, or /h/{id} for 'other' — passing the id so 'other' resolves
  // internally instead of dead-ending on the external site.
  const handleHref = bounty.target_handle
    ? handleLink(bounty.target_handle.platform, bounty.target_handle.username, bounty.target_handle.id)
    : null;
  // 'other' handles now lead to their Artypot page, so offer a small ↗ beside
  // the name to still jump straight to the external URL in one click.
  const handleExternal = bounty.target_handle?.platform === 'other'
    ? handleExternalUrl(bounty.target_handle.platform, bounty.target_handle.username)
    : null;
  // A registered creator's own page: their vanity slug if claimed; before
  // creator mode is on, the handle page (it shows the verified owner's
  // identity) when the target handle has an internal page; else the numeric
  // user page. Mirrors the bounty detail page's link target.
  const ownerHref = bounty.owner_user
    ? bounty.owner_user.slug
      ? `/${bounty.owner_user.slug}`
      : handleHref && !handleHref.external
        ? handleHref.href
        : `/users/${bounty.owner_user.id}`
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
      toast(t('bountyCard.toast.youreIn', { amount: money(defaultAmount) }), 'success');
      // A new backing can change nudge state (e.g. approaching the good-faith
      // cap surfaces add_payment_method), so re-fetch the bar right away.
      requestNudgeRefresh();
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number; reason?: string };
      if (e.status === 422 && e.reason === 'backing_cap_exceeded') {
        toast(t('bountyCard.toast.capExceeded'), 'error');
      } else if (e.status === 422 && e.reason === 'payment_grace_period') {
        toast(t('bountyCard.toast.gracePeriod'), 'error');
      } else if (e.status === 422 && e.reason === 'market_unavailable') {
        toast(t('bountyCard.toast.marketUnavailable'), 'error');
      } else {
        toast(e.message ?? t('bountyCard.toast.failed'), 'error');
      }
    } finally {
      setQuickBackLoading(false);
    }
  };

  return (
    <div
      onMouseMove={trackSpotlight}
      style={{ '--spot-color': 'var(--color-fan)' } as CSSProperties}
      className="relative flex flex-col h-full bg-surface border border-border rounded-xl p-5 transition-[transform,border-color,box-shadow] duration-150 hover:border-fan/25 hover:-translate-y-0.5 hover:shadow-soft group"
    >
      {/* Cursor-tracking spotlight: a fan-colored hot spot on the border ring
          plus a faint interior glow, both following the pointer. */}
      <span aria-hidden className="ap-spot-ring opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <span aria-hidden className="ap-spot-glow opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Stretched link title — ::after pseudo-element covers the whole card */}
        <h3 className="font-semibold text-foreground group-hover:text-fan transition-colors line-clamp-2 leading-snug break-words">
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
                  src={normalizeAvatarUrl(bounty.owner_user.profile_picture)!}
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
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted/70 shrink-0">{t('bountyCard.for')}</span>
              {/* The identity links sit above the card's stretched-link overlay
                  (relative z-10) so they navigate to the creator/handle rather
                  than the bounty. */}
              {bounty.owner_user && ownerHref ? (
                <Link
                  href={ownerHref}
                  title={bounty.owner_user.display_name}
                  className="relative z-10 text-sm text-creator font-medium truncate hover:underline underline-offset-2"
                >
                  {bounty.owner_user.display_name}
                </Link>
              ) : handleText && handleHref ? (
                // No verified account owner — the platform-qualified handle is
                // the only trustworthy identity, so it leads. A fan-supplied
                // display_name is secondary and can't masquerade as someone else.
                <>
                  {handleHref.external ? (
                    <a
                      href={handleHref.href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      title={handleText}
                      className="relative z-10 font-mono text-[13px] text-creator font-medium truncate min-w-0 hover:underline underline-offset-2"
                    >
                      {handleText}
                    </a>
                  ) : (
                    <span className="relative z-10 flex items-center gap-1 min-w-0">
                      <Link
                        href={handleHref.href}
                        title={handleText}
                        className="font-mono text-[13px] text-creator font-medium truncate min-w-0 hover:underline underline-offset-2"
                      >
                        {handleText}
                      </Link>
                      {handleExternal && (
                        <a
                          href={handleExternal}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          title={t('bountyCard.visitHandle', { handle: handleText })}
                          aria-label={t('bountyCard.visitHandle', { handle: handleText })}
                          className="shrink-0 text-muted hover:text-creator transition-colors"
                        >
                          ↗
                        </a>
                      )}
                    </span>
                  )}
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
              {money(totalBacked)}
            </div>
            {backerCount !== null && (
              <div className="text-xs text-muted mt-0.5">
                {t('bountyCard.backerCount', { count: backerCount })}
              </div>
            )}
            {(bounty.status === 'completed' || bounty.status === 'paid_out') && bounty.cleared_amount !== undefined && (
              <div className="text-xs text-muted mt-0.5">
                {t('bountyCard.cleared', {
                  cleared: money(bounty.cleared_amount),
                  total: money(Number(bounty.total_backed)),
                })}
              </div>
            )}
          </div>

          {canQuickBack && (
            userBackingAmount != null ? (
              <Link
                href={`/bounties/${bounty.id}`}
                title={t('bountyCard.youBackTooltip')}
                className="relative z-10 inline-flex flex-col items-end px-2.5 py-1 rounded font-mono text-fan bg-fan/10 border border-fan/40 hover:bg-fan/15 transition-colors shrink-0 text-right leading-tight"
              >
                <span className="text-[8px] uppercase tracking-widest text-fan/70">{t('bountyCard.youBack')}</span>
                <span className="text-[13px] font-bold">
                  {money(userBackingAmount)}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={quickBackArmed ? handleQuickBack : armQuickBack}
                disabled={quickBackLoading}
                title={quickBackArmed ? undefined : t('bountyCard.backDefaultTooltip', { amount: money(defaultAmount) })}
                className="relative z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wide bg-fan text-background border border-fan shadow-[2px_2px_0_#000] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_#000] active:translate-x-px active:translate-y-px active:shadow-none transition-[transform,box-shadow] duration-75 cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
              >
                {quickBackLoading
                  ? t('bountyCard.backing')
                  : quickBackArmed
                    ? t('bountyCard.confirmAmount', { amount: defaultAmountLabel })
                    : t('bountyCard.backAmount', { amount: defaultAmountLabel })}
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
