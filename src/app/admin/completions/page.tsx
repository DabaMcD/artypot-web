'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { AdminPotCompletion, PotCompletionStatus } from '@/lib/types';

type StatusFilter = 'pending_review' | 'approved' | 'rejected' | 'all';

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-foreground mb-1">Review Completion</h2>
        <p className="text-sm text-muted mb-4">
          <Link href={`/bounties/${completion.pot_id}`} className="text-brand hover:underline font-medium">
            {completion.pot.title}
          </Link>
          {completion.pot.creator && (
            <span> by <Link href={`/creators/${completion.pot.creator.id}`} className="text-creator hover:underline">{completion.pot.creator.display_name}</Link></span>
          )}
          {' '}&middot; ${completion.pot.total_pledged.toLocaleString('en-US', { minimumFractionDigits: 2 })} pledged
        </p>

        {/* Submission details */}
        <div className="bg-surface-2 border border-border rounded-lg p-3 mb-4 space-y-2">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Submission URL</p>
            <a
              href={completion.submission_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand hover:underline break-all"
            >
              {completion.submission_url}
            </a>
          </div>
          {completion.submission_notes && (
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Creator notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{completion.submission_notes}</p>
            </div>
          )}
          <p className="text-xs text-muted">
            Submitted by <span className="text-foreground">{completion.submitted_by.name}</span>
            {' '}&middot; {new Date(completion.created_at).toLocaleDateString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Decision */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDecision('approved')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                decision === 'approved'
                  ? 'bg-green-900/40 border-green-600/60 text-green-300'
                  : 'bg-surface-2 border-border text-muted hover:border-green-700/40'
              }`}
            >
              ✓ Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision('rejected')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                decision === 'rejected'
                  ? 'bg-red-900/40 border-red-600/60 text-red-300'
                  : 'bg-surface-2 border-border text-muted hover:border-red-700/40'
              }`}
            >
              ✕ Reject
            </button>
          </div>

          {/* Council notes */}
          <div>
            <label className="text-xs text-muted font-medium mb-1.5 block">
              Council notes {decision === 'rejected' ? '(required — tell the creator what to fix)' : '(optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={decision === 'approved' ? 'e.g. Great work, approved!' : 'e.g. The URL is behind a paywall, please provide a public link'}
              required={decision === 'rejected'}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-border text-foreground text-sm font-medium py-2.5 rounded-lg hover:border-foreground/30 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (decision === 'rejected' && !notes.trim())}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 ${
                decision === 'approved'
                  ? 'bg-green-700 hover:bg-green-600 text-white'
                  : 'bg-red-700 hover:bg-red-600 text-white'
              }`}
            >
              {loading ? 'Submitting…' : decision === 'approved' ? 'Approve Pot' : 'Reject Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PotCompletionStatus }) {
  const styles: Record<PotCompletionStatus, string> = {
    pending_review: 'bg-amber-900/30 border-amber-700/40 text-amber-300',
    approved:       'bg-green-900/30 border-green-700/40 text-green-300',
    rejected:       'bg-red-900/30 border-red-700/40 text-red-300',
  };
  const labels: Record<PotCompletionStatus, string> = {
    pending_review: 'pending review',
    approved:       'approved',
    rejected:       'rejected',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
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
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
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

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-muted hover:text-foreground transition-colors text-sm">
            ← Admin
          </Link>
          <span className="text-border">/</span>
          <h1 className="text-xl font-bold text-foreground">Bounty Completions</h1>
          <span className="ml-auto text-sm text-muted">{total} total</span>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1 mb-6 w-fit">
          {STATUS_TABS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Completions list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : completions.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm">
            No completions found.
          </div>
        ) : (
          <div className="space-y-3">
            {completions.map((c) => (
              <div
                key={c.id}
                className="bg-surface border border-border rounded-xl p-4 flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link href={`/bounties/${c.pot_id}`} className="font-medium text-foreground text-sm hover:underline">
                      {c.pot.title}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted mb-2 flex-wrap">
                    {c.pot.creator && (
                      <Link href={`/creators/${c.pot.creator.id}`} className="text-creator hover:underline">
                        {c.pot.creator.display_name}
                      </Link>
                    )}
                    <span className="text-brand font-medium">
                      ${c.pot.total_pledged.toLocaleString('en-US', { minimumFractionDigits: 2 })} pledged
                    </span>
                    <span>by {c.submitted_by.name}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>

                  <a
                    href={c.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand hover:underline truncate block max-w-xs"
                  >
                    {c.submission_url}
                  </a>

                  {c.reviewer && (
                    <p className="text-xs text-muted mt-1.5">
                      Reviewed by {c.reviewer.name} · {c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString() : ''}
                      {c.council_notes && <span className="ml-1 text-muted/70">— &quot;{c.council_notes}&quot;</span>}
                    </p>
                  )}
                </div>

                {c.status === 'pending_review' && (
                  <button
                    type="button"
                    onClick={() => setReviewing(c)}
                    className="shrink-0 bg-brand/10 border border-brand/30 text-brand text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              disabled={currentPage === 1 || loading}
              onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchCompletions(statusFilter, p); }}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted">Page {currentPage} of {lastPage}</span>
            <button
              type="button"
              disabled={currentPage === lastPage || loading}
              onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchCompletions(statusFilter, p); }}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
