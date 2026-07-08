'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { auth as authApi, handles as handlesApi } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import type { HandleClaim, HandlePlatform } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Modal } from '@/components/ui/Modal';
import { FieldLabel, FieldHint, Textarea, Select } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import { PlatformHandleInput } from '@/components/ui/PlatformHandleInput';
import {
  ALL_PLATFORMS,
  ENABLED_OAUTH_PLATFORMS,
  platformLabel,
  platformOAuthProvider,
  platformOAuthIntent,
  formatPlatformHandle,
} from '@/lib/platforms';
import { OAUTH_NEXT_KEY, OAUTH_VERIFY_KEY } from '@/lib/next-redirect';

/**
 * Add-handle dropdown options — every curated platform plus 'Other'. Sourced
 * from the catalogue in @/lib/platforms so adding a new platform there shows
 * up here automatically.
 */
const PLATFORMS: { value: HandlePlatform; label: string }[] = ALL_PLATFORMS.map((slug) => ({
  value: slug,
  label: platformLabel(slug),
}));

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map(({ value, label }) => [value, label])
);

// ── Review request modal ──────────────────────────────────────────────────────

function RequestReviewModal({
  claim,
  onClose,
  onSubmitted,
}: {
  claim: HandleClaim;
  onClose: () => void;
  onSubmitted: (updated: HandleClaim) => void;
}) {
  const t = useTranslations('HandlesSection');
  const { toast } = useToast();
  const [message, setMessage] = useState(claim.contact_message ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError(t('review.errorTooShort'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await handlesApi.requestReview(claim.claim_id, message.trim());
      toast(t('review.submittedToast'), 'success');
      onSubmitted(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? t('review.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const platformLabel = PLATFORM_LABELS[claim.handle.platform as HandlePlatform] ?? claim.handle.platform;
  const alreadySubmitted = claim.pending_review;

  return (
    <Modal title={t('review.title', { username: claim.handle.username })} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          {t.rich('review.intro', {
            platform: platformLabel,
            brand: (chunks) => <span className="text-foreground">{chunks}</span>,
          })}
        </p>

        <div>
          <FieldLabel>{t('review.contactLabel')} <span className="text-bad">*</span></FieldLabel>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder={t('review.contactPlaceholder')}
            autoFocus
          />
          <FieldHint>{t('review.contactHint')}</FieldHint>
        </div>

        {alreadySubmitted && (
          <Banner tone="default">
            {t('review.alreadySubmitted')}
          </Banner>
        )}

        {error && <Banner tone="bad">{error}</Banner>}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" disabled={submitting || message.trim().length < 10}>
            {submitting ? t('review.submitting') : alreadySubmitted ? t('review.resubmit') : t('review.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── OAuth connect modal ───────────────────────────────────────────────────────

function OAuthConnectModal({
  claim,
  onClose,
}: {
  claim: HandleClaim;
  onClose: () => void;
}) {
  const t = useTranslations('HandlesSection');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const platform = claim.handle.platform;
  const provider = platformOAuthProvider(platform);
  const intent   = platformOAuthIntent(platform);
  const platformLabel = PLATFORM_LABELS[platform as HandlePlatform] ?? platform;
  // The brand the user actually authorizes against. Usually the platform
  // itself; YouTube is authorized through Google.
  const authBrand = provider === 'google' ? 'Google' : platformLabel;

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Mirror the login page's handshake so the shared /oauth/callback page
      // accepts the round-trip (nonce) and returns the creator to this page
      // (next) instead of /dashboard once verification completes.
      sessionStorage.setItem('oauth_nonce', crypto.randomUUID());
      sessionStorage.setItem(OAUTH_NEXT_KEY, window.location.pathname);
      // Mark this as a handle-verification round-trip (vs a login) and carry the
      // handle so the callback page can always report the outcome on return.
      sessionStorage.setItem(OAUTH_VERIFY_KEY, claim.handle.username);

      // Pass the specific handle so the backend scopes verification to it and
      // can report the per-handle result (also fixes YouTube/brand multi-channel).
      const res = await authApi.oauthRedirect(provider, {
        handleId: claim.handle.id,
        ...(intent ? { intent } : {}),
      });
      window.location.href = res.url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('oauth.startFailed'), 'error');
      setLoading(false);
    }
  };

  return (
    <Modal title={t('oauth.title', { platform: platformLabel })} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {t.rich('oauth.intro', {
            platform: platformLabel,
            brand: authBrand,
            strong: (chunks) => <span className="text-foreground">{chunks}</span>,
          })}
        </p>
        <Banner tone="default">
          {t.rich('oauth.ownerNote', {
            brand: authBrand,
            username: claim.handle.username,
            strong: (chunks) => <span className="text-foreground">{chunks}</span>,
          })}
        </Banner>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleConnect} disabled={loading}>
            {loading ? t('oauth.redirecting') : (
              <>
                <BrandIcon slug={platform} className="w-4 h-4 shrink-0" />
                {t('oauth.connectButton', { platform: platformLabel })}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main handles section ──────────────────────────────────────────────────────

export default function HandlesSection({ bare = false }: { bare?: boolean } = {}) {
  const t = useTranslations('HandlesSection');
  const { toast } = useToast();

  const [claims, setClaims] = useState<HandleClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Add handle inline form. Platform starts unset so the dropdown reads
  // "Select a platform" instead of pre-committing the creator to Twitter.
  const [addPlatform, setAddPlatform] = useState<HandlePlatform | ''>('');
  const [addUsername, setAddUsername] = useState('');
  const [adding, setAdding] = useState(false);
  // When the creator already has at least one claim, collapse the add form
  // behind a "+ add another handle" button. Without this gate, creators tend
  // to keep filling out fields without realizing they still need to click
  // "request admin review" on the handle they just added.
  const [showAddForm, setShowAddForm] = useState(false);

  // Modals
  const [reviewingClaim, setReviewingClaim] = useState<HandleClaim | null>(null);
  const [oauthClaim, setOauthClaim] = useState<HandleClaim | null>(null);

  // Remove confirmation
  const [removingClaimId, setRemovingClaimId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<HandleClaim | null>(null);
  // When the backend blocks removal because the handle is still referenced by
  // active bounties, we swap the remove modal into a "contact support" view
  // instead of dismissing with a toast — this is unrecoverable from the UI.
  const [removeBlocked, setRemoveBlocked] = useState<{ bountyCount: number } | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.myHandles();
      setClaims(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // (The OAuth handle-verification outcome is toasted by the /oauth/callback
  // page itself now — it's always mounted and the toast survives the redirect,
  // so the success/failure message no longer depends on this page re-mounting.)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPlatform || !addUsername.trim()) return;
    setAdding(true);
    try {
      const res = await handlesApi.store(addPlatform, addUsername.trim());
      toast(
        res.already_claimed
          ? t('add.alreadyClaimedToast')
          : t('add.addedToast'),
        'success',
      );
      setAddUsername('');
      setAddPlatform('');
      setShowAddForm(false);
      setClaims((prev) => {
        const exists = prev.some((c) => c.claim_id === res.data.claim_id);
        return exists ? prev : [res.data, ...prev];
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('add.addFailed'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemovingClaimId(removeTarget.claim_id);
    try {
      await handlesApi.destroy(removeTarget.claim_id);
      toast(t('remove.removedToast'), 'success');
      setClaims((prev) => prev.filter((c) => c.claim_id !== removeTarget.claim_id));
      setRemoveTarget(null);
    } catch (err: unknown) {
      const e = err as { status?: number; reason?: string; message?: string; data?: Record<string, unknown> };
      // Verified handle still referenced by bounties — keep the modal open
      // and swap to the "contact admins" view instead of just toasting.
      if (e.status === 422 && e.reason === 'handle_in_use') {
        const count = Number(e.data?.bounty_count ?? 0);
        setRemoveBlocked({ bountyCount: count });
      } else {
        toast(e.message ?? t('remove.removeFailed'), 'error');
        setRemoveTarget(null);
      }
    } finally {
      setRemovingClaimId(null);
    }
  };

  const closeRemoveModals = () => {
    setRemoveTarget(null);
    setRemoveBlocked(null);
  };

  const handleReviewSubmitted = (updated: HandleClaim) => {
    setClaims((prev) => prev.map((c) => c.claim_id === updated.claim_id ? updated : c));
    setReviewingClaim(null);
  };

  const body = (
    <>
        {/* Existing handle list */}
        {loading ? (
          <div className="text-sm text-muted font-mono mb-4">{t('list.loading')}</div>
        ) : claims.length > 0 ? (
          <ul className={`divide-y divide-border mb-4 border-y border-border ${bare ? '' : '-mx-5'}`}>
            {claims.map((claim) => {
              const platform = claim.handle.platform as HandlePlatform;
              const platformLabel = PLATFORM_LABELS[platform] ?? platform;
              const supportsOAuth = ENABLED_OAUTH_PLATFORMS.includes(platform);
              const pendingReview = claim.status === 'unverified' && claim.pending_review;

              return (
                <li key={claim.claim_id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground font-mono">{formatPlatformHandle(platform, claim.handle.username)}</span>
                        <span className="text-xs text-muted">{platformLabel}</span>
                        {claim.status === 'verified' ? (
                          <Badge tone="good">{t('list.badgeVerified')}</Badge>
                        ) : pendingReview ? (
                          <Badge tone="warn">{t('list.badgePendingReview')}</Badge>
                        ) : (
                          <Badge tone="default">{t('list.badgeUnverified')}</Badge>
                        )}
                      </div>
                      {pendingReview && claim.contact_message && (
                        <p className="font-mono text-[10px] text-muted mt-1 truncate">
                          {t('list.messagePrefix')} {claim.contact_message}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRemoveTarget(claim)}
                      disabled={removingClaimId === claim.claim_id}
                    >
                      {removingClaimId === claim.claim_id ? '…' : t('list.remove')}
                    </Button>
                  </div>

                  {/* Verification options for unverified claims */}
                  {claim.status === 'unverified' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supportsOAuth && (
                        <Button size="sm" variant="primary" onClick={() => setOauthClaim(claim)}>
                          <BrandIcon slug={platform} className="w-3.5 h-3.5 shrink-0" />
                          {t('list.connectVia', { platform: platformLabel })}
                        </Button>
                      )}
                      {/* If OAuth is available, it's the preferred path — keep
                          admin review as the secondary (default) option. If no
                          OAuth path exists, admin review is the *only* way to
                          verify, so promote it to the primary button so the
                          creator can't miss it. */}
                      <Button
                        size="sm"
                        variant={supportsOAuth ? 'default' : 'primary'}
                        onClick={() => setReviewingClaim(claim)}
                      >
                        {pendingReview ? t('list.updateReviewRequest') : t('list.requestAdminReview')}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Add handle form — shown upfront only when no handles exist yet.
            Once at least one claim is on file, collapse behind a button so
            creators are nudged toward verifying the handle they just added
            rather than mindlessly piling on more. */}
        {claims.length === 0 || showAddForm ? (
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <FieldLabel>{t('add.platformLabel')}</FieldLabel>
              <Select
                value={addPlatform}
                onChange={(e) => setAddPlatform(e.target.value as HandlePlatform | '')}
              >
                <option value="">{t('add.selectPlatform')}</option>
                {PLATFORMS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>

            {addPlatform && (
              <PlatformHandleInput
                platform={addPlatform}
                value={addUsername}
                onChange={setAddUsername}
                disabled={adding}
              />
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={adding || !addPlatform || !addUsername.trim()}
              >
                {adding ? t('add.adding') : t('add.addHandle')}
              </Button>
              {claims.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddPlatform('');
                    setAddUsername('');
                  }}
                  disabled={adding}
                >
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            {t('add.addAnother')}
          </Button>
        )}

        {/* Verification nudge — eye-catching so a lost creator can't miss it.
            Copy flips once any unverified claim has been submitted for admin
            review: stops asking them to "go verify it" and instead reassures
            them that the request is in flight. */}
        {claims.some((c) => c.status === 'unverified') && (
          <div className="mt-4">
            {claims.some((c) => c.status === 'unverified' && c.pending_review) ? (
              <Banner tone="default">
                {t.rich('nudge.submitted', {
                  bold: (chunks) => <span className="font-bold text-foreground">{chunks}</span>,
                  phone: (chunks) => <a href="tel:+17273701237" className="underline text-foreground">{chunks}</a>,
                })}
              </Banner>
            ) : (
              <Banner tone="warn">
                {t.rich('nudge.unverified', {
                  bold: (chunks) => <span className="font-bold text-foreground">{chunks}</span>,
                })}
              </Banner>
            )}
          </div>
        )}
    </>
  );

  return (
    <div id="handles">
      {bare ? body : (
        <Card>
          <SectionLabel className="mb-3">{t('sectionLabel')}</SectionLabel>
          <p className="text-sm text-muted mb-4">
            {t('description')}
          </p>
          {body}
        </Card>
      )}

      {/* Admin review request modal */}
      {reviewingClaim && (
        <RequestReviewModal
          claim={reviewingClaim}
          onClose={() => setReviewingClaim(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {/* OAuth connect modal */}
      {oauthClaim && (
        <OAuthConnectModal
          claim={oauthClaim}
          onClose={() => setOauthClaim(null)}
        />
      )}

      {/* Remove confirmation modal */}
      {removeTarget && !removeBlocked && (
        <Modal title={t('removeModal.title')} onClose={closeRemoveModals}>
          <div className="space-y-4">
            {removeTarget.status === 'verified' && (
              <Banner tone="warn">
                {t('removeModal.verifiedWarning')}
              </Banner>
            )}
            <p className="text-sm text-muted">
              {t.rich('removeModal.confirm', {
                username: removeTarget.handle.username,
                platform: PLATFORM_LABELS[removeTarget.handle.platform as HandlePlatform] ?? removeTarget.handle.platform,
                handle: (chunks) => <span className="font-mono text-foreground">{chunks}</span>,
              })}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={closeRemoveModals}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={handleRemove} disabled={removingClaimId !== null}>
                {removingClaimId !== null ? t('removeModal.removing') : t('removeModal.removeButton')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Contact-admins modal — appears when the backend blocks removal because
          the verified handle is still referenced by active bounties. */}
      {removeTarget && removeBlocked && (
        <Modal title={t('blockedModal.title')} onClose={closeRemoveModals}>
          <div className="space-y-4">
            <Banner tone="bad">
              {t.rich('blockedModal.referenced', {
                username: removeTarget.handle.username,
                platform: PLATFORM_LABELS[removeTarget.handle.platform as HandlePlatform] ?? removeTarget.handle.platform,
                count: removeBlocked.bountyCount,
                mono: (chunks) => <span className="font-mono">{chunks}</span>,
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </Banner>
            <p className="text-sm text-muted">
              {t('blockedModal.explanation')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={closeRemoveModals}>{t('common.close')}</Button>
              <a
                href="/support"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold bg-fan text-black rounded-lg hover:opacity-90 transition-opacity"
                onClick={closeRemoveModals}
              >
                {t('blockedModal.contactSupport')}
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
