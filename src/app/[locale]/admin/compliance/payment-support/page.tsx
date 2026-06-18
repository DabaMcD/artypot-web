'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CompliancePaymentSupport } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Select, FieldLabel } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';

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

const PROVIDER_LABELS: Record<string, string> = {
  stripe_charges:  'Stripe Charges',
  stripe_connect:  'Stripe Connect',
  plaid_payouts:   'Plaid Payouts',
};

const PROVIDER_TONES: Record<string, 'info' | 'good' | 'warn'> = {
  stripe_charges: 'info',
  stripe_connect: 'good',
  plaid_payouts:  'warn',
};

export default function PaymentSupportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<CompliancePaymentSupport[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterProvider, setFilterProvider] = useState('');
  const [filterSupported, setFilterSupported] = useState(''); // '' | '1' | '0'
  const [filterCountry, setFilterCountry] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [countries, setCountries] = useState<{ code_alpha2: string; name_common: string }[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchData = useCallback(async (p: number, provider: string, supported: string, country: string, actOnly: boolean) => {
    setLoading(true);
    try {
      const res = await adminApi.compliancePaymentSupport({
        page: p,
        provider: provider || undefined,
        supported: supported === '' ? undefined : supported === '1',
        country_code: country || undefined,
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
      fetchData(1, filterProvider, filterSupported, filterCountry, activeOnly);
      adminApi.complianceCountries().then((r) => setCountries(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchData(1, filterProvider, filterSupported, filterCountry, activeOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProvider, filterSupported, filterCountry, activeOnly]);

  if (authLoading || !user || user.role !== 'council') return null;

  const PROVIDER_PILLS = [
    { label: 'All', value: '' },
    { label: 'Stripe Charges', value: 'stripe_charges' },
    { label: 'Stripe Connect', value: 'stripe_connect' },
    { label: 'Plaid Payouts', value: 'plaid_payouts' },
  ];

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">payment support</h1>
          <p className="text-sm text-muted mt-1">{total} records</p>
        </div>
        <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <div className="text-xs text-muted mb-1.5">Provider</div>
          <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit flex-wrap">
            {PROVIDER_PILLS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilterProvider(value)}
                className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                  filterProvider === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <FieldLabel>Supported</FieldLabel>
            <Select value={filterSupported} onChange={(e) => setFilterSupported(e.target.value)}>
              <option value="">All</option>
              <option value="1">Supported</option>
              <option value="0">Unsupported</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Country</FieldLabel>
            <Select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.code_alpha2} value={c.code_alpha2}>{c.name_common}</option>
              ))}
            </Select>
          </div>
          <Toggle on={activeOnly} onChange={setActiveOnly} label="Active only" className="text-sm text-muted" />
        </div>
      </div>

      {loading ? (
        <Card><div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : rows.length === 0 ? (
        <Empty>No payment support records match these filters.</Empty>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5 -my-4">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Country</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Provider</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Supported</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Currencies</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Restrictions</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Verified</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Effective / Sunset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3 text-foreground">
                      {row.country ? `${countryFlag(row.country_code)} ${row.country.name_common}` : row.country_code}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={PROVIDER_TONES[row.provider] ?? 'default'}>{PROVIDER_LABELS[row.provider] ?? row.provider}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.supported
                        ? <span className="text-good font-bold">✓</span>
                        : <span className="text-bad font-bold">✕</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">{row.currency_codes.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-muted text-xs max-w-[160px] truncate">
                      {row.restrictions ? JSON.stringify(row.restrictions).slice(0, 60) : 'None'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmt(row.verified_at)}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-muted">
                      {fmt(row.effective_date)}{row.sunset_date ? ` → ${fmt(row.sunset_date)}` : ''}
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
          <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchData(page - 1, filterProvider, filterSupported, filterCountry, activeOnly)}>← prev</Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{page} / {lastPage}</span>
          <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchData(page + 1, filterProvider, filterSupported, filterCountry, activeOnly)}>next →</Button>
        </div>
      )}
    </div>
  );
}
