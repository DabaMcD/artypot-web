'use client';

import { formatDateTime as fmtDateTime } from '@/lib/format';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { ReportRow } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';

const REASON_LABELS: Record<ReportRow['reason'], string> = {
  harassment:    'Harassment',
  illegal:       'Illegal / inappropriate',
  adult_content: 'Illegal / inappropriate', // legacy rows — folded into "illegal"
  spam:          'Spam / scam',
  other:         'Other',
};

const SUBJECT_KIND_LABELS: Record<ReportRow['subject']['kind'], string> = {
  bounty:  'Bounty',
  creator: 'Creator',
  handle:  'Handle',
  comment: 'Comment',
  other:   'Item',
};

const STATUS_TONE: Record<ReportRow['status'], 'warn' | 'good' | 'bad' | 'default'> = {
  pending:   'warn',
  reviewed:  'default',
  actioned:  'bad',
  dismissed: 'good',
};

/** Render the reported subject — a link when it still exists, plain text when deleted. */
function SubjectLink({ subject, className }: { subject: ReportRow['subject']; className?: string }) {
  if (subject.href) {
    return (
      <Link href={subject.href} target="_blank" className={className}>
        {subject.label}
      </Link>
    );
  }
  return <span className={className}>{subject.label}</span>;
}

function ResolveModal({
  report, onClose, onDone,
}: {
  report: ReportRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resolve = async (status: 'reviewed' | 'actioned' | 'dismissed') => {
    setSubmitting(true);
    try {
      await adminApi.resolveReport(report.id, status, notes.trim() || undefined);
      toast(`Report #${report.id} marked ${status}.`, 'success');
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to resolve report.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Resolve report #${report.id}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-muted">
          <span className="text-foreground font-semibold">{REASON_LABELS[report.reason]}</span>
          {' '}on {SUBJECT_KIND_LABELS[report.subject.kind].toLowerCase()}{' '}
          <SubjectLink subject={report.subject} className="underline underline-offset-2" />
          {report.details && <><br />&ldquo;{report.details}&rdquo;</>}
        </p>
        <p className="text-xs text-muted/70">
          Resolving never touches the reported item itself — act on it from its own page first
          (revoke the bounty, remove the comment, etc.) if warranted, then mark this <em>actioned</em>.
        </p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Review notes (optional)"
          rows={2}
          maxLength={2000}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="ghost" onClick={() => resolve('dismissed')} disabled={submitting}>Dismiss</Button>
          <Button variant="default" onClick={() => resolve('reviewed')} disabled={submitting}>Reviewed — no action</Button>
          <Button variant="danger" onClick={() => resolve('actioned')} disabled={submitting}>Actioned</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<ReportRow | null>(null);

  const fetchReports = useCallback(async (status: 'pending' | 'all') => {
    setLoading(true);
    try {
      const res = await adminApi.listReports({ status });
      setReports(res.data);
    } catch {
      toast('Failed to load reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === 'council') fetchReports(statusFilter);
  }, [user, statusFilter, fetchReports]);

  if (authLoading) return null;
  if (user?.role !== 'council') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Empty icon="⚑" message="Council access required" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <SectionLabel className="mb-1">admin · moderation</SectionLabel>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Content Policy Reports</h1>
        <div className="flex gap-1">
          {(['pending', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest border transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'border-foreground/40 text-foreground bg-white/5'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-muted py-6 text-center">Loading…</p>
        ) : reports.length === 0 ? (
          <Empty icon="⚑" message={statusFilter === 'pending' ? 'No pending reports' : 'No reports yet'} />
        ) : (
          <div className="divide-y divide-border">
            {reports.map((r) => (
              <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                      {SUBJECT_KIND_LABELS[r.subject.kind]}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      {REASON_LABELS[r.reason]}
                    </span>
                    <span className="text-xs text-muted/60">{fmtDateTime(r.created_at)}</span>
                  </div>
                  <SubjectLink
                    subject={r.subject}
                    className="block mt-1 text-sm font-semibold truncate hover:underline underline-offset-2"
                  />
                  <p className="text-xs text-muted mt-0.5">
                    by {r.reporter?.display_name ?? 'unknown reporter'}
                    {r.details && <> — &ldquo;{r.details}&rdquo;</>}
                    {r.status !== 'pending' && r.reviewed_by && (
                      <> · resolved by {r.reviewed_by.display_name}{r.review_notes ? ` — ${r.review_notes}` : ''}</>
                    )}
                  </p>
                </div>
                {r.status === 'pending' && (
                  <Button variant="default" size="sm" onClick={() => setResolving(r)} className="shrink-0">
                    Resolve
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {resolving && (
        <ResolveModal
          report={resolving}
          onClose={() => setResolving(null)}
          onDone={() => {
            setResolving(null);
            fetchReports(statusFilter);
          }}
        />
      )}
    </div>
  );
}
