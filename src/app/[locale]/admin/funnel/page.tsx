'use client';

import { formatCount as num } from '@/lib/format';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AdminFunnel } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MiniBars } from '@/components/admin/MiniCharts';

const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-1">
      <p className="font-mono text-[10px] text-muted uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** One funnel stage as a width-proportional bar (width ∝ % of registered). */
function FunnelBar({ label, count, pctReg, pctPrev, first }: {
  label: string; count: number; pctReg: number; pctPrev: number; first: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-right font-mono text-[11px] text-muted uppercase tracking-wider">{label}</div>
      <div className="flex-1 h-9 bg-surface-2 rounded overflow-hidden">
        <div
          className="h-full rounded flex items-center px-2 min-w-[2px]"
          style={{ width: `${Math.max(pctReg, 1)}%`, background: 'var(--color-role-soft)' }}
        >
          <span className="font-mono text-xs text-[var(--color-role)] tabular-nums whitespace-nowrap">{num(count)}</span>
        </div>
      </div>
      <div className="w-28 shrink-0 font-mono text-[10px] text-muted tabular-nums">
        {pct(pctReg)} of reg
        {!first && <span className="text-muted/50"> · {pct(pctPrev)} step</span>}
      </div>
    </div>
  );
}

export default function AdminFunnelPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<AdminFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const loadFunnel = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApi.funnel();
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') loadFunnel();
  }, [user, reload, loadFunnel]);

  if (authLoading || !user || user.role !== 'council') return null;

  const ttfb = data?.time_to_first_backing;

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">activation funnel</h1>
          <p className="text-sm text-muted mt-1">
            Signup → verified → first backing → first payment · weekly retention · all from existing data
          </p>
        </div>
        <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
      </div>

      {loading ? (
        <Card><div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-9 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : error || !data ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-muted mb-4">Couldn&apos;t load the funnel.</p>
            <Button variant="default" size="sm" onClick={() => setReload((n) => n + 1)}>Retry</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Funnel */}
          <Card>
            <div className="space-y-2.5">
              {data.funnel.map((s, i) => (
                <FunnelBar
                  key={s.key}
                  label={s.label}
                  count={s.count}
                  pctReg={s.pct_of_registered}
                  pctPrev={s.pct_of_prev}
                  first={i === 0}
                />
              ))}
            </div>
          </Card>

          {/* Time to first backing */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Median time to back" value={ttfb?.median_days != null ? `${ttfb.median_days}d` : '—'} sub="signup → first backing" />
            <StatCard label="Average time to back" value={ttfb?.avg_days != null ? `${ttfb.avg_days}d` : '—'} sub={`${num(ttfb?.n ?? 0)} backers`} />
          </div>

          {/* Weekly cohort retention */}
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2 px-1">
              weekly signup cohorts · % backed within 7 days
            </p>
            <Card>
              <div style={{ color: 'var(--color-role)' }}>
                <MiniBars data={data.cohorts.map((c) => c.pct_7d)} />
              </div>
              <div className="mt-3 divide-y divide-border -mx-5">
                <div className="grid grid-cols-4 px-5 pb-1.5 font-mono text-[10px] text-muted uppercase tracking-wider">
                  <span>week</span><span className="text-right">signups</span><span className="text-right">7d</span><span className="text-right">30d</span>
                </div>
                {data.cohorts.map((c) => (
                  <div key={c.week} className="grid grid-cols-4 px-5 py-1.5 font-mono text-xs tabular-nums">
                    <span className="text-muted">{shortDate(c.week)}</span>
                    <span className="text-right text-foreground">{num(c.size)}</span>
                    <span className="text-right text-foreground">{c.size > 0 ? pct(c.pct_7d) : '—'}</span>
                    <span className="text-right text-muted">{c.size > 0 ? pct(c.pct_30d) : '—'}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Signup channels */}
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2 px-1">signup channel</p>
            <Card>
              <div className="space-y-2">
                {data.channels.map((ch) => {
                  const maxUsers = Math.max(1, ...data.channels.map((c) => c.users));
                  return (
                    <div key={ch.channel} className="flex items-center gap-3">
                      <div className="w-20 shrink-0 font-mono text-[11px] text-muted lowercase truncate">{ch.channel}</div>
                      <div className="flex-1 h-5 bg-surface-2 rounded overflow-hidden">
                        <div className="h-full rounded min-w-[2px]" style={{ width: `${(ch.users / maxUsers) * 100}%`, background: 'var(--color-role-soft)' }} />
                      </div>
                      <div className="w-12 shrink-0 text-right font-mono text-xs text-foreground tabular-nums">{num(ch.users)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <p className="text-[10px] text-muted/60 font-mono px-1">
            generated {new Date(data.generated_at).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
