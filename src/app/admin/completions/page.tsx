'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { AdminPotCompletion, PotCompletionStatus } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea, FieldLabel } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

type StatusFilter = 'pending_review' | 'approved' | 'rejected' | 'all';

const COMPLETION_TONES: Record<PotCompletionStatus, 'warn' | 'good' | 'bad'> = {
  pending_review: 'warn',
  approved:       'good',
  rejected:       'bad',
};

const COMPLETION_LABELS: Record<PotCompletionStatus, string> = {
  pending_review: 'pending review',
  approved:       'approved',
  rejected:       'rejected',
};

// ── Review modal ────────────────────────────────────────────────────────────
function ReviewModal({
  completion,
  onClose,
  onDone,
}: {
  completion: AdminPotCompletion;
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
      await adminApi.reviewCompletion(completion.pot_id, { status: decision, council_notes: notes || undefined });
      toast(
        decision === 'approved'
          ? 'Pot approved — fans will be notified!'
          : 'Submission rejected — creator can resubmit.',
        decision === 'approved' ? 'success' : 'error',
      );
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
      title="review completion"
      onClose={onClose}
      lg
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>cancel</Button>
          <Button
            variant={decision === 'approved' ? 'primary' : 'danger'}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={loading || (decision === 'rejected' && !notes.trim())}
          >
            {loading ? 'submitting…' : decision === 'approved' ? 'approve pot' : 'reject submission'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="font-display text-sm text-muted">
          <Link href={`/bounties/${completion.pot_id}`} className="text-fan hover:underline">
            {completion.pot.title}
          </Link>
          {completion.pot.creator && (
            <> by{' '}
              <Link href={`/creators/${completion.pot.creator.id}`} className="text-creator hover:underline">
                {completion.pot.creator.display_name}
              </Link>
            </>
          )}
          {' '}·{' '}
          <span className="text-foreground font-mono tabular-nums">
            ${Number(completion.pot.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>{' '}
          committed
        </p>

        <Card>
          <div className="space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">submission url</div>
              <a
                href={completion.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-sm text-fan hover:underline break-all"
              >
                {completion.submission_url}
              </a>
            </div>
            {completion.submission_notes && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">creator notes</div>
                <p className="font-display text-sm text-foreground whitespace-pre-wrap">{completion.submission_notes}</p>
              </div>
            )}
            <p className="font-mono text-[10px] text-muted">
              submitted by {completion.submitted_by.name} · {new Date(completion.created_at).toLocaleDateString()}
            </p>
          </div>
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
          <FieldLabel>
            council notes{' '}
            <span className="text-muted/50 font-normal normal-case tracking-normal">
              {decision === 'rejected' ? '(required — tell the creator what to fix)' : '(optional)'}
            </span>
          </FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            required={decision === 'rejected'}
            placeholder={
              decision === 'approved'
                ? 'e.g. Great work, approved!'
                : 'e.g. The URL is behind a paywall, please provide a public link'
            }
          />
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function AdminCompletionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review');
  const [completions, setCompletions] = useState<AdminPotCompletion[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<AdminPotCompletion | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchCompletions = useCallback(async (status: StatusFilter, page: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listCompletions(status, page);
      setCompletions(res.data);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchCompletions(statusFilter, 1);
      setCurrentPage(1);
    }
  }, [statusFilter, user, fetchCompletions]);

  if (authLoading || !user || user.role !== 'council') return null;

  const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: 'pending review', value: 'pending_review' },
    { label: 'approved', value: 'approved' },
    { label: 'rejected', value: 'rejected' },
    { label: 'all', value: 'all' },
  ];

  return (
    <>
      {reviewing && (
        <ReviewModal
          completion={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            fetchCompletions(statusFilter, currentPage);
          }}
        />
      )}

      <div className="space-y-6 pt-2 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">bounty completions</h1>
            <p className="font-display text-sm text-muted mt-1">{total} {total === 1 ? 'submission' : 'submissions'}</p>
          </div>
          <Link href="/admin"><Button variant="ghost" size="sm">← admin</Button></Link>
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

        {/* Completions list */}
        {loading ? (
          <Card>
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : completions.length === 0 ? (
          <Empty message="no completions found" />
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {completions.map((c) => (
                <div key={c.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Link href={`/bounties/${c.pot_id}`} className="font-display text-sm text-foreground hover:underline">
                        {c.pot.title}
                      </Link>
                      <Badge tone={COMPLETION_TONES[c.status]}>{COMPLETION_LABELS[c.status]}</Badge>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-muted mb-1 flex-wrap">
                      {c.pot.creator && (
                        <Link href={`/creators/${c.pot.creator.id}`} className="text-creator hover:underline">
                          {c.pot.creator.display_name}
                        </Link>
                      )}
                      <span className="text-fan tabular-nums">
                        ${Number(c.pot.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2 })} committed
                      </span>
                      <span>by {c.submitted_by.name}</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={c.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-fan hover:underline truncate block"
                    >
                      {c.submission_url}
                    </a>
                    {c.reviewer && (
                      <p className="font-mono text-[10px] text-muted mt-1">
                        reviewed by {c.reviewer.name}
                        {c.reviewed_at && <> · {new Date(c.reviewed_at).toLocaleDateString()}</>}
                        {c.council_notes && <> — &quot;{c.council_notes}&quot;</>}
                      </p>
                    )}
                  </div>

                  {c.status === 'pending_review' && (
                    <Button variant="default" size="sm" onClick={() => setReviewing(c)}>
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
              onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchCompletions(statusFilter, p); }}
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
              onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchCompletions(statusFilter, p); }}
            >
              next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
