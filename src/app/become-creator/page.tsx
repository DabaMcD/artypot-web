'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth as authApi, users as usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { FieldLabel } from '@/components/ui/Input';
import SlugInput from '@/components/SlugInput';
import HandlesSection from '@/components/HandlesSection';
import { COUNTRIES, subdivisions, subdivisionLabel } from '@/lib/countries';
import type { HandleClaim, HandlePlatform } from '@/lib/types';
import { platformLabel } from '@/lib/platforms';
import { PLATFORM_HANDLE_CONFIG } from '@/components/ui/PlatformHandleInput';
import { PLATFORM_FEE_PCT } from '@/lib/config';

const CREATOR_KEEP_PCT = 100 - PLATFORM_FEE_PCT;

// ── Creator TOS text ─────────────────────────────────────────────────────────
// Authoritative source: artypot-api/storage/legal/creator-tos.md
// DRAFT — pending legal review.

const CREATOR_TOS = `DRAFT — pending legal review.

ARTYPOT CREATOR TERMS OF SERVICE

These Creator Terms of Service ("Creator Terms") govern your participation as a creator on the Artypot platform. By enabling creator mode you form a binding agreement with Artypot LLC, a Florida limited liability company.

1. CREATOR'S COMMITMENTS

1.1 Deliver commissioned work. When a bounty reaches completion and is approved by the Artypot Council, you commit to delivering the work described in good faith within a reasonable timeframe.

1.2 Maintain accurate handle information. The social handles and websites you verify through Artypot must genuinely represent your identity. You must not impersonate another person or misrepresent your affiliation with any platform account.

1.3 Provide accurate tax information when requested. When your cumulative annual payouts reach IRS reporting thresholds (or equivalent local thresholds), you agree to provide a W-9 (US persons) or W-8BEN (non-US persons) upon request. Failure to provide required tax documentation will result in a hard block on payouts.

1.4 Keep your location of residence current. You must maintain an accurate country (and US state/territory if applicable) in your profile for earnings reporting and tax compliance.

1.5 Comply with all applicable laws. You are solely responsible for complying with all laws applicable to your activities on Artypot.

2. ARTYPOT'S ROLE

2.1 Platform, not employer. Artypot is a platform that facilitates fan-funded commissions. Artypot is not your employer, client, agent, or partner. You are an independent creator.

2.2 Payment intermediary. Artypot collects fan backings, holds them per its billing and refund policies, and disburses net proceeds to creators after platform fees.

2.3 No guarantee of earnings. Artypot does not guarantee that any bounty will reach any amount, that fans will fulfill backings, or that any particular level of earnings will result.

2.4 Council review. Bounty completion submissions are reviewed by the Artypot Council. Council decisions are final subject to the appeal process in the General Terms.

3. PAYOUTS AND FEES

3.1 Payout eligibility. To receive a payout you must have: (a) a verified location on file; (b) a connected Stripe bank account; and (c) required tax documentation (W-9 or W-8BEN).

3.2 Minimum payout threshold. Payouts are subject to a minimum balance (currently $10.00 USD). Balances below this threshold accumulate until the threshold is met.

3.3 Platform fee. Artypot deducts a ${PLATFORM_FEE_PCT}% platform fee from each payout; you keep the remaining ${CREATOR_KEEP_PCT}%. Fees are subject to change with 30 days' notice.

3.4 Hold period. Funds are subject to a 7-day hold before becoming available for withdrawal.

4. REFUNDS AND REVOCATIONS

4.1 Fan revocations. Fans may revoke open backings at any time before a bounty is marked complete. You are not entitled to compensation for revoked backings.

4.2 Council rejection. If the Council rejects a submission, no funds are collected. You may resubmit after addressing the Council's feedback.

4.3 Post-collection disputes. Artypot reserves the right to claw back disbursed funds in cases of verified fraud or material misrepresentation.

5. CONTENT RULES

5.1 No IP infringement. You must not submit work that infringes the copyrights, trademarks, or other intellectual property rights of any third party.

5.2 No prohibited content. You must not submit content that is illegal, depicts minors sexually, constitutes harassment or hate speech, contains malware, or violates Artypot's Community Guidelines.

5.3 Your rights. You retain all ownership rights in your creative work. Nothing in these terms transfers copyright to Artypot or to any fan.

6. TERMINATION

6.1 Artypot may suspend or terminate your creator status if you breach these terms, engage in fraud, fail to deliver work after funds are collected, or violate applicable law.

6.2 Upon termination, open bounties are closed, backings are returned to fans, and any available creator balance will be disbursed to you subject to outstanding disputes and tax documentation requirements.

7. GOVERNING LAW

These Creator Terms are governed by the laws of the State of Florida. Disputes shall be resolved by binding arbitration in Hillsborough County, Florida under AAA rules. You waive your right to participate in a class action.

Artypot LLC · Florida, USA · legal@artypot.com`;

// ── TOS + slug + activation form ──────────────────────────────────────────────

function TosGate({ onActivated }: { onActivated: () => void }) {
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState<string | null>('Slug is required.');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = agreed && slug.length > 0 && slugError === null && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await authApi.becomeCreator(slug);
      toast('Creator mode activated — welcome!', 'success');
      onActivated();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-5">
      {/* Slug picker */}
      <SlugInput
        value={slug}
        onChange={setSlug}
        label="choose your creator URL"
        onValidityChange={setSlugError}
      />

      {/* Scrollable TOS */}
      <div>
        <FieldLabel>creator terms of service</FieldLabel>
        <div className="border border-border rounded-md bg-surface-2 h-48 overflow-y-auto p-4">
          <pre className="font-mono text-[10px] leading-relaxed text-muted whitespace-pre-wrap break-words">
            {CREATOR_TOS}
          </pre>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 flex-shrink-0 w-4 h-4 accent-[var(--color-role)] cursor-pointer"
        />
        <span className="text-sm text-foreground leading-snug">
          I have read and agree to the Artypot Creator Terms of Service
        </span>
      </label>

      <Button type="submit" variant="primary" disabled={!canSubmit} className="w-full">
        {submitting ? 'Activating…' : 'Enable Creator Mode →'}
      </Button>
    </form>
  );
}

// ── Email verification gate ───────────────────────────────────────────────────

function EmailVerificationGate({ hasEmail }: { hasEmail: boolean }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  if (!hasEmail) {
    return (
      <div className="mt-3">
        <Banner tone="default">
          No email on your account.{' '}
          <Link href="/settings" className="underline">Add one in Settings</Link>{' '}
          to receive a verification link.
        </Banner>
      </div>
    );
  }

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast('Verification email sent — check your inbox.', 'success');
    } catch {
      toast('Could not send verification email. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Banner tone="default">
        A verification link was sent to your email address. Check your inbox (and spam folder).
      </Banner>
      <div>
        <Button variant="ghost" size="sm" onClick={handleResend} disabled={sending}>
          {sending ? 'Sending…' : 'Resend Verification Email'}
        </Button>
      </div>
    </div>
  );
}

// ── Tax residence form (inline in Gate 2) ─────────────────────────────────────

function TaxResidenceForm({
  initialCountry,
  initialState,
  onSaved,
  onCancel,
  showCancel,
}: {
  initialCountry: string;
  initialState: string;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
  showCancel: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState(initialCountry);
  const [stateCode, setStateCode] = useState(initialState);
  const [saving, setSaving] = useState(false);

  const needsState = !!countryCode && !!subdivisions(countryCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !countryCode) return;
    setSaving(true);
    try {
      await usersApi.update(user.id, {
        country_code: countryCode || null,
        state_code: needsState ? (stateCode || null) : null,
      });
      await onSaved();
      toast('Tax residence saved.', 'success');
    } catch {
      toast('Failed to save tax residence.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div>
        <FieldLabel>country</FieldLabel>
        <select
          value={countryCode}
          onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); }}
          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
        >
          <option value="">— select country —</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>
      {needsState && (
        <div>
          <FieldLabel>{subdivisionLabel(countryCode).toLowerCase()}</FieldLabel>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
            required
          >
            <option value="">— select {subdivisionLabel(countryCode).toLowerCase()} —</option>
            {subdivisions(countryCode)!.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={saving || !countryCode || (needsState && !stateCode)}
        >
          {saving ? 'Saving…' : 'Save Tax Residence'}
        </Button>
        {showCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

// ── Verified handles preview (collapsed display for Gate 3) ───────────────────

function VerifiedHandlesPreview({ refreshKey }: { refreshKey: number }) {
  const [claims, setClaims] = useState<HandleClaim[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    authApi.myHandles()
      .then((res) => { if (!cancelled) setClaims(res.data); })
      .catch(() => { if (!cancelled) setClaims([]); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (claims === null) {
    return <p className="text-xs font-mono text-muted mt-2">loading…</p>;
  }

  const verified = claims.filter((c) => c.status === 'verified');
  if (verified.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {verified.map((claim) => {
        const platform = claim.handle.platform as HandlePlatform;
        const prefix = PLATFORM_HANDLE_CONFIG[platform]?.prefix ?? '@';
        return (
          <li key={claim.claim_id} className="text-sm font-mono text-foreground">
            {prefix}{claim.handle.username}
            <span className="text-muted ml-2">{platformLabel(platform)}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Gate row ──────────────────────────────────────────────────────────────────

type GateStatus = 'complete' | 'active' | 'locked';

function GateRow({
  step,
  title,
  description,
  status,
  lockText = 'complete previous steps to unlock',
  actionSlot,
  children,
}: {
  step: number;
  title: string;
  description: string;
  status: GateStatus;
  lockText?: string;
  actionSlot?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-5 ${status === 'locked' ? 'border-border bg-surface opacity-50' : 'border-border bg-surface'}`}>
      <div className="flex items-start gap-4">
        {/* Badge */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold border ${
          status === 'complete'
            ? 'bg-good/10 border-good text-good'
            : status === 'active'
            ? 'bg-[var(--color-role-soft)] border-[var(--color-role)] text-[var(--color-role)]'
            : 'bg-surface-2 border-border text-muted'
        }`}>
          {status === 'complete' ? '✓' : status === 'locked' ? '🔒' : step}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-foreground">{title}</h3>
            {status === 'complete' && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-good">complete</span>
            )}
            {status === 'locked' && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {lockText}
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-0.5">{description}</p>
          {children}
        </div>

        {status !== 'locked' && actionSlot && (
          <div className="flex-shrink-0 mt-0.5">{actionSlot}</div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BecomeCreatorPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [editingResidence, setEditingResidence] = useState(false);
  const [editingHandles, setEditingHandles] = useState(false);
  // Bumped whenever the user toggles the handles editor closed, so the
  // collapsed preview re-fetches and reflects any newly-verified handles.
  const [handlesRefreshKey, setHandlesRefreshKey] = useState(0);

  const handleActivated = useCallback(async () => {
    await refreshUser();
    router.push('/c');
  }, [refreshUser, router]);

  const handleResidenceSaved = useCallback(async () => {
    await refreshUser();
    setEditingResidence(false);
  }, [refreshUser]);

  const handleDoneEditingHandles = useCallback(async () => {
    await refreshUser();
    setHandlesRefreshKey((k) => k + 1);
    setEditingHandles(false);
  }, [refreshUser]);

  // Redirect logged-out users to /login from an effect — calling router.push
  // during render schedules a setState on the Router and trips React's
  // "cannot update a component while rendering a different component" warning.
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  // Already a creator
  if (user.role === 'creator' || user.creator) {
    return (
      <div className="space-y-6 pt-2 max-w-[600px]">
        <div>
          <SectionLabel>creator</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">become a creator</h1>
        </div>
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">✓</span>
            <h2 className="font-bold text-lg text-good">you&apos;re already a creator</h2>
          </div>
          <p className="text-sm text-muted mb-4">
            Your creator account is active. Head to your creator dashboard to manage bounties, track earnings, and more.
          </p>
          <Link href="/c">
            <Button variant="primary">Go to Dashboard →</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const emailComplete     = !!user.email_verified_at;
  const handleComplete    = user.has_verified_handle ?? false;
  const residenceComplete = user.location_complete ?? false;
  // Strict sequential unlock — only one step is actionable at any time. We lead
  // with handle verification (the motivating, identity-affirming step) and defer
  // the compliance-flavored tax-residence ask until after the creator is
  // invested: email → handle → tax residence → TOS.
  const handleUnlocked    = emailComplete;
  const residenceUnlocked = emailComplete && handleComplete;
  const tosUnlocked       = emailComplete && handleComplete && residenceComplete;

  return (
    <div className="space-y-7 pt-2 max-w-[600px]">
      <div>
        <SectionLabel>fan</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">become a creator</h1>
        <p className="text-sm text-muted mt-1">
          Unlock the creator view to accept bounties and get paid for your work.
        </p>
      </div>

      {/* Up-front economics. The platform fee is a material term for the person
          making this decision, so it's stated plainly here — not buried — and
          framed as what you keep, since {CREATOR_KEEP_PCT}% beats every major
          streaming platform a creator is comparing us against. */}
      <Card>
        <div className="flex items-baseline gap-3">
          <span className="font-mono font-bold tabular-nums text-[34px] leading-none text-[var(--color-role)]">
            {CREATOR_KEEP_PCT}%
          </span>
          <div>
            <p className="font-bold text-foreground leading-tight">You keep {CREATOR_KEEP_PCT}% of every bounty.</p>
            <p className="text-sm text-muted leading-snug mt-0.5">
              Artypot&apos;s {PLATFORM_FEE_PCT}% covers card processing &amp; fraud protection, hosting,
              and the Council review that guarantees fans only pay for delivered work.
            </p>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mt-3 pt-3 border-t border-border">
          no signup fee · no monthly fee · no sales tax · deducted only from completed payouts
        </p>
      </Card>

      <div className="space-y-3">
        {/* Gate 1 — email verification */}
        <GateRow
          step={1}
          title="Verify Your Email Address"
          description="A verified email is required to receive creator notifications and tax communications"
          status={emailComplete ? 'complete' : 'active'}
        >
          {!emailComplete && (
            <EmailVerificationGate hasEmail={!!user.email} />
          )}
        </GateRow>

        {/* Gate 2 — verified handle (inline form, collapses when complete). Led
            with deliberately: it's the motivating "yes, this is really me" step
            and the cheapest to complete, so it hooks the creator before any
            compliance ask. */}
        <GateRow
          step={2}
          title="Verify a Handle"
          description="Link a social account so fans know you're the real deal"
          status={!handleUnlocked ? 'locked' : handleComplete ? 'complete' : 'active'}
          lockText="Verify your email to unlock"
          actionSlot={
            handleComplete && !editingHandles ? (
              <Button variant="ghost" size="sm" onClick={() => setEditingHandles(true)}>Edit</Button>
            ) : handleComplete && editingHandles ? (
              <Button variant="ghost" size="sm" onClick={handleDoneEditingHandles}>Done</Button>
            ) : undefined
          }
        >
          {handleUnlocked && (
            handleComplete && !editingHandles ? (
              <VerifiedHandlesPreview refreshKey={handlesRefreshKey} />
            ) : (
              <div className="mt-4">
                <HandlesSection bare />
              </div>
            )
          )}
        </GateRow>

        {/* Gate 3 — tax residence (inline form, collapses when complete) */}
        {(() => {
          const countryName = user.country_code
            ? COUNTRIES.find((c) => c.code === user.country_code)?.name ?? user.country_code
            : null;
          const stateName = (user.country_code && user.state_code && subdivisions(user.country_code))
            ? subdivisions(user.country_code)!.find((s) => s.code === user.state_code)?.name ?? user.state_code
            : null;
          const residenceDisplay = countryName
            ? (stateName ? `${countryName} — ${stateName}` : countryName)
            : null;
          const showForm = residenceUnlocked && (!residenceComplete || editingResidence);
          const residenceStatus: GateStatus = !residenceUnlocked
            ? 'locked'
            : residenceComplete ? 'complete' : 'active';
          return (
            <GateRow
              step={3}
              title="Add Your Tax Residence"
              description="We use this to know where to report your earnings later"
              status={residenceStatus}
              lockText="Verify a handle to unlock"
              actionSlot={
                residenceComplete && !editingResidence ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditingResidence(true)}>Edit</Button>
                ) : undefined
              }
            >
              {residenceComplete && !editingResidence && residenceDisplay && (
                <p className="text-sm text-foreground mt-2 font-mono">{residenceDisplay}</p>
              )}
              {showForm && (
                <TaxResidenceForm
                  initialCountry={user.country_code ?? ''}
                  initialState={user.state_code ?? ''}
                  onSaved={handleResidenceSaved}
                  onCancel={() => setEditingResidence(false)}
                  showCancel={editingResidence && residenceComplete}
                />
              )}
            </GateRow>
          );
        })()}

        {/* Gate 4 — TOS + slug */}
        <GateRow
          step={4}
          title="Agree to Creator TOS and Choose Your Primary Handle"
          description="Accept the creator terms and lock in your artypot.com/[slug] URL"
          status={!tosUnlocked ? 'locked' : 'active'}
          lockText="Complete steps 1–3 to unlock"
        >
          {tosUnlocked && <TosGate onActivated={handleActivated} />}
        </GateRow>
      </div>

      <Link href="/dashboard">
        <Button variant="ghost" size="sm">← Back to Dashboard</Button>
      </Link>
    </div>
  );
}
