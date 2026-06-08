'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { Input, Textarea, Select, FieldLabel, FieldHint } from '@/components/ui/Input';

type Severity = 'comprehensive_block' | 'sectoral' | 'list_based' | 'advisory';
type AppliesTo = 'all_residents' | 'specific_entities' | 'specific_sectors';

// ── Small inline help icon with hover tooltip ────────────────────────────────
// Uses a native title attribute for portability — the entire form is admin-only
// and the tooltip text below is intentionally verbose. If the design system
// later grows a real <Tooltip>, swap this out.
function Info({ children }: { children: string }) {
  return (
    <span
      title={children}
      className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted/40 text-muted text-[10px] font-mono cursor-help align-middle ml-1 hover:border-foreground hover:text-foreground transition-colors"
      aria-label="More info"
    >
      i
    </span>
  );
}

// Concise field-level guidance shown directly under inputs. Use this for
// "what does this mean" rather than the Info tooltip for "edge cases."
function Hint({ children }: { children: React.ReactNode }) {
  return <FieldHint className="mt-1">{children}</FieldHint>;
}

const SEVERITY_OPTIONS: { value: Severity; label: string; blurb: string }[] = [
  {
    value: 'comprehensive_block',
    label: 'Comprehensive block',
    blurb: 'No transactions of any kind. Blocks backing, payout, account creation, and handle claiming. Use for OFAC-listed regions and full embargo countries.',
  },
  {
    value: 'sectoral',
    label: 'Sectoral',
    blurb: 'Targets specific industries (e.g. Russian defense/energy). Does not block individual residents by default — informational tag, no runtime block in the current handler set.',
  },
  {
    value: 'list_based',
    label: 'List-based',
    blurb: 'Applies only to named entities/individuals from the linked source list. Use with the entities sub-table; alone it does not block country residents.',
  },
  {
    value: 'advisory',
    label: 'Advisory',
    blurb: 'Informational only. Does not affect runtime checks. Use to document heightened-risk regions without imposing a block.',
  },
];

const APPLIES_TO_OPTIONS: { value: AppliesTo; label: string; blurb: string }[] = [
  {
    value: 'all_residents',
    label: 'All residents',
    blurb: 'Every user whose declared tax residence falls within the country (or subdivision, if set). Choose this for Crimea-style region blocks.',
  },
  {
    value: 'specific_entities',
    label: 'Specific entities',
    blurb: 'Only the named entities in the entities sub-table (added separately after approval). Use for SDN-style person/company lists.',
  },
  {
    value: 'specific_sectors',
    label: 'Specific sectors',
    blurb: 'Industry-specific (banking, energy, defense). Documentary — no runtime check enforces this today.',
  },
];

export default function ProposeSanctionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [countries, setCountries] = useState<{ code_alpha2: string; name_common: string }[]>([]);

  // Form state
  const [countryCode, setCountryCode] = useState('');
  const [subdivisionCode, setSubdivisionCode] = useState('');
  const [programName, setProgramName] = useState('');
  const [severity, setSeverity] = useState<Severity>('comprehensive_block');
  const [appliesTo, setAppliesTo] = useState<AppliesTo>('all_residents');
  const [source, setSource] = useState('OFAC');
  const [sourceUrl, setSourceUrl] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [sunsetDate, setSunsetDate] = useState('');
  const [notes, setNotes] = useState('');

  // Live impact preview
  const [impactLoading, setImpactLoading] = useState(false);
  const [impact, setImpact] = useState<{
    affected_user_count: number;
    owned_open_bounties: number;
    backed_open_bounties: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'council') {
      adminApi.complianceCountries().then((r) => setCountries(r.data)).catch(() => {});
    }
  }, [user]);

  // ── Live impact preview ───────────────────────────────────────────────────
  // Debounce so each keystroke in subdivision_code doesn't fire a dry-run.
  // 350ms feels snappy enough for an admin tool without thrashing the API.
  useEffect(() => {
    if (!countryCode) {
      setImpact(null);
      return;
    }
    const handle = setTimeout(async () => {
      setImpactLoading(true);
      try {
        const sub = subdivisionCode.trim();
        const result = await adminApi.complianceDryRun({
          country_code: countryCode,
          subdivision_code: sub || undefined,
          severity,
        });
        setImpact(result);
      } catch {
        setImpact(null);
      } finally {
        setImpactLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [countryCode, subdivisionCode, severity]);

  // ── Validation ────────────────────────────────────────────────────────────
  const subdivisionLooksValid = useMemo(() => {
    if (!subdivisionCode) return true;
    const prefix = `${countryCode}-`;
    return subdivisionCode.toUpperCase().startsWith(prefix);
  }, [subdivisionCode, countryCode]);

  const canSubmit =
    !!countryCode &&
    !!programName.trim() &&
    !!source.trim() &&
    !!effectiveDate &&
    subdivisionLooksValid &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const response = await adminApi.proposeSanction({
        country_code: countryCode,
        subdivision_code: subdivisionCode.trim() || null,
        program_name: programName.trim(),
        severity,
        applies_to: appliesTo,
        source: source.trim(),
        source_url: sourceUrl.trim() || null,
        effective_date: effectiveDate,
        sunset_date: sunsetDate || null,
        notes: notes.trim() || null,
      });
      toast(
        `Sanction proposed. ${response.impact.affected_user_count} user(s) would be affected on approval. Awaiting second council member.`,
        'success',
      );
      router.push('/admin/compliance/sanctions');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setValidationError(e.message ?? 'Failed to submit. Check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit, countryCode, subdivisionCode, programName, severity, appliesTo,
    source, sourceUrl, effectiveDate, sunsetDate, notes, toast, router,
  ]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>council · admin · compliance · sanctions</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">propose a new sanction</h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            Submits in <span className="font-mono">pending_review</span>. A different
            council member must approve before any blocks take effect. You will
            <strong className="text-foreground"> not </strong>
            be able to approve your own proposal.
          </p>
        </div>
        <Link href="/admin/compliance/sanctions"><Button variant="ghost" size="sm">← Sanctions</Button></Link>
      </div>

      <Banner tone="default">
        <strong>Before you start:</strong> Confirm the rule against a primary source
        (OFAC press release, EU OJ, UK ONS notice). Speculative entries clutter the
        approval queue. The dry-run impact preview at the bottom updates live as
        you fill in the country/region — sanity-check the blast radius before
        submitting.
      </Banner>

      {/* ── 1. Country & region ────────────────────────────────────────────── */}
      <Card>
        <SectionLabel>1. Country & region</SectionLabel>
        <div className="mt-3 space-y-4">
          <div>
            <FieldLabel>
              Country
              <Info>The country this sanction applies to. Use ISO 3166-1 alpha-2 codes. Required even for region-scoped sanctions — the subdivision is matched within the country.</Info>
            </FieldLabel>
            <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              <option value="">Select a country…</option>
              {countries.map((c) => (
                <option key={c.code_alpha2} value={c.code_alpha2}>
                  {c.code_alpha2} — {c.name_common}
                </option>
              ))}
            </Select>
            <Hint>Example: <span className="font-mono">UA</span> for Ukraine, <span className="font-mono">IR</span> for Iran.</Hint>
          </div>

          <div>
            <FieldLabel>
              Subdivision code <span className="text-muted/50 font-normal normal-case tracking-normal">(optional — region-scoped sanctions only)</span>
              <Info>Full ISO 3166-2 code (with the country prefix), e.g. UA-43 for Crimea. Leave blank for a country-wide sanction. If set, only users who have declared this exact subdivision in their tax residence will be matched.</Info>
            </FieldLabel>
            <Input
              mono
              placeholder={countryCode ? `${countryCode}-XX` : 'e.g. UA-43'}
              value={subdivisionCode}
              onChange={(e) => setSubdivisionCode(e.target.value.toUpperCase())}
            />
            {subdivisionCode && !subdivisionLooksValid && (
              <Hint>
                <span className="text-bad">Format error:</span> subdivision must start with <span className="font-mono">{countryCode}-</span>.
              </Hint>
            )}
            {!subdivisionCode && (
              <Hint>
                Leave blank for a country-wide rule. Examples: <span className="font-mono">UA-43</span> Crimea, <span className="font-mono">UA-14</span> Donetsk, <span className="font-mono">UA-65</span> Kherson, <span className="font-mono">US-CA</span> California.
              </Hint>
            )}
          </div>
        </div>
      </Card>

      {/* ── 2. Program details ─────────────────────────────────────────────── */}
      <Card>
        <SectionLabel>2. Program details</SectionLabel>
        <div className="mt-3 space-y-4">
          <div>
            <FieldLabel>
              Program name
              <Info>Human-readable name of the sanctions program. This is shown in audit logs, council UI, and admin alert emails. Be specific — "Russia Sanctions" is too vague when there are 30 of them.</Info>
            </FieldLabel>
            <Input
              placeholder="e.g. Crimea Region Sanctions"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              maxLength={255}
            />
            <Hint>
              Good examples: <span className="font-mono">Crimea Region Sanctions</span>, <span className="font-mono">North Korea Comprehensive Block</span>, <span className="font-mono">Russia Sectoral – Defense</span>. Must be unique within the country.
            </Hint>
          </div>

          <div>
            <FieldLabel>Severity <Info>How aggressively the runtime enforces this rule. Only "comprehensive_block" produces a hard block in the current handler set. The others are documentary.</Info></FieldLabel>
            <div className="space-y-2 mt-1">
              {SEVERITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-surface-2 transition-colors">
                  <input
                    type="radio"
                    name="severity"
                    value={opt.value}
                    checked={severity === opt.value}
                    onChange={() => setSeverity(opt.value)}
                    className="mt-1 accent-[var(--color-role)]"
                  />
                  <div className="text-sm">
                    <div className="text-foreground font-medium">{opt.label}</div>
                    <div className="text-muted text-xs">{opt.blurb}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Applies to <Info>Scope of the program. "all_residents" is correct for region-scoped country sanctions. "specific_entities" is correct when used with the entities sub-table (added later).</Info></FieldLabel>
            <div className="space-y-2 mt-1">
              {APPLIES_TO_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-surface-2 transition-colors">
                  <input
                    type="radio"
                    name="applies_to"
                    value={opt.value}
                    checked={appliesTo === opt.value}
                    onChange={() => setAppliesTo(opt.value)}
                    className="mt-1 accent-[var(--color-role)]"
                  />
                  <div className="text-sm">
                    <div className="text-foreground font-medium">{opt.label}</div>
                    <div className="text-muted text-xs">{opt.blurb}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. Provenance ──────────────────────────────────────────────────── */}
      <Card>
        <SectionLabel>3. Provenance</SectionLabel>
        <div className="mt-3 space-y-4">
          <div>
            <FieldLabel>
              Source
              <Info>The authoritative body that issued this sanction. Used for audit trails and the "data source freshness" dashboard. Short identifier, not a URL.</Info>
            </FieldLabel>
            <Input
              placeholder="OFAC"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={100}
            />
            <Hint>
              Examples: <span className="font-mono">OFAC</span>, <span className="font-mono">EU Sanctions Map</span>, <span className="font-mono">UK ONS</span>, <span className="font-mono">UN Security Council</span>.
            </Hint>
          </div>

          <div>
            <FieldLabel>
              Source URL <span className="text-muted/50 font-normal normal-case tracking-normal">(optional but strongly encouraged)</span>
              <Info>A stable URL pointing to the official notice. This becomes the "verify" link in the council approval UI — the second approver clicks through to confirm before approving.</Info>
            </FieldLabel>
            <Input
              type="url"
              placeholder="https://ofac.treasury.gov/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              maxLength={2048}
            />
            <Hint>
              Example: <span className="font-mono break-all text-[10px]">https://ofac.treasury.gov/sanctions-programs-and-country-information/ukraine-russia-related-sanctions</span>
            </Hint>
          </div>
        </div>
      </Card>

      {/* ── 4. Dates ───────────────────────────────────────────────────────── */}
      <Card>
        <SectionLabel>4. Dates</SectionLabel>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>
              Effective date
              <Info>When this sanction was (or will be) enacted by the issuing authority. For historical entries this is the publication date — not when you're proposing the row.</Info>
            </FieldLabel>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} mono />
            <Hint>Example: <span className="font-mono">2014-12-19</span> (Crimea EO), <span className="font-mono">2022-09-30</span> (Kherson/Zaporizhzhia EO).</Hint>
          </div>

          <div>
            <FieldLabel>
              Sunset date <span className="text-muted/50 font-normal normal-case tracking-normal">(optional)</span>
              <Info>Date the sanction expires or was lifted. Leave blank for indefinite. The runtime check honors this — past-sunset rules don't enforce.</Info>
            </FieldLabel>
            <Input type="date" value={sunsetDate} onChange={(e) => setSunsetDate(e.target.value)} mono />
            <Hint>Leave blank if the sanction has no scheduled end date.</Hint>
          </div>
        </div>
      </Card>

      {/* ── 5. Notes ───────────────────────────────────────────────────────── */}
      <Card>
        <SectionLabel>5. Notes for council reviewer</SectionLabel>
        <div className="mt-3">
          <FieldLabel>
            Notes <span className="text-muted/50 font-normal normal-case tracking-normal">(visible in council UI and admin alerts)</span>
            <Info>Free text explaining context, edge cases, or special handling. The second approver will see this. Aim for one or two sentences explaining "why this rule, in this form."</Info>
          </FieldLabel>
          <Textarea
            rows={4}
            placeholder={`e.g. "Sevastopol is sanctioned alongside Crimea under the same Crimea Region Sanctions Regulations. Tracked as a separate ISO 3166-2 subdivision (UA-40)."`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
          />
          <Hint>
            Skip if the program name is self-explanatory. Otherwise: link to the press release, name the EO, call out anything unusual about scope.
          </Hint>
        </div>
      </Card>

      {/* ── 6. Live impact preview ─────────────────────────────────────────── */}
      <Card>
        <SectionLabel>6. Predicted impact <span className="text-muted/50 font-normal normal-case tracking-normal">(live)</span></SectionLabel>
        <div className="mt-3">
          {!countryCode ? (
            <p className="text-sm text-muted">Choose a country to see the predicted impact.</p>
          ) : impactLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-6 bg-surface-2 animate-pulse rounded" />)}
            </div>
          ) : impact ? (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Users affected</div>
                  <div className="text-foreground font-display text-2xl mt-1">{impact.affected_user_count}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Open bounties owned</div>
                  <div className="text-foreground font-display text-2xl mt-1">{impact.owned_open_bounties}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Open bounties backed</div>
                  <div className="text-foreground font-display text-2xl mt-1">{impact.backed_open_bounties}</div>
                </div>
              </div>
              {impact.affected_user_count > 0 && (
                <Banner tone="warn" className="mt-3">
                  On approval, <strong>{impact.affected_user_count}</strong> admin-alert email{impact.affected_user_count === 1 ? '' : 's'} will be sent.
                  Each affected creator must be contacted personally before any payout hold is placed.
                </Banner>
              )}
              {impact.affected_user_count === 0 && subdivisionCode && (
                <p className="text-xs text-muted mt-3">
                  Zero matches today. This is normal for newly-added subdivisions where no user has yet declared that oblast as their tax residence.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Impact preview unavailable. The dry-run endpoint returned no data.</p>
          )}
        </div>
      </Card>

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      {validationError && <Banner tone="bad">{validationError}</Banner>}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Link href="/admin/compliance/sanctions">
          <Button variant="ghost" disabled={submitting}>Cancel</Button>
        </Link>
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Submitting…' : 'Submit for council approval →'}
        </Button>
      </div>
    </div>
  );
}
