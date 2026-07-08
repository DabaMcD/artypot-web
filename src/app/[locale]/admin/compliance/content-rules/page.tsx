'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComplianceContentRule } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Select, FieldLabel } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';

import { formatDate as fmt } from '@/lib/format';

function countryFlag(code: string) {
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  } catch {
    return '';
  }
}

export default function ContentRulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ComplianceContentRule[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterCountry, setFilterCountry] = useState('');
  const [filterAgeVerif, setFilterAgeVerif] = useState(false);
  const [filterLocalRep, setFilterLocalRep] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [countries, setCountries] = useState<{ code_alpha2: string; name_common: string }[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchData = useCallback(async (p: number, country: string, ageVerif: boolean, localRep: boolean, actOnly: boolean) => {
    setLoading(true);
    try {
      const res = await adminApi.complianceContentRules({
        page: p,
        country_code: country || undefined,
        requires_age_verification: ageVerif || undefined,
        requires_local_representative: localRep || undefined,
        active_only: actOnly || undefined,
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
      fetchData(1, filterCountry, filterAgeVerif, filterLocalRep, activeOnly);
      adminApi.complianceCountries().then((r) => setCountries(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchData(1, filterCountry, filterAgeVerif, filterLocalRep, activeOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCountry, filterAgeVerif, filterLocalRep, activeOnly]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">content rules</h1>
          <p className="text-sm text-muted mt-1">{total} records</p>
        </div>
        <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <FieldLabel>Country</FieldLabel>
          <Select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.code_alpha2} value={c.code_alpha2}>{c.name_common}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: 'Age verification required', value: filterAgeVerif, set: setFilterAgeVerif },
            { label: 'Local rep required', value: filterLocalRep, set: setFilterLocalRep },
            { label: 'Active only', value: activeOnly, set: setActiveOnly },
          ].map(({ label, value, set }) => (
            <Toggle key={label} on={value} onChange={set} label={label} className="text-sm text-muted" />
          ))}
        </div>
      </div>

      {loading ? (
        <Card><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : rows.length === 0 ? (
        <Empty>No content rules match these filters.</Empty>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5 -my-4">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Country</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Subdiv.</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Regulation</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Age Verif.</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Local Rep</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Mod Reports</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">US Platforms</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Verified</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3 text-foreground">
                      {row.country ? `${countryFlag(row.country_code)} ${row.country.name_common}` : row.country_code}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-[11px]">{row.subdivision_code ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-[160px] truncate">{row.regulation_name}</td>
                    <td className="px-4 py-3">
                      {row.requires_age_verification
                        ? <span className="text-warn">✓{row.age_verification_threshold ? ` (${row.age_verification_threshold}+)` : ''}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.requires_local_representative ? <span className="text-warn">✓</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.requires_content_moderation_reports ? <span className="text-warn">✓</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.applies_to_us_based_platforms ? <span className="text-info">✓</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmt(row.verified_at)}</td>
                    <td className="px-5 py-3 text-muted text-xs max-w-[150px] truncate">{row.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchData(page - 1, filterCountry, filterAgeVerif, filterLocalRep, activeOnly)}>← prev</Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{page} / {lastPage}</span>
          <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchData(page + 1, filterCountry, filterAgeVerif, filterLocalRep, activeOnly)}>next →</Button>
        </div>
      )}
    </div>
  );
}
