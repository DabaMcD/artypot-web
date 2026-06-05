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
import { Toggle } from '@/components/ui/Toggle';
import { FieldLabel } from '@/components/ui/Input';
import SlugInput from '@/components/SlugInput';
import HandlesSection from '@/components/HandlesSection';
import CreatorTosTldr from '@/components/CreatorTosTldr';
import { COUNTRIES, subdivisions, subdivisionLabel } from '@/lib/countries';
import type { HandleClaim, HandlePlatform } from '@/lib/types';
import { platformLabel } from '@/lib/platforms';
import { PLATFORM_HANDLE_CONFIG } from '@/components/ui/PlatformHandleInput';
import { PLATFORM_FEE_PCT } from '@/lib/config';

const CREATOR_KEEP_PCT = 100 - PLATFORM_FEE_PCT;

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

      {/* Creator TOS summary + link to the full terms */}
      <div>
        <FieldLabel>creator terms of service</FieldLabel>
        <CreatorTosTldr
          className="mt-1"
          footnote="This TL;DR is a helpful summary, not a substitute for the full terms."
        />
        <Link
          href="/creator-tos"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-sm text-[var(--color-role)] hover:underline"
        >
          Read the full Creator Terms of Service →
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Toggle on={agreed} onChange={setAgreed} />
        </div>
        <span className="text-sm text-foreground leading-snug">
          I have read and agree to the{' '}
          <Link href="/creator-tos" target="_blank" rel="noopener noreferrer" className="text-[var(--color-role)] hover:underline">
            Artypot Creator Terms of Service
          </Link>
        </span>
      </div>

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

  // While the creator is still on step 1 (email) or step 2 (handle), the
  // completing action often happens *outside* this tab — clicking an email
  // verification link, or an admin approving a handle review. Poll the user
  // record every 10s so those steps flip to complete without a manual refresh.
  // Gated on tab visibility: we only fetch when this tab is actually focused,
  // never for a backgrounded tab.
  const onEarlyStep =
    !!user && !(!!user.email_verified_at && (user.has_verified_handle ?? false));
  useEffect(() => {
    if (!onEarlyStep) return;
    const poll = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, [onEarlyStep, refreshUser]);

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
              support, and organic veggies for the council members that moderate everything.
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
