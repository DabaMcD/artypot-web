'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { AdminHandleReview, HandlePlatform } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';
import { Empty } from '@/components/ui/Empty';

const PLATFORM_LABELS: Record<HandlePlatform, string> = {
  youtube:   'YouTube',
  twitter:   'X / Twitter',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  twitch:    'Twitch',
  bluesky:   'Bluesky',
};

// ── Review modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  handle,
  onClose,
  onDone,
}: {
  handle: AdminHandleReview;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [loading, setLoading] = useState(false);

  const claim = handle.claims[0];
  const platformLabel = PLATFORM_LABELS[handle.platform as HandlePlatform] ?? handle.platform;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (decision === 'approve') {
        await adminApi.approveHandle(handle.id);
        toast('Handle verified.', 'success');
      } else {
        await adminApi.rejectHandle(handle.id);
        toast('Handle claim rejected.', 'error');
      }
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to submit decision.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`review @${handle.username}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>cancel</Button>
          <Button
            variant={decision === 'approve' ? 'primary' : 'danger'}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'submitting…' : decision === 'approve' ? 'approve & verify' : 'reject claim'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="font-display text-sm text-muted">
          <span className="text-foreground font-medium">@{handle.username}</span> on{' '}
          <span className="text-foreground">{platformLabel}</span>
        </div>

        {claim && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-sm text-foreground">{claim.user.display_name}</span>
              <span className="font-mono text-[10px] text-muted">{claim.user.email}</span>
            </div>

            <Card>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">contact message from claimant</div>
              {claim.contact_message ? (
                <p className="font-display text-sm text-foreground whitespace-pre-wrap break-words">{claim.contact_message}</p>
              ) : (
                <p className="font-display text-sm text-muted italic">no message provided</p>
              )}
            </Card>
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDecision('approve')}
            className={`flex-1 py-2 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
              decision === 'approve'
                ? 'bg-good/10 border-good/40 text-good'
                : 'bg-surface border-border text-muted hover:border-good/30'
            }`}
          >
            ✓ approve
          </button>
          <button
            type="button"
            onClick={() => setDecision('reject')}
            className={`flex-1 py-2 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
              decision === 'reject'
                ? 'bg-bad/10 border-bad/40 text-bad'
                : 'bg-surface border-border text-muted hover:border-bad/30'
            }`}
          >
            ✕ reject
          </button>
        </div>

        {decision === 'approve' && (
          <Banner tone="warn">
            approving this claim will verify the handle and reject any competing claims from other users.
          </Banner>
        )}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminHandlesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [handles, setHandles] = useState<AdminHandleReview[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<AdminHandleReview | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchHandles = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listHandleReviews(page);
      setHandles(res.data);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') fetchHandles(1);
  }, [user, fetchHandles]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <>
      {reviewing && (
        <ReviewModal
          handle={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            fetchHandles(currentPage);
          }}
        />
      )}

      <div className="space-y-6 pt-2 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">handle verification</h1>
            <p className="font-display text-sm text-muted mt-1">{total} pending {total === 1 ? 'request' : 'requests'}</p>
          </div>
          <Link href="/admin"><Button variant="ghost" size="sm">← admin</Button></Link>
        </div>

        {loading ? (
          <Card>
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : handles.length === 0 ? (
          <Empty>no pending handle verification requests.</Empty>
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {handles.map((handle) => {
                const claim = handle.claims[0];
                const platformLabel = PLATFORM_LABELS[handle.platform as HandlePlatform] ?? handle.platform;
                return (
                  <div key={handle.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-sm text-foreground">@{handle.username}</span>
                        <Badge tone="default">{platformLabel}</Badge>
                        {claim?.verification_method === 'admin' ? (
                          <Badge tone="warn">admin review</Badge>
                        ) : (
                          <Badge tone="default">pending</Badge>
                        )}
                      </div>
                      {claim && (
                        <>
                          <p className="font-display text-sm text-muted">
                            claimed by{' '}
                            <span className="text-foreground">{claim.user.display_name}</span>
                            {' '}<span className="text-muted/70 font-mono text-[10px]">{claim.user.email}</span>
                          </p>
                          {claim.contact_message && (
                            <p className="font-mono text-[10px] text-muted/70 mt-0.5 truncate max-w-sm">
                              {claim.contact_message}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <Button variant="default" size="sm" onClick={() => setReviewing(handle)}>
                      review →
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {lastPage > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="default"
              size="sm"
              disabled={currentPage === 1 || loading}
              onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchHandles(p); }}
            >
              ← prev
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {currentPage} / {lastPage}
            </span>
            <Button
              variant="default"
              size="sm"
              disabled={currentPage === lastPage || loading}
              onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchHandles(p); }}
            >
              next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
