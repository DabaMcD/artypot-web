'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { CompliancePlatformFeeTaxRate } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Banner } from '@/components/ui/Banner';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea, FieldLabel, FieldHint } from '@/components/ui/Input';
import { US_STATES } from './states';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Stored as a fraction (e.g. "0.062500"); show it to humans as a percent.
function fmtPct(rate: string) {
  const pct = Number(rate) * 100;
  return `${parseFloat(pct.toFixed(6))}%`;
}

/** Edit an existing rate. state_code is immutable — create a new row for a different state. */
function EditRateModal({
  rate,
  onClose,
  onDone,
}: {
  rate: CompliancePlatformFeeTaxRate;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [ratePct, setRatePct] = useState(String(parseFloat((Number(rate.rate) * 100).toFixed(6))));
  const [subdivision, setSubdivision] = useState(rate.subdivision_code ?? '');
  const [effectiveDate, setEffectiveDate] = useState(rate.effective_date?.slice(0, 10) ?? '');
  const [sunsetDate, setSunsetDate] = useState(rate.sunset_date?.slice(0, 10) ?? '');
  const [source, setSource] = useState(rate.source ?? '');
  const [sourceUrl, setSourceUrl] = useState(rate.source_url ?? '');
  const [notes, setNotes] = useState(rate.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pctNum = Number(ratePct);
  const canSubmit =
    ratePct !== '' && !Number.isNaN(pctNum) && pctNum >= 0 && pctNum <= 100 &&
    !!source.trim() && !!effectiveDate && !saving;

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) return;
    setSaving(true);
    try {
      await adminApi.updatePlatformFeeTaxRate(rate.id, {
        subdivision_code: subdivision.trim() || null,
        rate: pctNum / 100,
        source: source.trim(),
        source_url: sourceUrl.trim() || null,
        effective_date: effectiveDate,
        sunset_date: sunsetDate || null,
        notes: notes.trim() || null,
      });
      toast('Rate updated.', 'success');
      onDone();
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to update rate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Edit ${rate.state_code} rate`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>State</FieldLabel>
          <Input value={rate.state_code} mono disabled />
          <FieldHint>State is fixed. Create a new rate for a different state.</FieldHint>
        </div>
        <div>
          <FieldLabel>Tax rate (%)</FieldLabel>
          <Input type="number" step="0.0001" min="0" max="100" value={ratePct} onChange={(e) => setRatePct(e.target.value)} mono />
          <FieldHint>Percent of the platform fee. e.g. 6.25 = 6.25%.</FieldHint>
        </div>
        <div>
          <FieldLabel>Subdivision code <span className="text-muted/50 font-normal">(optional)</span></FieldLabel>
          <Input value={subdivision} onChange={(e) => setSubdivision(e.target.value)} mono placeholder="county/city — leave blank for state-level" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Effective date</FieldLabel>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} mono />
          </div>
          <div>
            <FieldLabel>Sunset date <span className="text-muted/50 font-normal">(optional)</span></FieldLabel>
            <Input type="date" value={sunsetDate} onChange={(e) => setSunsetDate(e.target.value)} mono />
          </div>
        </div>
        <div>
          <FieldLabel>Source</FieldLabel>
          <Input value={source} onChange={(e) => setSource(e.target.value)} maxLength={100} />
        </div>
        <div>
          <FieldLabel>Source URL <span className="text-muted/50 font-normal">(optional)</span></FieldLabel>
          <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <FieldLabel>Notes <span className="text-muted/50 font-normal">(optional)</span></FieldLabel>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
        </div>
        {error && <Banner tone="bad">{error}</Banner>}
      </div>
    </Modal>
  );
}

/** Sunset (stop collecting) a rate. */
function SunsetRateModal({
  rate,
  onClose,
  onDone,
}: {
  rate: CompliancePlatformFeeTaxRate;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [sunsetDate, setSunsetDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await adminApi.sunsetPlatformFeeTaxRate(rate.id, { sunset_date: sunsetDate });
      toast('Rate sunset.', 'success');
      onDone();
    } catch (err: unknown) {
      toast((err as { message?: string }).message ?? 'Failed to sunset rate.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Sunset ${rate.state_code} rate`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Sunsetting…' : 'Sunset rate'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Banner tone="warn">After the sunset date we stop collecting under this rate. The row is kept for historical (as-of) lookups.</Banner>
        <div>
          <FieldLabel>Sunset date</FieldLabel>
          <Input type="date" value={sunsetDate} onChange={(e) => setSunsetDate(e.target.value)} mono />
        </div>
      </div>
    </Modal>
  );
}

export default function PlatformFeeTaxRatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<CompliancePlatformFeeTaxRate[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterState, setFilterState] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  const [editRate, setEditRate] = useState<CompliancePlatformFeeTaxRate | null>(null);
  const [sunsetRate, setSunsetRate] = useState<CompliancePlatformFeeTaxRate | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchData = useCallback(async (p: number, state: string, active: boolean) => {
    setLoading(true);
    try {
      const res = await adminApi.compliancePlatformFeeTaxRates({
        page: p,
        state_code: state || undefined,
        active_only: active || undefined,
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
    if (user?.role === 'council') fetchData(1, filterState, activeOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterState, activeOnly]);

  if (authLoading || !user || user.role !== 'council') return null;

  const refresh = () => {
    setEditRate(null);
    setSunsetRate(null);
    fetchData(page, filterState, activeOnly);
  };

  return (
    <>
      {editRate && <EditRateModal rate={editRate} onClose={() => setEditRate(null)} onDone={refresh} />}
      {sunsetRate && <SunsetRateModal rate={sunsetRate} onClose={() => setSunsetRate(null)} onDone={refresh} />}

      <div className="space-y-6 pt-2 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin · compliance</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">platform fee tax</h1>
            <p className="text-sm text-muted mt-1">{total} rate{total === 1 ? '' : 's'} — US sales tax on the platform commission. No active row ⇒ we don&apos;t collect.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/compliance/platform-fee-tax-rates/new">
              <Button variant="primary" size="sm">+ Add rate</Button>
            </Link>
            <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <FieldLabel>State</FieldLabel>
            <Select value={filterState} onChange={(e) => setFilterState(e.target.value)}>
              <option value="">All states</option>
              {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
            </Select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={activeOnly ? 'active' : 'all'} onChange={(e) => setActiveOnly(e.target.value === 'active')}>
              <option value="all">All</option>
              <option value="active">Active only</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <Card><div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
        ) : rows.length === 0 ? (
          <Empty>No platform fee tax rates yet. Add one to start collecting in a state.</Empty>
        ) : (
          <Card>
            <div className="overflow-x-auto -mx-5 -my-4">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">State</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Rate</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Effective</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Sunset</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Source</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Verified</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const sunset = !!row.sunset_date;
                    return (
                      <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                        <td className="px-5 py-3 font-mono text-[13px] font-bold text-foreground">
                          {row.state_code}
                          {row.subdivision_code && <span className="text-muted font-normal"> / {row.subdivision_code}</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-foreground">{fmtPct(row.rate)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmt(row.effective_date)}</td>
                        <td className="px-4 py-3">
                          {sunset
                            ? <Badge tone="default">{fmt(row.sunset_date)}</Badge>
                            : <Badge tone="good">active</Badge>}
                        </td>
                        <td className="px-4 py-3 text-muted text-xs max-w-[180px] truncate">{row.source}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmt(row.verified_at)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditRate(row)}>edit</Button>
                            {!sunset && <Button variant="danger" size="sm" onClick={() => setSunsetRate(row)}>sunset</Button>}
                          </div>
                        </td>
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
            <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchData(page - 1, filterState, activeOnly)}>← prev</Button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{page} / {lastPage}</span>
            <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchData(page + 1, filterState, activeOnly)}>next →</Button>
          </div>
        )}
      </div>
    </>
  );
}
