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

const PLATFORMS: { value: HandlePlatform; label: string }[] = [
  { value: 'youtube',   label: 'YouTube' },
  { value: 'twitter',   label: 'X / Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'twitch',    label: 'Twitch' },
  { value: 'bluesky',   label: 'Bluesky' },
];

const PLATFORM_LABELS: Record<HandlePlatform, string> = Object.fromEntries(
  PLATFORMS.map(({ value, label }) => [value, label])
) as Record<HandlePlatform, string>;

/**
 * Platforms that expose an OAuth-based instant verification path.
 * Currently every handle platform supports OAuth — providers that aren't
 * yet wired up on the backend will surface a clear error on redirect.
 */
const OAUTH_PLATFORMS: HandlePlatform[] = ['twitter', 'twitch', 'youtube', 'instagram', 'tiktok', 'bluesky'];

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
        <p className="font-display text-sm text-muted">
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
            you already submitted this for review. updating your message will resubmit it.
          </Banner>
        )}

        {error && <Banner tone="bad">{error}</Banner>}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting || message.trim().length < 10}>
            {submitting ? 'submitting…' : alreadySubmitted ? 'resubmit for review' : 'submit for review'}
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
        <p className="font-display text-sm text-muted">
          Connect your <span className="text-foreground">{platformLabel}</span> account via OAuth for instant verification.
          You&apos;ll be redirected to {platformLabel} to authorize the connection, then brought back here.
        </p>
        <Banner tone="default">
          make sure you&apos;re logged in to <span className="text-foreground">@{claim.handle.username}</span> on {platformLabel} before continuing.
        </Banner>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>cancel</Button>
          <Button variant="primary" onClick={handleConnect} disabled={loading}>
            {loading ? 'redirecting…' : `connect ${platformLabel} →`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main handles section ──────────────────────────────────────────────────────

export default function HandlesSection() {
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
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to remove handle.', 'error');
    } finally {
      setRemovingClaimId(null);
      setRemoveTarget(null);
    }
  };

  const handleReviewSubmitted = (updated: HandleClaim) => {
    setClaims((prev) => prev.map((c) => c.claim_id === updated.claim_id ? updated : c));
    setReviewingClaim(null);
  };

  return (
    <div id="handles">
      <Card>
        <SectionLabel className="mb-3">handles</SectionLabel>
        <p className="font-display text-sm text-muted mb-4">
          connect your social accounts to verify your identity as a creator.
        </p>

        {/* Existing handle list */}
        {loading ? (
          <div className="text-sm text-muted font-mono mb-4">loading handles…</div>
        ) : claims.length > 0 ? (
          <ul className="divide-y divide-border -mx-5 mb-4 border-y border-border">
            {claims.map((claim) => {
              const platform = claim.handle.platform as HandlePlatform;
              const platformLabel = PLATFORM_LABELS[platform] ?? platform;
              const supportsOAuth = OAUTH_PLATFORMS.includes(platform);
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
                      {removingClaimId === claim.claim_id ? '…' : 'remove'}
                    </Button>
                  </div>

                  {/* Verification options for unverified claims */}
                  {claim.status === 'unverified' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supportsOAuth && (
                        <Button size="sm" variant="primary" onClick={() => setOauthClaim(claim)}>
                          connect via {platformLabel} →
                        </Button>
                      )}
                      <Button size="sm" variant="default" onClick={() => setReviewingClaim(claim)}>
                        {pendingReview ? 'update review request' : 'request admin review'}
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
            {adding ? 'adding…' : 'add handle →'}
          </Button>
        </form>
      </Card>

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
      {removeTarget && (
        <Modal title="remove handle?" onClose={() => setRemoveTarget(null)}>
          <div className="space-y-4">
            {removeTarget.status === 'verified' && (
              <Banner tone="warn">
                removing a verified handle will disconnect it from your account. pending bounties will not be affected.
              </Banner>
            )}
            <p className="font-display text-sm text-muted">
              Remove <span className="font-mono text-foreground">@{removeTarget.handle.username}</span>{' '}
              on {PLATFORM_LABELS[removeTarget.handle.platform as HandlePlatform] ?? removeTarget.handle.platform}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setRemoveTarget(null)}>cancel</Button>
              <Button variant="danger" onClick={handleRemove} disabled={removingClaimId !== null}>
                {removingClaimId !== null ? 'removing…' : 'remove handle'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
