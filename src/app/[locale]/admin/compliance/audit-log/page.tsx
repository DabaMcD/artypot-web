'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComplianceAuditEntry } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Input, Select, FieldLabel } from '@/components/ui/Input';

import { formatDateTime as fmt } from '@/lib/format';

const KNOWN_TABLES = [
  'country_sanctions',
  'country_sanctions_entities',
  'country_tax_treaties',
  'country_payment_support',
  'us_state_tax_thresholds',
  'country_content_rules',
  'compliance_data_sources',
];

const TABLE_COLORS: Record<string, string> = {
  country_sanctions:          'text-bad',
  country_sanctions_entities: 'text-bad',
  country_tax_treaties:       'text-info',
  country_payment_support:    'text-good',
  us_state_tax_thresholds:    'text-warn',
  country_content_rules:      'text-warn',
  compliance_data_sources:    'text-muted',
};

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ComplianceAuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterTable, setFilterTable] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterQ, setFilterQ] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchData = useCallback(async (p: number, table: string, field: string, q: string) => {
    setLoading(true);
    try {
      const res = await adminApi.complianceAuditLog({
        page: p,
        table_name: table || undefined,
        field: field || undefined,
        q: q.trim() || undefined,
      });
      setRows(res.data);
      setPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') fetchData(1, filterTable, filterField, filterQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.role === 'council') fetchData(1, filterTable, filterField, filterQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTable, filterField]);

  const handleQChange = (val: string) => {
    setFilterQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchData(1, filterTable, filterField, val);
    }, 350);
  };

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">audit log</h1>
          <p className="text-sm text-muted mt-1">{total} entries</p>
        </div>
        <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <FieldLabel>Table</FieldLabel>
          <Select value={filterTable} onChange={(e) => setFilterTable(e.target.value)}>
            <option value="">All tables</option>
            {KNOWN_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Field</FieldLabel>
          <Input
            type="text"
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            placeholder="e.g. status, severity…"
          />
        </div>
        <div>
          <FieldLabel>Editor search</FieldLabel>
          <Input
            type="search"
            value={filterQ}
            onChange={(e) => handleQChange(e.target.value)}
            placeholder="name or email…"
          />
        </div>
      </div>

      {loading ? (
        <Card><div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : rows.length === 0 ? (
        <Empty>No audit log entries match these filters.</Empty>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5 -my-4">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">When</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Table</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Record</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Editor</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Field</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-muted whitespace-nowrap">{fmt(row.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      <span className={TABLE_COLORS[row.table_name] ?? 'text-muted'}>{row.table_name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">#{row.record_id}</td>
                    <td className="px-4 py-3">
                      {row.editor ? (
                        <div>
                          <div className="text-foreground text-sm">{row.editor.display_name}</div>
                          <div className="font-mono text-[10px] text-muted">{row.editor.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted font-mono text-[11px]">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-foreground">{row.field}</td>
                    <td className="px-5 py-3 font-mono text-[11px] max-w-[280px]">
                      <span className="text-muted line-through truncate inline-block max-w-[120px] align-bottom" title={row.old_value ?? ''}>
                        {row.old_value ? (row.old_value.length > 30 ? `${row.old_value.slice(0, 30)}…` : row.old_value) : 'null'}
                      </span>
                      <span className="text-muted mx-1">→</span>
                      <span className="text-foreground truncate inline-block max-w-[120px] align-bottom" title={row.new_value ?? ''}>
                        {row.new_value ? (row.new_value.length > 30 ? `${row.new_value.slice(0, 30)}…` : row.new_value) : 'null'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchData(page - 1, filterTable, filterField, filterQ)}>← prev</Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{page} / {lastPage}</span>
          <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchData(page + 1, filterTable, filterField, filterQ)}>next →</Button>
        </div>
      )}
    </div>
  );
}
