'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  CountryTier,
  CountryPayoutMode,
  CountryTierRow,
  CountryTierDefinition,
} from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Input, Select, FieldLabel } from '@/components/ui/Input';

function countryFlag(code: string): string {
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  } catch {
    return '';
  }
}

const TIER_TONE: Record<CountryTier, 'good' | 'info' | 'warn' | 'bad'> = {
  full:          'good',
  manual_payout: 'info',
  restricted:    'warn',
  blocked:       'bad',
};

const TIER_LABEL: Record<CountryTier, string> = {
  full:          'Full',
  manual_payout: 'Manual payout',
  restricted:    'Restricted',
  blocked:       'Blocked',
};

const TIER_SUBTITLE: Record<CountryTier, string> = {
  full:          'automated payouts',
  manual_payout: 'paid manually',
  restricted:    'review needed',
  blocked:       'not operable',
};

/** Fixed display order: lowest friction → blocked. */
const TIER_ORDER: CountryTier[] = ['full', 'manual_payout', 'restricted', 'blocked'];

const PAYOUT_MODE_LABEL: Record<CountryPayoutMode, string> = {
  automated: 'Automated',
  manual:    'Manual',
  blocked:   'Blocked',
};

const PAYOUT_MODE_TONE: Record<CountryPayoutMode, 'good' | 'info' | 'bad'> = {
  automated: 'good',
  manual:    'info',
  blocked:   'bad',
};

function YesNo({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-good font-bold" title="supported">✓</span>
    : <span className="text-muted font-bold" title="unavailable">✕</span>;
}

export default function TiersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<CountryTierRow[]>([]);
  const [summary, setSummary] = useState<Record<CountryTier, number> | null>(null);
  const [definitions, setDefinitions] = useState<CountryTierDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const [tierFilter, setTierFilter] = useState<CountryTier | ''>('');
  const [regionFilter, setRegionFilter] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'council') {
      adminApi.countryTiers()
        .then((r) => {
          setRows(r.data);
          setSummary(r.summary);
          setDefinitions(r.definitions);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  const regions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.region).filter(Boolean))).sort() as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (tierFilter ? r.tier === tierFilter : true))
      .filter((r) => (regionFilter ? r.region === regionFilter : true))
      .filter((r) => (q ? r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) : true))
      .sort((a, b) => a.tier_rank - b.tier_rank || a.name.localeCompare(b.name));
  }, [rows, tierFilter, regionFilter, query]);

  if (authLoading || !user || user.role !== 'council') return null;

  const defByTier = (t: CountryTier) => definitions.find((d) => d.tier === t);

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · operations</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">country tiers</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Payout &amp; onboarding eligibility per country, derived live from Stripe coverage and
            active sanctions — this view is read-only and always reflects current compliance data.
          </p>
        </div>
        <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
      </div>

      {/* Summary tiles — click to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TIER_ORDER.map((t) => {
          const active = tierFilter === t;
          const count = summary?.[t] ?? 0;
          const def = defByTier(t);
          return (
            <button
              key={t}
              onClick={() => setTierFilter(active ? '' : t)}
              title={def?.description}
              className={`text-left border rounded-md px-3 py-2.5 transition-colors cursor-pointer ${
                active ? 'border-[var(--color-role)] bg-[var(--color-role-soft)]' : 'border-border bg-surface-2 hover:bg-surface'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge tone={TIER_TONE[t]}>{TIER_LABEL[t]}</Badge>
                <span className="font-mono text-[16px] tabular-nums text-foreground">{loading ? '—' : count}</span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted/70">
                {TIER_SUBTITLE[t]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <Card accent>
        <SectionLabel className="mb-2">what the tiers mean</SectionLabel>
        <dl className="space-y-1.5">
          {TIER_ORDER.map((t) => {
            const def = defByTier(t);
            return (
              <div key={t} className="flex gap-3 items-baseline">
                <dt className="shrink-0 w-28"><Badge tone={TIER_TONE[t]}>{TIER_LABEL[t]}</Badge></dt>
                <dd className="text-xs text-muted">{def?.description ?? ''}</dd>
              </div>
            );
          })}
        </dl>
      </Card>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <FieldLabel>Search</FieldLabel>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Country name or code…"
          />
        </div>
        <div>
          <FieldLabel>Tier</FieldLabel>
          <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as CountryTier | '')}>
            <option value="">All tiers</option>
            {TIER_ORDER.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Region</FieldLabel>
          <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="">All regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        {(tierFilter || regionFilter || query) && (
          <Button variant="ghost" size="sm" onClick={() => { setTierFilter(''); setRegionFilter(''); setQuery(''); }}>
            clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Card><div className="space-y-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-12 bg-surface-2 animate-pulse rounded" />)}</div></Card>
      ) : filtered.length === 0 ? (
        <Empty icon="◇" message="No countries match these filters." />
      ) : (
        <Card>
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
            {filtered.length} of {rows.length} countries
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Country</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Tier</th>
                  <th className="text-center px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70" title="Fans in this country can be billed (Stripe charges)">Fans pay</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70" title="How creators here are paid out">Payouts</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Sanctions</th>
                  <th className="text-left px-5 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/70">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.code} className="hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="text-foreground">{countryFlag(r.code)} {r.name}</div>
                      <div className="font-mono text-[10px] text-muted">{r.code} · {r.region ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2.5"><Badge tone={TIER_TONE[r.tier]}>{TIER_LABEL[r.tier]}</Badge></td>
                    <td className="px-3 py-2.5 text-center"><YesNo ok={r.charges_supported} /></td>
                    <td className="px-3 py-2.5">
                      <Badge tone={PAYOUT_MODE_TONE[r.payout_mode]}>{PAYOUT_MODE_LABEL[r.payout_mode]}</Badge>
                      {r.payout_mode === 'manual' && (
                        <span className="block font-mono text-[9px] text-muted/70 mt-0.5">Wise / PayPal / wire</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.sanctions.length === 0 ? (
                        <span className="font-mono text-[11px] text-muted/50">none</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {r.sanctions.slice(0, 2).map((s, i) => (
                            <span
                              key={i}
                              className={`font-mono text-[10px] ${r.sanction_block ? 'text-bad' : 'text-warn'}`}
                              title={`${s.severity ?? ''}${s.subdivision_code ? ` · ${s.subdivision_code}` : ''}`}
                            >
                              {s.program_name}{s.subdivision_code ? ` (${s.subdivision_code})` : ''}
                            </span>
                          ))}
                          {r.sanctions.length > 2 && (
                            <span className="font-mono text-[10px] text-muted">+{r.sanctions.length - 2} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-muted max-w-[260px]">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
