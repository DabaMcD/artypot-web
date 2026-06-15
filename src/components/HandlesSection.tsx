'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth as authApi, handles as handlesApi } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import type { HandleClaim, HandlePlatform } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { FieldLabel, FieldHint, Textarea, Select } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import { PlatformHandleInput, PLATFORM_HANDLE_CONFIG } from '@/components/ui/PlatformHandleInput';
import {
  ALL_PLATFORMS,
  CURATED_PLATFORMS,
  OAUTH_PLATFORMS,
  ENABLED_OAUTH_PLATFORMS,
  OTHER_SLUG,
  platformLabel,
  platformOAuthProvider,
  platformOAuthIntent,
} from '@/lib/platforms';
import { OAUTH_NEXT_KEY } from '@/lib/next-redirect';

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

// Avoid "imported but unused" warnings in static lints — these symbols are
// referenced via the imports themselves but we want explicit re-exports for
// any consumer that does `import { OAUTH_PLATFORMS } from './HandlesSection'`.
export { OAUTH_PLATFORMS, ENABLED_OAUTH_PLATFORMS, OTHER_SLUG, CURATED_PLATFORMS };

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
  const { toast } = useToast();
  const [message, setMessage] = useState(claim.contact_message ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError('Please provide at least a sentence so admins know how to reach you.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await handlesApi.requestReview(claim.claim_id, message.trim());
      toast('Review request submitted — we\'ll be in touch.', 'success');
      onSubmitted(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const platformLabel = PLATFORM_LABELS[claim.handle.platform as HandlePlatform] ?? claim.handle.platform;
  const alreadySubmitted = claim.pending_review;

  return (
    <Modal title={`verify @${claim.handle.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          How can we quickly get in touch? Let&apos;s chat so we can verify your{' '}
          <span className="text-foreground">{platformLabel}</span> account ownership.
        </p>

        <div>
          <FieldLabel>contact message <span className="text-bad">*</span></FieldLabel>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="DM me on Discord @username, or call me in the next 3 hours at (555) 555-5555"
            autoFocus
          />
          <FieldHint>This is only visible to Artypot admins.</FieldHint>
        </div>

        {alreadySubmitted && (
          <Banner tone="default">
            You already submitted this for review. Updating your message will resubmit it.
          </Banner>
        )}

        {error && <Banner tone="bad">{error}</Banner>}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting || message.trim().length < 10}>
            {submitting ? 'Submitting…' : alreadySubmitted ? 'Resubmit for Review' : 'Submit for Review'}
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

      // Pass the specific handle so the backend scopes verification to it
      // (relevant for YouTube, where one Google account can own many channels).
      const res = await authApi.oauthRedirect(
        provider,
        intent ? { intent, handleId: claim.handle.id } : undefined,
      );
      window.location.href = res.url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to start OAuth. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <Modal title={`connect ${platformLabel}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Connect your <span className="text-foreground">{platformLabel}</span>{' '}account via OAuth for instant verification.
          You&apos;ll be redirected to {authBrand} to authorize the connection, then brought back here.
        </p>
        <Banner tone="default">
          Make sure you&apos;re using the {authBrand} account that owns{' '}
          <span className="text-foreground">@{claim.handle.username}</span>.
        </Banner>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={handleConnect} disabled={loading}>
            {loading ? 'Redirecting…' : `Connect ${platformLabel} →`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main handles section ──────────────────────────────────────────────────────

export default function HandlesSection({ bare = false }: { bare?: boolean } = {}) {
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPlatform || !addUsername.trim()) return;
    setAdding(true);
    try {
      const res = await handlesApi.store(addPlatform, addUsername.trim());
      toast(
        res.already_claimed
          ? 'You already have a claim on this handle.'
          : 'Handle added.',
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
      toast(e.message ?? 'Failed to add handle.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemovingClaimId(removeTarget.claim_id);
    try {
      await handlesApi.destroy(removeTarget.claim_id);
      toast('Handle removed.', 'success');
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
        toast(e.message ?? 'Failed to remove handle.', 'error');
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
          <div className="text-sm text-muted font-mono mb-4">loading handles…</div>
        ) : claims.length > 0 ? (
          <ul className={`divide-y divide-border mb-4 border-y border-border ${bare ? '' : '-mx-5'}`}>
            {claims.map((claim) => {
              const platform = claim.handle.platform as HandlePlatform;
              const platformLabel = PLATFORM_LABELS[platform] ?? platform;
              const supportsOAuth = ENABLED_OAUTH_PLATFORMS.includes(platform);
              const pendingReview = claim.status === 'unverified' && claim.pending_review;
              const prefix = PLATFORM_HANDLE_CONFIG[platform]?.prefix ?? '@';

              return (
                <li key={claim.claim_id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground font-mono">{prefix}{claim.handle.username}</span>
                        <span className="text-xs text-muted">{platformLabel}</span>
                        {claim.status === 'verified' ? (
                          <Badge tone="good">verified</Badge>
                        ) : pendingReview ? (
                          <Badge tone="warn">pending review</Badge>
                        ) : (
                          <Badge tone="default">unverified</Badge>
                        )}
                      </div>
                      {pendingReview && claim.contact_message && (
                        <p className="font-mono text-[10px] text-muted mt-1 truncate">
                          message: {claim.contact_message}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRemoveTarget(claim)}
                      disabled={removingClaimId === claim.claim_id}
                    >
                      {removingClaimId === claim.claim_id ? '…' : 'Remove'}
                    </Button>
                  </div>

                  {/* Verification options for unverified claims */}
                  {claim.status === 'unverified' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supportsOAuth && (
                        <Button size="sm" variant="primary" onClick={() => setOauthClaim(claim)}>
                          Connect via {platformLabel} →
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
                        {pendingReview ? 'Update Review Request' : 'Request Admin Review'}
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
              <FieldLabel>platform</FieldLabel>
              <Select
                value={addPlatform}
                onChange={(e) => setAddPlatform(e.target.value as HandlePlatform | '')}
              >
                <option value="">Select a platform</option>
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
                {adding ? 'Adding…' : 'Add Handle →'}
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
                  Cancel
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
            + add another handle
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
                <span className="font-bold text-foreground">Review request submitted.</span>{' '}
                Please be patient, and Baldwig will reach out as soon as possible!
                Or you can try your luck and call Baldwig directly at{' '}
                <a href="tel:+17273701237" className="underline text-foreground">+1 (727) 370-1237</a>.
                He&apos;ll never admit it, but he&apos;s lonely af. He&apos;s never so much as
                walked hand in hand with a woman before. If you&apos;re a guy, you should
                definitely call him, but if you&apos;re a girl you should DEFINITELY call him.
              </Banner>
            ) : (
              <Banner tone="warn">
                <span className="font-bold text-foreground">You&apos;ve added a handle — now verify it.</span>{' '}
                Connect via OAuth or request admin review using the buttons above.
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
          <SectionLabel className="mb-3">handles</SectionLabel>
          <p className="text-sm text-muted mb-4">
            Connect your social accounts to verify your identity as a creator.
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
        <Modal title="Remove Handle?" onClose={closeRemoveModals}>
          <div className="space-y-4">
            {removeTarget.status === 'verified' && (
              <Banner tone="warn">
                This action cannot be undone. To add this handle back in the future,
                you will need to go through the verification process again.
                If any bounty currently targets this handle, removal requires admin assistance.
              </Banner>
            )}
            <p className="text-sm text-muted">
              Remove <span className="font-mono text-foreground">@{removeTarget.handle.username}</span>{' '}
              on {PLATFORM_LABELS[removeTarget.handle.platform as HandlePlatform] ?? removeTarget.handle.platform}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={closeRemoveModals}>Cancel</Button>
              <Button variant="danger" onClick={handleRemove} disabled={removingClaimId !== null}>
                {removingClaimId !== null ? 'Removing…' : 'Remove Handle'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Contact-admins modal — appears when the backend blocks removal because
          the verified handle is still referenced by active bounties. */}
      {removeTarget && removeBlocked && (
        <Modal title="Contact admins to remove" onClose={closeRemoveModals}>
          <div className="space-y-4">
            <Banner tone="bad">
              <span className="font-mono">@{removeTarget.handle.username}</span>{' '}
              on {PLATFORM_LABELS[removeTarget.handle.platform as HandlePlatform] ?? removeTarget.handle.platform}{' '}
              is currently referenced by{' '}
              <strong className="text-foreground">
                {removeBlocked.bountyCount} {removeBlocked.bountyCount === 1 ? 'bounty' : 'bounties'}
              </strong>.
            </Banner>
            <p className="text-sm text-muted">
              Verified handles tied to live bounties can&apos;t be removed from your account
              automatically — doing so would orphan those bounties from their verified owner.
              Please reach out to the Artypot team and they&apos;ll handle removal for you.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={closeRemoveModals}>Close</Button>
              <a
                href="/support"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold bg-fan text-black rounded-lg hover:opacity-90 transition-opacity"
                onClick={closeRemoveModals}
              >
                Contact support →
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
