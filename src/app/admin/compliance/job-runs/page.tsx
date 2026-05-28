'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComplianceJobRun } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function duration(start: string, end: string | null) {
  if (!end) return 'running…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const JOB_TONES: Record<ComplianceJobRun['status'], 'info' | 'good' | 'bad' | 'warn'> = {
  running: 'info',
  success: 'good',
  failure: 'bad',
  partial: 'warn',
};

const KNOWN_COMMANDS = [
  'compliance:fetch-ofac',
  'compliance:check-staleness',
  'compliance:verify-stripe-coverage',
  'compliance:annual-review-reminders',
];

export default function JobRunsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [runs, setRuns] = useState<ComplianceJobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [outputModal, setOutputModal] = useState<ComplianceJobRun | null>(null);
  const [errorModal, setErrorModal] = useState<ComplianceJobRun | null>(null);

  const [filterCommand, setFilterCommand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'council') {
      adminApi.complianceJobRuns()
        .then((r) => setRuns(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || !user || user.role !== 'council') return null;

  const filtered = runs.filter((r) => {
    if (filterCommand && r.command !== filterCommand) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const COMMAND_PILLS = [{ label: 'All', value: '' }, ...KNOWN_COMMANDS.map(c => ({ label: c.replace('compliance:', ''), value: c }))];
  const STATUS_PILLS = [
    { label: 'All', value: '' },
    { label: 'Running', value: 'running' },
    { label: 'Success', value: 'success' },
    { label: 'Failure', value: 'failure' },
    { label: 'Partial', value: 'partial' },
  ];

  return (
    <>
      {outputModal && (
        <Modal title={`Output: ${outputModal.command}`} onClose={() => setOutputModal(null)}>
          <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto bg-surface-2 p-3 rounded">
            {outputModal.output ?? 'No output.'}
          </pre>
        </Modal>
      )}
      {errorModal && (
        <Modal title={`Error: ${errorModal.command}`} onClose={() => setErrorModal(null)}>
          <pre className="text-xs text-bad font-mono whitespace-pre-wrap break-words bg-bad-soft p-3 rounded">
            {errorModal.error_message ?? 'No error message.'}
          </pre>
        </Modal>
      )}

      <div className="space-y-6 pt-2 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin · compliance</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">job runs</h1>
            <p className="text-sm text-muted mt-1">{filtered.length} of {runs.length} runs shown</p>
          </div>
          <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted mb-1.5">Command</div>
            <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit flex-wrap">
              {COMMAND_PILLS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setFilterCommand(value)}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                    filterCommand === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1.5">Status</div>
            <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
              {STATUS_PILLS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setFilterStatus(value)}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                    filterStatus === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <Card><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
        ) : filtered.length === 0 ? (
          <Empty>No job runs match these filters.</Empty>
        ) : (
          <Card>
            <div className="overflow-x-auto -mx-5 -my-4">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Command</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Status</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Started</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Duration</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Processed</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Added</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Changed</th>
                    <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((run) => (
                    <tr key={run.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-foreground max-w-[220px] truncate">{run.command}</td>
                      <td className="px-4 py-3"><Badge tone={JOB_TONES[run.status]}>{run.status}</Badge></td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmt(run.started_at)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{duration(run.started_at, run.finished_at)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{run.records_processed.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-good">{run.records_added > 0 ? `+${run.records_added}` : '0'}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-warn">{run.records_changed > 0 ? `~${run.records_changed}` : '0'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {run.error_message && (
                            <Button variant="ghost" size="sm" onClick={() => setErrorModal(run)}>
                              <span className="text-bad">error</span>
                            </Button>
                          )}
                          {run.output && (
                            <Button variant="ghost" size="sm" onClick={() => setOutputModal(run)}>output</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
