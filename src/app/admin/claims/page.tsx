'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { AdminCreatorClaim, CreatorClaimStatus } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea, FieldLabel } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const CLAIM_TONES: Record<CreatorClaimStatus, 'warn' | 'good' | 'bad'> = {
  pending:  'warn',
  approved: 'good',
  rejected: 'bad',
};

// ── Review modal ────────────────────────────────────────────────────────────
function ReviewModal({
  claim,
  onClose,
  onDone,
}: {
  claim: AdminCreatorClaim;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.reviewClaim(claim.id, { status: decision, council_notes: notes || undefined });
      toast(decision === 'approved' ? 'Claim approved!' : 'Claim rejected.', decision === 'approved' ? 'success' : 'error');
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to submit review.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Review Claim"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant={decision === 'approved' ? 'primary' : 'danger'}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={loading}
          >
            {loading ? 'Submitting…' : decision === 'approved' ? 'Approve Claim' : 'Reject Claim'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          <span className="text-foreground">{claim.user.display_name}</span>{' '}
          <span className="text-muted/70">({claim.user.email})</span> claims{' '}
          <span className="text-creator">{claim.creator.display_name}</span>
        </p>

        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">contact info / proof</div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{claim.contact_info}</p>
        </Card>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDecision('approved')}
            className={`flex-1 py-2 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
              decision === 'approved'
                ? 'bg-good/10 border-good/40 text-good'
                : 'bg-surface border-border text-muted hover:border-good/30'
            }`}
          >
            ✓ approve
          </button>
          <button
            type="button"
            onClick={() => setDecision('rejected')}
            className={`flex-1 py-2 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
              decision === 'rejected'
                ? 'bg-bad/10 border-bad/40 text-bad'
                : 'bg-surface border-border text-muted hover:border-bad/30'
            }`}
          >
            ✕ reject
          </button>
        </div>

        <div>
          <FieldLabel>council notes <span className="text-muted/50 font-normal normal-case tracking-normal">(optional — sent to claimant)</span></FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Yo boiii glad to have u on board"
          />
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function AdminClaimsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [claims, setClaims] = useState<AdminCreatorClaim[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<AdminCreatorClaim | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchClaims = useCallback(async (status: StatusFilter, page: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listClaims(status, page);
      setClaims(res.data);
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
    if (user?.role === 'council') {
      fetchClaims(statusFilter, 1);
      setCurrentPage(1);
    }
  }, [statusFilter, user, fetchClaims]);

  if (authLoading || !user || user.role !== 'council') return null;

  const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: 'pending', value: 'pending' },
    { label: 'approved', value: 'approved' },
    { label: 'rejected', value: 'rejected' },
    { label: 'all', value: 'all' },
  ];

  return (
    <>
      {reviewing && (
        <ReviewModal
          claim={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            fetchClaims(statusFilter, currentPage);
          }}
        />
      )}

      <div className="space-y-6 pt-2 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">creator claims</h1>
            <p className="text-sm text-muted mt-1">{total} {total === 1 ? 'claim' : 'claims'}</p>
          </div>
          <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
          {STATUS_TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                statusFilter === value
                  ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Claims list */}
        {loading ? (
          <Card>
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : claims.length === 0 ? (
          <Empty message={`No ${statusFilter === 'all' ? '' : statusFilter + ' '}claims`} />
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {claims.map((claim) => (
                <div key={claim.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm text-foreground">{claim.user.display_name}</span>
                      <span className="font-mono text-[10px] text-muted">{claim.user.email}</span>
                      <Badge tone={CLAIM_TONES[claim.status]}>{claim.status}</Badge>
                    </div>
                    <p className="text-sm text-muted mb-0.5">
                      claims{' '}
                      <Link href={`/creators/${claim.creator.id}`} className="text-creator hover:underline">
                        {claim.creator.display_name}
                      </Link>
                    </p>
                    <p className="font-mono text-[10px] text-muted/70 truncate">
                      proof: {claim.contact_info}
                    </p>
                    {claim.reviewer && (
                      <p className="font-mono text-[10px] text-muted mt-1">
                        reviewed by {claim.reviewer.display_name}
                        {claim.reviewed_at && <> · {new Date(claim.reviewed_at).toLocaleDateString()}</>}
                        {claim.council_notes && <> — &quot;{claim.council_notes}&quot;</>}
                      </p>
                    )}
                  </div>

                  {claim.status === 'pending' && (
                    <Button variant="default" size="sm" onClick={() => setReviewing(claim)}>
                      review →
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="default"
              size="sm"
              disabled={currentPage === 1 || loading}
              onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchClaims(statusFilter, p); }}
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
              onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchClaims(statusFilter, p); }}
            >
              next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
