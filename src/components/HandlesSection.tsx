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
} from '@/lib/platforms';

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
  const alreadySubmitted = claim.verification_method === 'admin' && !!claim.contact_message;

  return (
    <Modal title={`verify @${claim.handle.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Leave a message telling admins how they can confirm you own this{' '}
          <span className="text-foreground">{platformLabel}</span> account.
          For example, an email address, a DM handle on another platform, or a link to a post you can make.
        </p>

        <div>
          <FieldLabel>contact message <span className="text-bad">*</span></FieldLabel>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="e.g. DM me on Discord @username, or email me at hello@example.com"
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

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await authApi.oauthRedirect(claim.handle.platform);
      window.location.href = res.url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to start OAuth. Please try again.', 'error');
      setLoading(false);
    }
  };

  const platformLabel = PLATFORM_LABELS[claim.handle.platform as HandlePlatform] ?? claim.handle.platform;

  return (
    <Modal title={`connect ${platformLabel}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Connect your <span className="text-foreground">{platformLabel}</span>{' '}account via OAuth for instant verification.
          You&apos;ll be redirected to {platformLabel} to authorize the connection, then brought back here.
        </p>
        <Banner tone="default">
          Make sure you&apos;re logged in to <span className="text-foreground">@{claim.handle.username}</span> on {platformLabel} before continuing.
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

  // Add handle inline form
  const [addPlatform, setAddPlatform] = useState<HandlePlatform>('twitter');
  const [addUsername, setAddUsername] = useState('');
  const [adding, setAdding] = useState(false);

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
    if (!addUsername.trim()) return;
    setAdding(true);
    try {
      const res = await handlesApi.store(addPlatform, addUsername.trim());
      toast('Handle added.', 'success');
      setAddUsername('');
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
              const pendingReview = claim.status === 'unverified' && claim.verification_method === 'admin';
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
                      <Button size="sm" variant="default" onClick={() => setReviewingClaim(claim)}>
                        {pendingReview ? 'Update Review Request' : 'Request Admin Review'}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Add handle inline form */}
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <FieldLabel>platform</FieldLabel>
            <Select value={addPlatform} onChange={(e) => setAddPlatform(e.target.value as HandlePlatform)}>
              {PLATFORMS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>

          <PlatformHandleInput
            platform={addPlatform}
            value={addUsername}
            onChange={setAddUsername}
            disabled={adding}
          />

          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={adding || !addUsername.trim()}
          >
            {adding ? 'Adding…' : 'Add Handle →'}
          </Button>
        </form>
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
