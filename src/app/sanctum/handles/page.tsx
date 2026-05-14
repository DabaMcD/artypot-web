'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth as authApi, handles as handlesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { HandleClaim, HandlePlatform } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, FieldLabel, FieldHint } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import { Empty } from '@/components/ui/Empty';

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

const VERIFICATION_INSTRUCTIONS: Record<HandlePlatform, string> = {
  youtube:   'Add the code to your YouTube channel description, then click "Check Verification".',
  twitter:   'Add the code to your X / Twitter bio, then click "Check Verification".',
  instagram: 'Add the code to your Instagram bio, then click "Check Verification".',
  tiktok:    'Add the code to your TikTok bio, then click "Check Verification".',
  twitch:    'Add the code to your Twitch profile bio, then click "Check Verification".',
  bluesky:   'Add the code to your Bluesky profile description, then click "Check Verification".',
};

export default function HandlesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<HandleClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);

  // Add handle modal
  const [showAdd, setShowAdd] = useState(false);
  const [addPlatform, setAddPlatform] = useState<HandlePlatform>('youtube');
  const [addUsername, setAddUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  // Verify modal
  const [verifyingClaim, setVerifyingClaim] = useState<HandleClaim | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Remove confirmation
  const [removingClaimId, setRemovingClaimId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<HandleClaim | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const fetchClaims = useCallback(async () => {
    setLoadingClaims(true);
    try {
      const res = await authApi.myHandles();
      setClaims(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingClaims(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchClaims();
  }, [user, fetchClaims]);

  const handleAdd = async () => {
    if (!addUsername.trim()) { setAddError('Handle is required.'); return; }
    setAddError('');
    setAdding(true);
    try {
      await handlesApi.store(addPlatform, addUsername.trim());
      toast('Handle added.', 'success');
      setShowAdd(false);
      setAddUsername('');
      setAddPlatform('youtube');
      fetchClaims();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setAddError(e.message ?? 'Failed to add handle.');
    } finally {
      setAdding(false);
    }
  };

  const openVerify = async (claim: HandleClaim) => {
    setVerifyingClaim(claim);
    setVerifyCode('');
    setVerifyError('');
    setLoadingCode(true);
    try {
      const res = await handlesApi.requestVerification(claim.handle.id);
      setVerifyCode(res.verification_code);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setVerifyError(e.message ?? 'Failed to get verification code.');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!verifyingClaim) return;
    setChecking(true);
    setVerifyError('');
    try {
      await handlesApi.verify(verifyingClaim.claim_id);
      toast('Handle verified!', 'success');
      setVerifyingClaim(null);
      fetchClaims();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setVerifyError(e.message ?? 'Verification failed. Make sure the code is in your profile.');
    } finally {
      setChecking(false);
    }
  };

  const confirmRemove = (claim: HandleClaim) => {
    setRemoveTarget(claim);
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

  if (loading || !user) return null;

  return (
    <div className="space-y-7 pt-2">
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>creator · settings</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">handles</h1>
          <p className="font-display text-sm text-muted mt-1">connect your social accounts to verify your identity.</p>
        </div>
        <Button variant="primary" onClick={() => { setShowAdd(true); setAddError(''); setAddUsername(''); }}>
          + add handle
        </Button>
      </div>

      {loadingClaims ? (
        <div className="text-sm text-muted font-mono">loading…</div>
      ) : claims.length === 0 ? (
        <Card>
          <Empty>no handles yet — add one to get started.</Empty>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {claims.map((claim) => (
              <li key={claim.claim_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground font-mono">@{claim.handle.username}</span>
                    <span className="text-xs text-muted">{PLATFORM_LABELS[claim.handle.platform as HandlePlatform] ?? claim.handle.platform}</span>
                  </div>
                  <div className="mt-0.5">
                    {claim.status === 'verified' ? (
                      <Badge tone="good">verified</Badge>
                    ) : (
                      <Badge tone="default">unverified — tap to verify</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {claim.status === 'unverified' && (
                    <Button size="sm" variant="default" onClick={() => openVerify(claim)}>
                      verify
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => confirmRemove(claim)}
                    disabled={removingClaimId === claim.claim_id}
                  >
                    {removingClaimId === claim.claim_id ? '…' : 'remove'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Add handle modal */}
      {showAdd && (
        <Modal title="add handle" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <FieldLabel>platform</FieldLabel>
              <Select value={addPlatform} onChange={(e) => setAddPlatform(e.target.value as HandlePlatform)}>
                {PLATFORMS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>handle <span className="text-bad">*</span></FieldLabel>
              <Input
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder={addPlatform === 'youtube' ? '@yourchannel' : '@handle'}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                autoFocus
              />
              {addPlatform === 'youtube' && (
                <FieldHint>YouTube handles start with @. Find yours on your channel page. Don&apos;t paste the full URL.</FieldHint>
              )}
            </div>
            {addError && <Banner tone="bad">{addError}</Banner>}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>cancel</Button>
              <Button variant="primary" onClick={handleAdd} disabled={adding}>
                {adding ? 'adding…' : 'add handle'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Verify modal */}
      {verifyingClaim && (
        <Modal
          title={`verify @${verifyingClaim.handle.username}`}
          onClose={() => setVerifyingClaim(null)}
        >
          <div className="space-y-4">
            {loadingCode ? (
              <p className="text-sm text-muted font-mono">loading verification code…</p>
            ) : verifyCode ? (
              <>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">your verification code</div>
                  <div className="font-mono text-lg text-creator bg-surface-2 rounded px-3 py-2 border border-border select-all">
                    {verifyCode}
                  </div>
                </div>
                <p className="text-sm text-muted">
                  {VERIFICATION_INSTRUCTIONS[verifyingClaim.handle.platform as HandlePlatform] ?? VERIFICATION_INSTRUCTIONS.twitter}
                </p>
              </>
            ) : null}
            {verifyError && <Banner tone="bad">{verifyError}</Banner>}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setVerifyingClaim(null)}>cancel</Button>
              {verifyCode && (
                <Button variant="primary" onClick={handleCheckVerification} disabled={checking || loadingCode}>
                  {checking ? 'checking…' : 'check verification'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Remove confirmation modal */}
      {removeTarget && (
        <Modal title="remove handle?" onClose={() => setRemoveTarget(null)}>
          <div className="space-y-4">
            {removeTarget.status === 'verified' && (
              <Banner tone="warn">
                Removing this handle will disconnect it from your account. Pending bounties will not be affected.
              </Banner>
            )}
            <p className="text-sm text-muted">
              Remove <span className="font-mono text-foreground">@{removeTarget.handle.username}</span> on {PLATFORM_LABELS[removeTarget.handle.platform as HandlePlatform] ?? removeTarget.handle.platform}?
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
