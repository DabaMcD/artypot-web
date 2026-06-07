'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { overlord as overlordApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { IntegrityReport, IntegrityCheck, IntegrityStatus } from '@/lib/types';
import Link from 'next/link';

const PURPLE = '#8A2BE2';

const STATUS_STYLE: Record<IntegrityStatus, { dot: string; text: string; badge: string }> = {
  ok:   { dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'border-emerald-800/50 bg-emerald-900/30 text-emerald-400' },
  warn: { dot: 'bg-amber-400',   text: 'text-amber-400',   badge: 'border-amber-800/50 bg-amber-900/30 text-amber-400' },
  fail: { dot: 'bg-red-400',     text: 'text-red-400',     badge: 'border-red-800/50 bg-red-900/30 text-red-400' },
};

function CheckRow({ check }: { check: IntegrityCheck }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_STYLE[check.status];
  const hasSample = check.sample.length > 0;

  return (
    <div className="py-3">
      <button
        type="button"
        disabled={!hasSample}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-3 text-left ${hasSample ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
          <div className="min-w-0">
            <div className="text-sm text-foreground">{check.label}</div>
            <div className="text-xs text-muted mt-0.5">{check.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {check.status === 'ok' ? (
            <span className={`font-mono text-xs ${s.text}`}>✓ ok</span>
          ) : (
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${s.badge}`}>
              {check.count} {check.status === 'fail' ? 'fault' : 'found'}{check.count === 1 ? '' : check.status === 'fail' ? 's' : ''}
            </span>
          )}
          {hasSample && <span className="text-muted text-xs">{open ? '▾' : '▸'}</span>}
        </div>
      </button>

      {open && hasSample && (
        <ul className="mt-2 ml-5 space-y-1">
          {check.sample.map((line, i) => (
            <li key={i} className="font-mono text-xs text-muted">{line}</li>
          ))}
          {check.count > check.sample.length && (
            <li className="font-mono text-xs text-muted/60">
              …and {check.count - check.sample.length} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function OverlordIntegrityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await overlordApi.integrity();
      setData(res.data);
    } catch {
      toast('Failed to run integrity scan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
    fetchReport();
  }, [user, authLoading, router, fetchReport]);

  if (authLoading || (!user?.is_overlord && !authLoading)) {
    return null; // redirect in useEffect
  }

  const allClear = data && data.summary.warn === 0 && data.summary.fail === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-mono mb-3">
          <Link href="/obelisk" className="hover:underline text-muted">← Overlord</Link>
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧮</span>
            <h1 className="text-2xl font-display font-bold text-foreground">Data Integrity</h1>
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="text-xs font-mono text-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            ↻ re-scan
          </button>
        </div>
        <p className="text-sm text-muted">
          Read-only invariant checks across the ledger, bounties, and payments.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#8A2BE2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted py-6">No data.</p>
      ) : (
        <div className="space-y-6">

          {/* Summary banner */}
          <div
            className={`rounded-xl p-4 border flex items-center gap-3 ${
              allClear
                ? 'border-emerald-800/50 bg-emerald-900/20'
                : data.summary.fail > 0
                ? 'border-red-800/50 bg-red-900/20'
                : 'border-amber-800/50 bg-amber-900/20'
            }`}
          >
            <span className="text-xl">{allClear ? '✓' : data.summary.fail > 0 ? '⚠' : '⚠'}</span>
            <div className="text-sm text-foreground">
              {allClear ? (
                <>All {data.summary.ok} checks passed.</>
              ) : (
                <>
                  <span className="font-mono">{data.summary.fail}</span> fault{data.summary.fail === 1 ? '' : 's'},{' '}
                  <span className="font-mono">{data.summary.warn}</span> warning{data.summary.warn === 1 ? '' : 's'},{' '}
                  <span className="font-mono">{data.summary.ok}</span> ok.
                </>
              )}
            </div>
          </div>

          {/* Checks */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: PURPLE }}>
              Checks
            </h2>
            <div className="divide-y divide-border">
              {data.checks.map((c) => (
                <CheckRow key={c.key} check={c} />
              ))}
            </div>
          </div>

          <p className="text-xs text-muted/60 font-mono">
            scanned {new Date(data.as_of).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
