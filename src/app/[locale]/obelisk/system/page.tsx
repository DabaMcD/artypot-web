'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { overlord as overlordApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { SystemSnapshot, FailedJob, ScheduledTask } from '@/lib/types';

const PURPLE = '#8A2BE2';
const POLL_MS = 15000;

function rel(iso: string | null, nowMs: number = Date.now()): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - nowMs;
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let s: string;
  if (abs < 60000) s = `${Math.round(abs / 1000)}s`;
  else if (mins < 60) s = `${mins} min`;
  else if (hrs < 48) s = `${hrs} hr`;
  else s = `${days} d`;
  return ms >= 0 ? `in ${s}` : `${s} ago`;
}

/** Human-format a millisecond duration. */
function dur(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/** A live cooldown bar from the previous fire boundary to the next run. */
function CooldownBar({ task, nowMs }: { task: ScheduledTask; nowMs: number }) {
  const prev = task.prev_run_at ? new Date(task.prev_run_at).getTime() : null;
  const next = task.next_run_at ? new Date(task.next_run_at).getTime() : null;

  let pct = 0;
  if (prev !== null && next !== null && next > prev) {
    pct = Math.min(1, Math.max(0, (nowMs - prev) / (next - prev)));
  }
  // Bar "fills up" as the next run approaches; flip to a warm color near the top.
  const imminent = pct >= 0.85;
  const color = imminent ? '#f59e0b' : PURPLE;

  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-linear"
        style={{ width: `${(pct * 100).toFixed(1)}%`, background: color }}
      />
    </div>
  );
}

export default function OverlordSystemPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<SystemSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick once a second so cooldown bars and relative times animate live
  // between the 15s data polls.
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchSnapshot = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await overlordApi.system.get();
      setData(res.data);
    } catch {
      toast('Failed to load system snapshot.', 'error');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
    fetchSnapshot(true);
    timer.current = setInterval(() => fetchSnapshot(false), POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [user, authLoading, router, fetchSnapshot]);

  const runAction = async (key: string, fn: () => Promise<{ message: string }>) => {
    setBusy(key);
    try {
      const res = await fn();
      toast(res.message, 'success');
      await fetchSnapshot(false);
    } catch {
      toast('Action failed.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const retry = (j: FailedJob) => runAction(`retry-${j.uuid}`, () => overlordApi.system.retryFailed(j.uuid));
  const forget = (j: FailedJob) => runAction(`forget-${j.uuid}`, () => overlordApi.system.forgetFailed(j.uuid));
  const retryAll = () => runAction('retry-all', () => overlordApi.system.retryAllFailed());
  const flushAll = () => {
    if (!window.confirm('Permanently delete ALL failed jobs? This cannot be undone.')) return;
    runAction('flush', () => overlordApi.system.flushFailed());
  };

  if (authLoading || (!user?.is_overlord && !authLoading)) {
    return null; // redirect in useEffect
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-mono mb-3">
          <Link href="/obelisk" className="hover:underline text-muted">← Obelisk</Link>
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-2xl font-display font-bold text-foreground">System</h1>
          </div>
          <button
            onClick={() => fetchSnapshot(true)}
            className="text-xs font-mono text-muted hover:text-foreground transition-colors"
          >
            ↻ refresh
          </button>
        </div>
        <p className="text-sm text-muted">
          Scheduled tasks, queue depth, and failed jobs.
          {data && (
            <>
              {' · '}
              <span className="font-mono">{data.queue_driver} queue</span>
              {data.warp_speed && <span className="text-amber-400"> · ⚡ WARP SPEED</span>}
            </>
          )}
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

          {/* Queues */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>
              Queues
            </h2>
            {data.queues.length === 0 ? (
              <p className="text-sm text-muted py-1">Queue is empty.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.queues.map((q) => (
                  <div key={q.queue} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-mono text-foreground">{q.queue}</div>
                      <div className="text-xs text-muted mt-0.5">
                        oldest queued {rel(q.oldest_available_at, nowMs)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums text-sm">
                      <span title="ready to run" className="text-foreground">{q.ready} ready</span>
                      <span title="reserved (in flight)" className="text-muted">{q.reserved} active</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Failed jobs */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>
                Failed jobs
                <span className="ml-2 font-normal normal-case tracking-normal text-muted">
                  ({data.failed.total})
                </span>
              </h2>
              {data.failed.total > 0 && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <button
                    onClick={retryAll}
                    disabled={busy === 'retry-all'}
                    className="text-muted hover:text-emerald-400 transition-colors disabled:opacity-40"
                  >
                    retry all
                  </button>
                  <button
                    onClick={flushAll}
                    disabled={busy === 'flush'}
                    className="text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    flush all
                  </button>
                </div>
              )}
            </div>

            {data.failed.recent.length === 0 ? (
              <p className="text-sm text-muted py-1">No failed jobs. 🎉</p>
            ) : (
              <div className="divide-y divide-border">
                {data.failed.recent.map((j) => (
                  <div key={j.uuid} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground">
                        {j.name} <span className="text-muted font-mono text-xs">· {j.queue}</span>
                      </div>
                      <div className="text-xs text-red-400/80 mt-0.5 truncate" title={j.exception}>
                        {j.exception}
                      </div>
                      <div className="text-xs text-muted/60 mt-0.5 font-mono">
                        {new Date(j.failed_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                      <button
                        onClick={() => retry(j)}
                        disabled={busy === `retry-${j.uuid}`}
                        className="text-muted hover:text-emerald-400 transition-colors disabled:opacity-40"
                      >
                        retry
                      </button>
                      <button
                        onClick={() => forget(j)}
                        disabled={busy === `forget-${j.uuid}`}
                        className="text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        forget
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Scheduled tasks */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>
              Scheduled tasks
              <span className="ml-2 font-normal normal-case tracking-normal text-muted">
                ({data.scheduled.length})
              </span>
            </h2>
            <div className="divide-y divide-border">
              {data.scheduled.map((t, i) => (
                <div key={`${t.name}-${i}`} className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-mono text-foreground truncate">
                        {t.name}
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted/70 align-middle">
                          {t.type}
                        </span>
                        {t.last_failed && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-red-400 align-middle">
                            ⚠ failed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5 font-mono">{t.expression}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-mono tabular-nums text-foreground">{rel(t.next_run_at, nowMs)}</div>
                      <div className="text-[10px] text-muted/60 font-mono">next run</div>
                    </div>
                  </div>

                  <CooldownBar task={t} nowMs={nowMs} />

                  <div className="flex items-center justify-between gap-4 mt-1.5 text-[11px] font-mono text-muted">
                    <span>
                      last ran {t.last_run_at ? rel(t.last_run_at, nowMs) : 'never'}
                    </span>
                    <span className={t.last_failed ? 'text-red-400' : 'text-muted'}>
                      took{' '}
                      <span className={t.last_failed ? '' : 'text-foreground'}>
                        {t.last_failed ? 'failed' : dur(t.last_duration_ms)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-muted/60 font-mono">
            snapshot as of {new Date(data.as_of).toLocaleTimeString()} · auto-refreshes every {POLL_MS / 1000}s
          </p>
        </div>
      )}
    </div>
  );
}
