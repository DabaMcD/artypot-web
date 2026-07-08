'use client';

import { formatUsdWhole as usd } from '@/lib/format';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { overlord as overlordApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { NexusAccrualRow } from '@/lib/types';
import { US_STATES } from '@/lib/countries';
import { Button } from '@/components/ui/Button';

const STATE_NAMES: Record<string, string> = Object.fromEntries(
  US_STATES.map((s) => [s.code, s.name]),
);

function StatusBadge({ row }: { row: NexusAccrualRow }) {
  if (row.state_code === null) {
    return <span className="text-muted text-xs">— unattributed</span>;
  }
  if (row.over_threshold) {
    return <span className="text-red-400 text-xs font-semibold">Over threshold</span>;
  }
  if (row.over_alert) {
    return <span className="text-warn text-xs font-semibold">Approaching</span>;
  }
  return <span className="text-emerald-400/80 text-xs">OK</span>;
}

export default function OverlordNexusPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<NexusAccrualRow[] | null>(null);
  const [alertPct, setAlertPct] = useState(0.75);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await overlordApi.nexusAccrual();
      setRows(res.data);
      setAlertPct(res.alert_pct);
    } catch {
      toast('Failed to load Nexus Watch.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
    fetchData();
  }, [user, authLoading, router, fetchData]);

  if (authLoading || !user?.is_overlord) return null;

  const unknown = rows?.find((r) => r.state_code === null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">🗺️ Nexus Watch</h1>
          <p className="text-sm text-muted">
            Per-US-state platform-fee (commission) accrual vs. conservative sales-tax
            economic-nexus trip-wires. Council is alerted at {Math.round(alertPct * 100)}% of a
            state&apos;s threshold. <span className="text-foreground/70">Monitoring only — not a tax determination.</span>
          </p>
        </div>
        <Link href="/obelisk"><Button variant="ghost" size="sm">← Obelisk</Button></Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-surface-2 animate-pulse rounded" />)}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="text-muted text-sm py-8 text-center">No platform-fee accrual recorded yet.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">State</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Commission (12 mo)</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Threshold</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">% of threshold</th>
                  <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr
                    key={row.state_code ?? 'unknown'}
                    className={`hover:bg-surface-2 transition-colors ${row.over_alert ? 'bg-warn-soft/30' : ''}`}
                  >
                    <td className="px-5 py-3 text-foreground">
                      {row.state_code
                        ? <>{row.state_code} <span className="text-muted text-xs">{STATE_NAMES[row.state_code] ?? ''}</span></>
                        : <span className="text-muted italic">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{usd(row.fee_12mo)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {row.threshold !== null ? usd(row.threshold) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {row.pct_of_threshold !== null ? `${row.pct_of_threshold}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right"><StatusBadge row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {unknown && unknown.fee_12mo > 0 && (
            <p className="text-xs text-muted mt-4">
              <span className="text-warn font-semibold">{usd(unknown.fee_12mo)}</span> of commission
              (12 mo) is from US creators with no declared state — it can&apos;t be monitored against
              any threshold. Prompt those creators to complete their tax residence to close the blind spot.
            </p>
          )}
        </>
      )}
    </div>
  );
}
