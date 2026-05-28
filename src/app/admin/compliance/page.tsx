'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComplianceSource, ComplianceJobRun } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function freshnessColor(f: ComplianceSource['freshness']) {
  if (f === 'fresh') return 'good';
  if (f === 'aging') return 'warn';
  return 'bad';
}

function jobStatusTone(s: ComplianceJobRun['status']): 'info' | 'good' | 'bad' | 'warn' {
  if (s === 'running') return 'info';
  if (s === 'success') return 'good';
  if (s === 'failure') return 'bad';
  return 'warn';
}

function duration(start: string, end: string | null) {
  if (!end) return 'running…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const TABLE_LINKS: Record<string, string> = {
  country_sanctions:       '/admin/compliance/sanctions',
  country_tax_treaties:    '/admin/compliance/treaties',
  country_payment_support: '/admin/compliance/payment-support',
  us_state_tax_thresholds: '/admin/compliance/state-thresholds',
  country_content_rules:   '/admin/compliance/content-rules',
};

const TABLE_LABELS: Record<string, string> = {
  country_sanctions:       'Sanctions',
  country_tax_treaties:    'Tax Treaties',
  country_payment_support: 'Payment Support',
  us_state_tax_thresholds: 'State Thresholds',
  country_content_rules:   'Content Rules',
};

const NAV_CARDS = [
  { href: '/admin/compliance/sanctions',       label: 'Sanctions',        desc: 'Review & approve pending country sanctions' },
  { href: '/admin/compliance/matches',          label: 'OFAC Matches',     desc: 'Pending and historical entity match reviews' },
  { href: '/admin/compliance/treaties',         label: 'Tax Treaties',     desc: 'US tax treaty withholding rates by country' },
  { href: '/admin/compliance/payment-support',  label: 'Payment Support',  desc: 'Stripe & Plaid coverage by country' },
  { href: '/admin/compliance/state-thresholds', label: 'State Thresholds', desc: 'US state 1099-K filing thresholds' },
  { href: '/admin/compliance/content-rules',    label: 'Content Rules',    desc: 'Country content regulation requirements' },
  { href: '/admin/compliance/sources',          label: 'Data Sources',     desc: 'Source freshness and refresh schedules' },
  { href: '/admin/compliance/job-runs',         label: 'Job Runs',         desc: 'Compliance automation run history' },
  { href: '/admin/compliance/audit-log',        label: 'Audit Log',        desc: 'All manual data edits with editor info' },
];

export default function ComplianceDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<{
    sources: ComplianceSource[];
    pending_sanctions: number;
    pending_matches: number;
    annual_review_overdue: Record<string, number>;
    recent_job_runs: ComplianceJobRun[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'council') {
      adminApi.complianceDashboard().then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || !user || user.role !== 'council') return null;

  const totalOverdue = data ? Object.values(data.annual_review_overdue).reduce((a, b) => a + b, 0) : 0;
  const freshnessCounts = data
    ? data.sources.reduce<Record<string, number>>((acc, s) => {
        acc[s.freshness] = (acc[s.freshness] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-8 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">compliance</h1>
          <p className="text-sm text-muted mt-1">Sanctions, treaties, payment coverage & content rules</p>
        </div>
        <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/compliance/sanctions?status=pending_review">
          <Card className="hover:border-warn/40 transition-colors cursor-pointer">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">Pending sanctions</div>
            {loading ? (
              <div className="h-8 w-16 bg-surface-2 animate-pulse rounded" />
            ) : (
              <div className={`font-display font-bold text-[36px] ${(data?.pending_sanctions ?? 0) > 0 ? 'text-warn' : 'text-foreground'}`}>
                {data?.pending_sanctions ?? 0}
              </div>
            )}
          </Card>
        </Link>

        <Link href="/admin/compliance/matches">
          <Card className="hover:border-warn/40 transition-colors cursor-pointer">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">Pending OFAC matches</div>
            {loading ? (
              <div className="h-8 w-16 bg-surface-2 animate-pulse rounded" />
            ) : (
              <div className={`font-display font-bold text-[36px] ${(data?.pending_matches ?? 0) > 0 ? 'text-bad' : 'text-foreground'}`}>
                {data?.pending_matches ?? 0}
              </div>
            )}
          </Card>
        </Link>

        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">Annual review overdue</div>
          {loading ? (
            <div className="h-8 w-16 bg-surface-2 animate-pulse rounded" />
          ) : (
            <div className={`font-display font-bold text-[36px] ${totalOverdue > 0 ? 'text-warn' : 'text-foreground'}`}>
              {totalOverdue}
            </div>
          )}
        </Card>

        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">Source freshness</div>
          {loading ? (
            <div className="h-8 w-32 bg-surface-2 animate-pulse rounded" />
          ) : (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {(['fresh', 'aging', 'stale', 'critical'] as const).map((f) =>
                (freshnessCounts[f] ?? 0) > 0 ? (
                  <Badge key={f} tone={freshnessColor(f)}>{freshnessCounts[f]} {f}</Badge>
                ) : null
              )}
              {Object.values(freshnessCounts).length === 0 && <span className="text-sm text-muted">—</span>}
            </div>
          )}
        </Card>
      </div>

      {/* Annual review overdue breakdown */}
      {!loading && data && totalOverdue > 0 && (
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4">Annual review overdue by table</div>
          <div className="divide-y divide-border -mx-5 -my-4">
            {Object.entries(data.annual_review_overdue).filter(([, v]) => v > 0).map(([table, count]) => (
              <Link key={table} href={TABLE_LINKS[table] ?? '#'} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
                <span className="text-sm text-foreground">{TABLE_LABELS[table] ?? table}</span>
                <Badge tone="warn">{count} overdue</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Data sources */}
      <Card>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4">Data sources</div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="divide-y divide-border -mx-5 -my-4">
            {(data?.sources ?? []).map((s) => (
              <div key={s.source_key} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-foreground">{s.source_key}</span>
                    <span className="text-xs text-muted truncate">{s.description}</span>
                  </div>
                  <div className="font-mono text-[10px] text-muted/70">
                    next due: {fmt(s.next_refresh_due_at)} · cadence: {s.refresh_cadence}
                  </div>
                </div>
                <Badge tone={freshnessColor(s.freshness)}>{s.freshness}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent job runs */}
      <Card>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4">Recent job runs</div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
          </div>
        ) : (data?.recent_job_runs ?? []).length === 0 ? (
          <p className="text-sm text-muted">No recent job runs.</p>
        ) : (
          <div className="divide-y divide-border -mx-5 -my-4">
            {(data?.recent_job_runs ?? []).map((run) => (
              <div key={run.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-foreground truncate">{run.command}</span>
                    <Badge tone={jobStatusTone(run.status)}>{run.status}</Badge>
                  </div>
                  <div className="font-mono text-[10px] text-muted/70">
                    {fmt(run.started_at)} · {duration(run.started_at, run.finished_at)}
                    {run.error_message && <span className="text-bad ml-2">· {run.error_message.slice(0, 60)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border">
          <Link href="/admin/compliance/job-runs">
            <Button variant="ghost" size="sm">View all job runs →</Button>
          </Link>
        </div>
      </Card>

      {/* Navigation cards */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4">Sections</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {NAV_CARDS.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="hover:border-[var(--color-role)]/40 transition-colors cursor-pointer h-full">
                <div className="font-mono text-[11px] uppercase tracking-wider text-foreground mb-1">{card.label}</div>
                <p className="text-xs text-muted">{card.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
