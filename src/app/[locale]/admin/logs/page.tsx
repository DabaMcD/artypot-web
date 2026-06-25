'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AuditLogEntry, AuditLogSource, AuditLogCategory } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Input, Select, FieldLabel } from '@/components/ui/Input';

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const CATEGORY_TONE: Record<AuditLogCategory, 'info' | 'warn' | 'good' | 'default' | 'council'> = {
  accounts:   'info',
  compliance: 'warn',
  money:      'good',
  content:    'default',
  governance: 'council',
  moderation: 'warn',
  system:     'default',
};

const CATEGORY_PILLS: { label: string; value: AuditLogCategory | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Accounts', value: 'accounts' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Money', value: 'money' },
  { label: 'Content', value: 'content' },
  { label: 'Governance', value: 'governance' },
  { label: 'Moderation', value: 'moderation' },
  { label: 'System', value: 'system' },
];

function ActorCell({ actor }: { actor: { id: number; display_name: string } | null }) {
  if (!actor) return <span className="font-mono text-[11px] text-muted">system</span>;
  return (
    <Link href={`/admin/users?focus=${actor.id}`} className="group block min-w-0">
      <div className="text-sm text-foreground group-hover:underline truncate">{actor.display_name}</div>
      <div className="font-mono text-[10px] text-muted">#{actor.id}</div>
    </Link>
  );
}

/** Renders the change detail: field old→new, or a free-text note, or a single value. */
function ChangeCell({ entry }: { entry: AuditLogEntry }) {
  const hasDelta = entry.field && (entry.old_value !== null || entry.new_value !== null);
  return (
    <div className="min-w-0">
      {hasDelta ? (
        <div className="font-mono text-[11px] leading-relaxed">
          <span className="text-muted">{entry.field}: </span>
          {entry.old_value !== null && <span className="text-bad/80 line-through">{entry.old_value}</span>}
          {entry.old_value !== null && <span className="text-muted"> → </span>}
          <span className="text-foreground">{entry.new_value ?? '∅'}</span>
        </div>
      ) : entry.new_value ? (
        <div className="font-mono text-[11px] text-foreground">{entry.new_value}</div>
      ) : null}
      {entry.note && <div className="text-[11px] text-muted italic mt-0.5 line-clamp-2">{entry.note}</div>}
    </div>
  );
}

export default function LogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [sources, setSources] = useState<AuditLogSource[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<AuditLogCategory | ''>('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchLog = useCallback(async (p: number, cat: string, src: string, dFrom: string, dTo: string) => {
    setLoading(true);
    try {
      const res = await adminApi.auditLog({
        page: p,
        category: cat || undefined,
        source: src || undefined,
        from: dFrom || undefined,
        to: dTo || undefined,
      });
      setEntries(res.data);
      setSources(res.sources);
      setPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') fetchLog(1, category, source, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, category, source, from, to]);

  // Source dropdown options narrow to the selected category.
  const sourceOptions = useMemo(
    () => (category ? sources.filter((s) => s.category === category) : sources),
    [sources, category],
  );

  if (authLoading || !user || user.role !== 'council') return null;

  const hasFilters = !!(category || source || from || to);

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · operations</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">audit log</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            A unified, read-only record of administrative &amp; council actions — staff editing accounts,
            overriding tax residence, recording or reversing payouts, reviewing completions &amp; handles,
            and appointing council. Ordinary user self-service activity is excluded.
          </p>
        </div>
        <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
      </div>

      {/* Category pills */}
      <div>
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit flex-wrap">
          {CATEGORY_PILLS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setCategory(value); setSource(''); }}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                category === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[200px]">
          <FieldLabel>Action type</FieldLabel>
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All actions</option>
            {sourceOptions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>From</FieldLabel>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <FieldLabel>To</FieldLabel>
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setCategory(''); setSource(''); setFrom(''); setTo(''); }}>
            clear
          </Button>
        )}
        <div className="flex-1" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums self-center">
          {total} event{total === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <Card><div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : entries.length === 0 ? (
        <Empty icon="◫" title="No matching actions" message="No admin or council actions match these filters yet." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5 -my-4">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">When</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Actor</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Action</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Target</th>
                  <th className="text-left px-5 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2 transition-colors align-top">
                    <td className="px-5 py-3 font-mono text-[11px] text-muted whitespace-nowrap">{fmtDateTime(e.occurred_at)}</td>
                    <td className="px-3 py-3 max-w-[160px]"><ActorCell actor={e.actor} /></td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-foreground">{e.event}</div>
                      <Badge tone={CATEGORY_TONE[e.category]}>{e.category}</Badge>
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      {e.target_user && (
                        <Link href={`/admin/users?focus=${e.target_user.id}`} className="text-sm text-foreground hover:underline truncate block">
                          {e.target_user.display_name}
                        </Link>
                      )}
                      {e.subject && <div className="font-mono text-[10px] text-muted truncate">{e.subject}</div>}
                    </td>
                    <td className="px-5 py-3 max-w-[280px]"><ChangeCell entry={e} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchLog(page - 1, category, source, from, to)}>← Prev</Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">Page {page} of {lastPage}</span>
          <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchLog(page + 1, category, source, from, to)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
