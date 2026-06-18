'use client';

import { useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComplianceSource } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

type FreshnessTone = 'good' | 'warn' | 'bad';

const FRESHNESS_TONES: Record<ComplianceSource['freshness'], FreshnessTone> = {
  fresh:    'good',
  aging:    'warn',
  stale:    'bad',
  critical: 'bad',
};

const FRESHNESS_BORDER: Record<ComplianceSource['freshness'], string> = {
  fresh:    'border-good/30',
  aging:    'border-warn/30',
  stale:    'border-bad/30',
  critical: 'border-bad/60',
};

export default function SourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sources, setSources] = useState<ComplianceSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'council') {
      adminApi.complianceSources()
        .then((r) => setSources(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">data sources</h1>
          <p className="text-sm text-muted mt-1">Compliance data source freshness and refresh schedules</p>
        </div>
        <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-surface-2 animate-pulse rounded-lg" />)}
        </div>
      ) : sources.length === 0 ? (
        <Empty>No data sources found.</Empty>
      ) : (
        <div className="space-y-4">
          {sources.map((s) => (
            <Card key={s.source_key} className={`border ${FRESHNESS_BORDER[s.freshness]}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-[13px] font-bold text-foreground">{s.source_key}</span>
                    <Badge tone={FRESHNESS_TONES[s.freshness]} lg>{s.freshness}</Badge>
                  </div>
                  <p className="text-sm text-muted mb-3">{s.description}</p>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted/70 mb-0.5">Refresh cadence</div>
                      <div className="text-foreground font-mono text-[11px]">{s.refresh_cadence} · {s.refresh_mode}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted/70 mb-0.5">Next refresh due</div>
                      <div className="text-foreground font-mono text-[11px]">{fmt(s.next_refresh_due_at)}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted/70 mb-0.5">Last fetched</div>
                      <div className="text-foreground font-mono text-[11px]">{fmt(s.last_fetched_at)}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted/70 mb-0.5">Last verified</div>
                      <div className="text-foreground font-mono text-[11px]">{fmt(s.last_verified_at)}</div>
                    </div>
                  </div>

                  {s.source_url && (
                    <div className="mt-3">
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-info hover:underline break-all"
                      >
                        {s.source_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
