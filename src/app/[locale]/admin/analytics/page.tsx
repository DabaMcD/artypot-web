'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PageViewRow, PageViewSummary, PageViewType, DeviceType } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

type TypeFilter = PageViewType | 'all';

const TYPE_TABS: { label: string; value: TypeFilter }[] = [
  { label: 'all',     value: 'all' },
  { label: 'static',  value: 'static' },
  { label: 'bounty',  value: 'bounty' },
  { label: 'creator', value: 'creator' },
  { label: 'handle',  value: 'handle' },
  { label: 'app',     value: 'app' },
];

const TYPE_TONES: Record<PageViewType, 'default' | 'good' | 'info' | 'warn'> = {
  static: 'default', bounty: 'good', creator: 'info', handle: 'warn', app: 'default',
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  desktop: 'desktop', mobile: 'mobile', tablet: 'tablet', bot: 'bot', unknown: '?',
};
const DEVICE_ORDER: DeviceType[] = ['desktop', 'mobile', 'tablet', 'bot', 'unknown'];

function num(n: number): string {
  return n.toLocaleString('en-US');
}
function fmtDate(s: string | null): string {
  return s ? new Date(s).toLocaleDateString() : '—';
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-1">
      <p className="font-mono text-[10px] text-muted uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Compact "label N · label N" breakdown from a Record. */
function Breakdown({ entries }: { entries: [string, number][] }) {
  const shown = entries.filter(([, n]) => n > 0);
  if (shown.length === 0) return <span className="text-muted/50">—</span>;
  return (
    <span className="font-mono text-[10px] text-muted">
      {shown.map(([k, n], i) => (
        <span key={k}>
          {i > 0 && <span className="text-muted/40"> · </span>}
          {k} <span className="text-foreground tabular-nums">{num(n)}</span>
        </span>
      ))}
    </span>
  );
}

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [includeBots, setIncludeBots] = useState(false);
  const [sort, setSort] = useState<'views' | 'unique' | 'recent'>('views');
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d' | 'all'>('all');

  const [rows, setRows] = useState<PageViewRow[]>([]);
  const [summary, setSummary] = useState<PageViewSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchViews = useCallback(
    async (params: { q: string; type: TypeFilter; bots: boolean; sort: string; period: typeof period; page: number }) => {
      setLoading(true);
      try {
        const res = await adminApi.listPageViews({
          q: params.q || undefined,
          page_type: params.type,
          include_bots: params.bots || undefined,
          sort: params.sort as 'views' | 'unique' | 'recent',
          period: params.period,
          page: params.page,
        });
        setRows(res.data);
        setSummary(res.summary);
        setCurrentPage(res.current_page);
        setLastPage(res.last_page);
        setTotal(res.total);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (user?.role === 'council') {
      fetchViews({ q: debouncedQ, type: typeFilter, bots: includeBots, sort, period, page: 1 });
      setCurrentPage(1);
    }
  }, [debouncedQ, typeFilter, includeBots, sort, period, user, fetchViews]);

  if (authLoading || !user || user.role !== 'council') return null;

  const goToPage = (p: number) => {
    fetchViews({ q: debouncedQ, type: typeFilter, bots: includeBots, sort, period, page: p });
    setCurrentPage(p);
  };

  const botShare = summary && summary.bot_visitors + summary.human_visitors > 0
    ? Math.round((summary.bot_visitors / (summary.bot_visitors + summary.human_visitors)) * 100)
    : 0;

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">pageview analytics</h1>
          <p className="text-sm text-muted mt-1">
            Server-logged views of public pages · unique by hashed IP · first-view locale, device &amp; bot label
          </p>
        </div>
        <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
      </div>

      {/* Summary */}
      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total views" value={num(summary.total_views)} sub={`across ${num(summary.pages)} page${summary.pages === 1 ? '' : 's'}`} />
            <StatCard label="Unique visitors" value={num(summary.unique_visitors)} sub="distinct hashed IPs" />
            <StatCard label="Bot share" value={`${botShare}%`} sub={`${num(summary.bot_visitors)} bot · ${num(summary.human_visitors)} human`} />
            <StatCard label="Human views" value={num(summary.human_views)} sub={`${num(summary.bot_views)} bot views`} />
          </div>
          <div className="flex flex-col sm:flex-row gap-x-8 gap-y-1 px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest shrink-0">devices</span>
              <Breakdown entries={Object.entries(summary.devices).map(([k, v]) => [k, v.visitors])} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest shrink-0">locales</span>
              <Breakdown entries={Object.entries(summary.locales)} />
            </div>
          </div>
        </>
      )}

      {/* Search */}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by path…" />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
          {TYPE_TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                typeFilter === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIncludeBots((v) => !v)}
          className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded border transition-colors cursor-pointer ${
            includeBots ? 'bg-warn/10 border-warn/40 text-warn' : 'bg-surface border-border text-muted hover:text-foreground'
          }`}
          title="Include bot traffic in the table (the summary above always counts bots)"
        >
          🤖 {includeBots ? 'bots shown' : 'bots hidden'}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'views' | 'unique' | 'recent')}
          className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded border border-border bg-surface text-muted cursor-pointer"
        >
          <option value="views">sort: views</option>
          <option value="unique">sort: unique</option>
          <option value="recent">sort: recent</option>
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded border border-border bg-surface text-muted cursor-pointer"
          title="Show pages active within this window (by last-seen)"
        >
          <option value="all">period: all time</option>
          <option value="24h">period: 24h</option>
          <option value="7d">period: 7d</option>
          <option value="30d">period: 30d</option>
          <option value="90d">period: 90d</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Empty message="No pageviews recorded yet" />
      ) : (
        <Card>
          <div className="divide-y divide-border -mx-5 -my-4">
            {rows.map((r) => (
              <div key={r.page_path} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <Link href={r.page_path} className="text-sm text-fan hover:underline font-mono truncate">{r.page_path}</Link>
                    <Badge tone={TYPE_TONES[r.page_type]}>{r.page_type}</Badge>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono text-sm text-foreground tabular-nums">{num(r.total_views)}</span>
                    <span className="font-mono text-[10px] text-muted"> views</span>
                  </div>
                </div>
                <div className="flex items-center gap-x-4 gap-y-0.5 flex-wrap font-mono text-[10px] text-muted">
                  <span><span className="text-foreground tabular-nums">{num(r.unique_visitors)}</span> unique</span>
                  {includeBots && r.bot_visitors > 0 && (
                    <span className="text-warn">{num(r.bot_visitors)} bot</span>
                  )}
                  <Breakdown entries={DEVICE_ORDER.map((d) => [DEVICE_LABELS[d], r.devices[d] ?? 0])} />
                  <Breakdown entries={Object.entries(r.locales)} />
                  <span className="text-muted/60">last {fmtDate(r.last_seen_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="default" size="sm" disabled={currentPage === 1 || loading} onClick={() => goToPage(currentPage - 1)}>← prev</Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{currentPage} / {lastPage} · {num(total)} pages</span>
          <Button variant="default" size="sm" disabled={currentPage === lastPage || loading} onClick={() => goToPage(currentPage + 1)}>next →</Button>
        </div>
      )}
    </div>
  );
}
