'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { Input, Select, Textarea, FieldLabel, FieldHint } from '@/components/ui/Input';
import { US_STATES } from '../states';

export default function NewPlatformFeeTaxRatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [stateCode, setStateCode] = useState('');
  const [ratePct, setRatePct] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [sunsetDate, setSunsetDate] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const pctNum = Number(ratePct);
  const canSubmit =
    !!stateCode &&
    ratePct !== '' && !Number.isNaN(pctNum) && pctNum >= 0 && pctNum <= 100 &&
    !!source.trim() && !!effectiveDate && !submitting;

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await adminApi.createPlatformFeeTaxRate({
        state_code: stateCode,
        subdivision_code: subdivision.trim() || null,
        rate: pctNum / 100,
        source: source.trim(),
        source_url: sourceUrl.trim() || null,
        effective_date: effectiveDate,
        sunset_date: sunsetDate || null,
        notes: notes.trim() || null,
      });
      toast('Platform fee tax rate added.', 'success');
      router.push('/admin/compliance/platform-fee-tax-rates');
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to add rate. Check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, stateCode, subdivision, pctNum, source, sourceUrl, effectiveDate, sunsetDate, notes, toast, router]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-3xl pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance · platform fee tax</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">add a tax rate</h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            US sales tax to collect on the platform fee (the 20% commission) in a state. Adding a rate turns collection on; an absent rate means we don&apos;t collect.
          </p>
        </div>
        <Link href="/admin/compliance/platform-fee-tax-rates">
          <Button variant="ghost" size="sm">← Rates</Button>
        </Link>
      </div>

      <Banner tone="default">
        <strong>Confirm against a primary source.</strong> Enter the rate as a percent of the platform fee — e.g. <span className="font-mono">6.25</span> for 6.25%.
      </Banner>

      <Card>
        <SectionLabel>1. Jurisdiction</SectionLabel>
        <div className="mt-3 space-y-4">
          <div>
            <FieldLabel>State</FieldLabel>
            <Select value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
              <option value="">Select a state…</option>
              {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
            </Select>
          </div>
          <div>
            <FieldLabel>Subdivision code <span className="text-muted/50 font-normal">(optional)</span></FieldLabel>
            <Input value={subdivision} onChange={(e) => setSubdivision(e.target.value)} mono placeholder="county/city code — leave blank for state-level" />
            <FieldHint>Reserved for future county/city granularity. Leave blank for a state-level rate.</FieldHint>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>2. Rate & dates</SectionLabel>
        <div className="mt-3 space-y-4">
          <div>
            <FieldLabel>Tax rate (%)</FieldLabel>
            <Input type="number" step="0.0001" min="0" max="100" value={ratePct} onChange={(e) => setRatePct(e.target.value)} mono placeholder="6.25" />
            <FieldHint>Percent of the platform fee. Stored as a fraction (6.25 → 0.0625).</FieldHint>
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
        </div>
      </Card>

      <Card>
        <SectionLabel>3. Provenance</SectionLabel>
        <div className="mt-3 space-y-4">
          <div>
            <FieldLabel>Source</FieldLabel>
            <Input value={source} onChange={(e) => setSource(e.target.value)} maxLength={100} placeholder="e.g. CPA guidance 2026 / State DOR" />
          </div>
          <div>
            <FieldLabel>Source URL <span className="text-muted/50 font-normal">(optional)</span></FieldLabel>
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <FieldLabel>Notes <span className="text-muted/50 font-normal">(optional)</span></FieldLabel>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} placeholder="Context, applicability, caveats…" />
          </div>
        </div>
      </Card>

      {error && <Banner tone="bad">{error}</Banner>}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Link href="/admin/compliance/platform-fee-tax-rates">
          <Button variant="ghost" disabled={submitting}>Cancel</Button>
        </Link>
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Adding…' : 'Add rate →'}
        </Button>
      </div>
    </div>
  );
}
