'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComplianceStateThreshold } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Select, FieldLabel } from '@/components/ui/Input';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATES = ['AR', 'DC', 'IL', 'MA', 'MD', 'NJ', 'RI', 'VA', 'VT'];
const TAX_YEARS = [2024, 2025, 2026];

export default function StateThresholdsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ComplianceStateThreshold[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterState, setFilterState] = useState('');
  const [filterYear, setFilterYear] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchData = useCallback(async (p: number, state: string, year: string) => {
    setLoading(true);
    try {
      const res = await adminApi.complianceStateThresholds({
        page: p,
        state_code: state || undefined,
        tax_year: year ? Number(year) : undefined,
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
    if (user?.role === 'council') {
      fetchData(1, filterState, filterYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchData(1, filterState, filterYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, filterYear]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">state thresholds</h1>
          <p className="text-sm text-muted mt-1">{total} records — US state 1099-K filing thresholds</p>
        </div>
        <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <FieldLabel>State</FieldLabel>
          <Select value={filterState} onChange={(e) => setFilterState(e.target.value)}>
            <option value="">All states</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Tax year</FieldLabel>
          <Select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">All years</option>
            {TAX_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
      </div>

      {loading ? (
        <Card><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : rows.length === 0 ? (
        <Empty>No state threshold records match these filters.</Empty>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5 -my-4">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">State</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Tax Year</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Gross Payments</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Transactions</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Sep. Filing</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Filing Method</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3 font-mono text-[13px] font-bold text-foreground">{row.state_code}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">{row.tax_year}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {row.threshold_gross_payments ? `$${Number(row.threshold_gross_payments).toLocaleString()}` : 'None'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {row.threshold_transaction_count ?? 'None'}
                    </td>
                    <td className="px-4 py-3">
                      {row.requires_separate_state_filing ? <span className="text-warn">✓</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs max-w-[140px] truncate">{row.state_filing_method ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-muted">{fmt(row.verified_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchData(page - 1, filterState, filterYear)}>← prev</Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{page} / {lastPage}</span>
          <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchData(page + 1, filterState, filterYear)}>next →</Button>
        </div>
      )}
    </div>
  );
}
