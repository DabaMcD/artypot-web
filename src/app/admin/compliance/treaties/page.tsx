'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComplianceTaxTreaty } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Select, FieldLabel } from '@/components/ui/Input';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function countryFlag(code: string) {
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  } catch {
    return '';
  }
}

function isOverdue(verifiedAt: string | null) {
  if (!verifiedAt) return true;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return new Date(verifiedAt) < cutoff;
}

export default function TreatiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ComplianceTaxTreaty[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterCountry, setFilterCountry] = useState('');
  const [filterW8Ben, setFilterW8Ben] = useState(''); // '' | '1' | '0'
  const [activeOnly, setActiveOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [countries, setCountries] = useState<{ code_alpha2: string; name_common: string }[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetch = useCallback(async (p: number, country: string, w8ben: string, actOnly: boolean, overdOnly: boolean) => {
    setLoading(true);
    try {
      const res = await adminApi.complianceTreaties({
        page: p,
        country_code: country || undefined,
        requires_w8ben: w8ben === '' ? undefined : w8ben === '1',
        active_only: actOnly || undefined,
        overdue_review: overdOnly || undefined,
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
      fetch(1, filterCountry, filterW8Ben, activeOnly, overdueOnly);
      adminApi.complianceCountries().then((r) => setCountries(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.role === 'council') {
      fetch(1, filterCountry, filterW8Ben, activeOnly, overdueOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCountry, filterW8Ben, activeOnly, overdueOnly]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">tax treaties</h1>
          <p className="text-sm text-muted mt-1">{total} records</p>
        </div>
        <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <FieldLabel>Country</FieldLabel>
          <Select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.code_alpha2} value={c.code_alpha2}>{c.name_common}</option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Requires W-8BEN</FieldLabel>
          <Select value={filterW8Ben} onChange={(e) => setFilterW8Ben(e.target.value)}>
            <option value="">All</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="accent-[var(--color-role)]" />
          <span className="text-sm text-muted">Active only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="accent-[var(--color-role)]" />
          <span className="text-sm text-muted">Overdue review only</span>
        </label>
      </div>

      {loading ? (
        <Card><div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : rows.length === 0 ? (
        <Empty>No tax treaties match these filters.</Empty>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5 -my-4">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Country</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">In Force</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Services %</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Royalties %</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Other %</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">W-8BEN</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Article</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Verified</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const overdue = !row.sunset_date && isOverdue(row.verified_at);
                  return (
                    <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3 text-foreground">
                        {row.country ? `${countryFlag(row.country_code)} ${row.country.name_common}` : row.country_code}
                      </td>
                      <td className="px-4 py-3 text-muted font-mono text-[11px]">{fmt(row.treaty_in_force_date)}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{row.withholding_rate_services}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{row.withholding_rate_royalties}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{row.withholding_rate_other ?? '—'}</td>
                      <td className="px-4 py-3">
                        {row.requires_w8ben ? <span className="text-good">✓</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{row.treaty_article_reference ?? '—'}</td>
                      <td className="px-4 py-3">
                        {overdue ? (
                          <Badge tone="warn">⚠ overdue</Badge>
                        ) : row.verified_at ? (
                          <span className="font-mono text-[11px] text-good">✓ {fmt(row.verified_at)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted text-xs max-w-[150px] truncate">{row.notes ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetch(page - 1, filterCountry, filterW8Ben, activeOnly, overdueOnly)}>← prev</Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{page} / {lastPage}</span>
          <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetch(page + 1, filterCountry, filterW8Ben, activeOnly, overdueOnly)}>next →</Button>
        </div>
      )}
    </div>
  );
}
