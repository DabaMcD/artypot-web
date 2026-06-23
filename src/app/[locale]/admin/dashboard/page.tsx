'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AdminDashboard } from '@/lib/types';
import { SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ── formatting helpers ──────────────────────────────────────────────────────
const num = (n: number) => (n ?? 0).toLocaleString('en-US');
const usd = (n: number) => '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = (n: number) => '$' + Math.round(n ?? 0).toLocaleString('en-US');

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// The action queues that have a dedicated admin page to act on them. Order =
// rough triage priority (verdicts owed first, money-touching last).
const ACTION_QUEUES = [
  { key: 'completions_pending', label: 'Completions to review', sub: 'bounty proofs awaiting a verdict', href: '/admin/completions', icon: '✓' },
  { key: 'handle_apps_pending', label: 'Handle verifications', sub: 'creator identity claims', href: '/admin/handles', icon: '@' },
  { key: 'reports_open', label: 'Open reports', sub: 'flagged bounties & content', href: '/admin/reports', icon: '⚑' },
  { key: 'tax_flags_pending', label: 'Tax residence flags', sub: 'address mismatches to resolve', href: '/admin/compliance', icon: '⚖' },
  { key: 'refunds_pending', label: 'Refunds pending', sub: 'awaiting processing', href: '/admin/refunds', icon: '↩' },
  { key: 'payout_holds', label: 'Payout holds', sub: 'creators blocked from payout', href: '/admin/creators', icon: '⛔' },
] as const;

// ── small presentational components ─────────────────────────────────────────
function SectionHead({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3 mt-1">
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-role)' }}>{children}</h2>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

function StatCard({ label, value, sub, alert, href }: { label: string; value: string; sub?: string; alert?: boolean; href?: string }) {
  const inner = (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-1 h-full transition-colors hover:border-[var(--color-role)]">
      <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">{label}</p>
      <p className={`text-2xl font-display font-bold ${alert ? 'text-red-400' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function QueueCard({ count, label, sub, href, icon }: { count: number; label: string; sub: string; href: string; icon: string }) {
  const active = count > 0;
  return (
    <Link href={href} className="group block h-full">
      <div className={`h-full rounded-xl p-4 flex items-start gap-3 border bg-surface transition-colors ${active ? 'border-red-500/40 hover:border-red-500/70' : 'border-border hover:border-[var(--color-role)]'}`}>
        <span className={`text-lg leading-none mt-0.5 ${active ? 'text-red-400' : 'text-muted'}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-display font-bold text-2xl tabular-nums ${active ? 'text-red-400' : 'text-foreground/35'}`}>{num(count)}</span>
            {active && <span className="text-[10px] uppercase tracking-wider font-semibold text-red-400/80 border border-red-500/40 rounded px-1.5 py-0.5">to do</span>}
          </div>
          <p className="text-sm font-medium text-foreground mt-1">{label}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        <span className="text-muted opacity-0 group-hover:opacity-100 transition-opacity">→</span>
      </div>
    </Link>
  );
}

function ChartCard({ title, total, children }: { title: string; total: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">{title}</p>
        <p className="font-display font-bold text-lg text-foreground tabular-nums">{total}</p>
      </div>
      {children}
      <div className="flex justify-between text-[10px] text-muted mt-1.5">
        <span>14 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

// Hand-rolled SVG (no chart lib in the codebase). currentColor resolves to the
// council role accent set on the wrapper, so both charts match the role theme.
function MiniBars({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const W = 300, H = 64, GAP = 5;
  const bw = (W - GAP * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ color: 'var(--color-role)', height: 64 }} preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = v > 0 ? Math.max(2, (v / max) * H) : 0;
        return <rect key={i} x={i * (bw + GAP)} y={H - h} width={bw} height={h} rx={1} fill="currentColor" opacity={0.85} />;
      })}
    </svg>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const W = 300, H = 64, n = data.length;
  const pts = data.map((v, i) => [n === 1 ? 0 : (i / (n - 1)) * W, H - (v / max) * (H - 6) - 3] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ color: 'var(--color-role)', height: 64 }} preserveAspectRatio="none">
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="currentColor" opacity={0.12} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function bountyTone(status: string): 'info' | 'good' | 'available' | 'bad' | 'warn' | 'default' {
  switch (status) {
    case 'open': return 'info';
    case 'completed': return 'good';
    case 'paid_out': return 'available';
    case 'revoked': return 'bad';
    case 'pending': return 'warn';
    default: return 'default';
  }
}

// ── page ────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApi.dashboard();
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') fetchData();
  }, [user, fetchData]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-7">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionLabel>council · command center</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">
            {greeting()}{user.display_name ? `, ${user.display_name}` : ''}
          </h1>
          <p className="text-sm text-muted mt-1">
            The pulse of Artypot at a glance
            {data && <> · snapshot as of {new Date(data.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>↻ Refresh</Button>
          <Link href="/admin"><Button variant="ghost" size="sm">Admin tools →</Button></Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Couldn&apos;t load the dashboard. <button onClick={fetchData} className="underline">Try again</button>.
        </div>
      )}

      {loading && !data && (
        <div className="space-y-7">
          {[3, 6, 2].map((cols, r) => (
            <div key={r} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(cols)].map((_, j) => <div key={j} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />)}
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── ACTION CENTER ── */}
          <section>
            <SectionHead hint="items awaiting council action">action center</SectionHead>
            {(() => {
              const totalPending = ACTION_QUEUES.reduce((sum, q) => sum + (data.queues[q.key] ?? 0), 0);
              return totalPending > 0 ? (
                <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 flex items-center gap-3 mb-3">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <p className="text-sm text-foreground">
                    <strong className="text-red-400 font-semibold">{num(totalPending)}</strong>{' '}
                    {totalPending === 1 ? 'item needs' : 'items need'} your attention across the queues below.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-good/40 bg-good-soft px-4 py-3 flex items-center gap-3 mb-3">
                  <span className="text-good text-base leading-none">✓</span>
                  <p className="text-sm text-foreground">All clear — every council queue is empty. Nice.</p>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ACTION_QUEUES.map((q) => (
                <QueueCard key={q.key} count={data.queues[q.key] ?? 0} label={q.label} sub={q.sub} href={q.href} icon={q.icon} />
              ))}
            </div>
          </section>

          {/* ── PLATFORM KPIs ── */}
          <section>
            <SectionHead hint="all-time unless noted">platform</SectionHead>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard label="Total users" value={num(data.kpis.users_total)} sub={`+${num(data.kpis.users_new_7d)} this week · +${num(data.kpis.users_new_30d)} / 30d`} />
              <StatCard label="Creators" value={num(data.kpis.creators_enabled)} sub="enabled" href="/admin/creators" />
              <StatCard label="GMV (settled)" value={usd0(data.kpis.gmv_total)} sub="lifetime fan charges" />
              <StatCard label="Fee revenue · MTD" value={usd(data.kpis.fee_revenue_mtd)} sub={`${usd0(data.kpis.fee_revenue_total)} all-time`} />
              <StatCard label="Open bounties" value={num(data.kpis.bounties.open)} sub={`${num(data.kpis.bounties.completed)} completed · ${num(data.kpis.bounties.paid_out)} paid out`} href="/admin/featured-bounties" />
              <StatCard label="Unique visitors" value={num(data.kpis.unique_visitors)} sub={`${num(data.kpis.pageviews_total)} views · ${data.kpis.bot_view_share}% bots`} href="/admin/analytics" />
            </div>
          </section>

          {/* ── TRENDS ── */}
          <section>
            <SectionHead hint="last 14 days">trends</SectionHead>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChartCard title="New signups" total={num(data.trends.signups.reduce((s, p) => s + (p.count ?? 0), 0))}>
                <MiniBars data={data.trends.signups.map((p) => p.count ?? 0)} />
              </ChartCard>
              <ChartCard title="GMV collected" total={usd0(data.trends.gmv.reduce((s, p) => s + (p.value ?? 0), 0))}>
                <Sparkline data={data.trends.gmv.map((p) => p.value ?? 0)} />
              </ChartCard>
            </div>
          </section>

          {/* ── MONEY & HEALTH ── */}
          <section>
            <SectionHead hint="council view — Stripe balance lives on Treasury">money &amp; health</SectionHead>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Next billing run"
                value={new Date(data.money.next_billing_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                sub={data.money.last_run ? `last: ${usd0(data.money.last_run.total_collected)} collected` : 'no runs yet'}
                href="/admin/billing"
              />
              <StatCard label="Owed to creators" value={usd0(data.money.creator_owed)} sub={`${usd0(data.money.creator_available)} available · ${usd0(data.money.creator_clearing)} clearing`} />
              <StatCard label="Paid out" value={usd0(data.money.creator_paid_out)} sub="to creators, lifetime" />
              <StatCard label="Refunds · 30d" value={usd(data.money.refunds_30d)} sub="succeeded" href="/admin/refunds" />
              <StatCard label="Open disputes" value={num(data.queues.disputes_open)} sub="needs response / review" alert={data.queues.disputes_open > 0} />
              <StatCard label="Fans in grace" value={num(data.queues.fans_in_grace)} sub="post-failure window" alert={data.queues.fans_in_grace > 0} />
              <StatCard label="Failed withdrawals" value={num(data.queues.withdrawals_failed)} sub="creator payouts" alert={data.queues.withdrawals_failed > 0} href="/admin/external-payouts" />
              <StatCard label="Revoked bounties" value={num(data.kpis.bounties.revoked)} sub="lifetime" />
            </div>
          </section>

          {/* ── RECENT ACTIVITY ── */}
          <section>
            <SectionHead>recent activity</SectionHead>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* signups */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Newest users</p>
                {data.recent.signups.length === 0 ? (
                  <p className="text-sm text-muted py-2">No users yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recent.signups.map((u) => (
                      <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <span className="text-sm text-foreground truncate">{u.display_name || `User #${u.id}`}</span>
                          {u.is_creator && <Badge tone="creator" xs className="ml-2">creator</Badge>}
                        </div>
                        <span className="text-xs text-muted shrink-0">{timeAgo(u.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* bounties */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Newest bounties</p>
                {data.recent.bounties.length === 0 ? (
                  <p className="text-sm text-muted py-2">No bounties yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recent.bounties.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <Badge tone={bountyTone(b.status)} xs>{b.status.replace('_', ' ')}</Badge>
                          <span className="text-sm text-foreground truncate">{b.title}</span>
                        </div>
                        <span className="text-xs text-muted shrink-0 tabular-nums">{usd0(b.total_backed)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
