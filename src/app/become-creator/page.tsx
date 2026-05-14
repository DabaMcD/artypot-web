'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ── Creator TOS text ─────────────────────────────────────────────────────────
// Authoritative source: artypot-api/storage/legal/creator-tos.md
// DRAFT — pending legal review.

const CREATOR_TOS = `DRAFT — pending legal review.

ARTYPOT CREATOR TERMS OF SERVICE

These Creator Terms of Service ("Creator Terms") govern your participation as a creator on the Artypot platform. By enabling creator mode you form a binding agreement with Artypot LLC, a Florida limited liability company.

1. CREATOR'S COMMITMENTS

1.1 Deliver commissioned work. When a bounty pot reaches completion and is approved by the Artypot Council, you commit to delivering the work described in good faith within a reasonable timeframe.

1.2 Maintain accurate handle information. The social handles and websites you verify through Artypot must genuinely represent your identity. You must not impersonate another person or misrepresent your affiliation with any platform account.

1.3 Provide accurate tax information when requested. When your cumulative annual payouts reach IRS reporting thresholds (or equivalent local thresholds), you agree to provide a W-9 (US persons) or W-8BEN (non-US persons) upon request. Failure to provide required tax documentation will result in a hard block on payouts.

1.4 Keep your location of residence current. You must maintain an accurate country (and US state/territory if applicable) in your profile for earnings reporting and tax compliance.

1.5 Comply with all applicable laws. You are solely responsible for complying with all laws applicable to your activities on Artypot.

2. ARTYPOT'S ROLE

2.1 Platform, not employer. Artypot is a platform that facilitates fan-funded commissions. Artypot is not your employer, client, agent, or partner. You are an independent creator.

2.2 Payment intermediary. Artypot collects fan pledges, holds them per its billing and refund policies, and disburses net proceeds to creators after platform fees.

2.3 No guarantee of earnings. Artypot does not guarantee that any pot will reach its threshold, that fans will fulfill pledges, or that any particular level of earnings will result.

2.4 Council review. Bounty completion submissions are reviewed by the Artypot Council. Council decisions are final subject to the appeal process in the General Terms.

3. PAYOUTS AND FEES

3.1 Payout eligibility. To receive a payout you must have: (a) a verified location on file; (b) a connected Stripe bank account; and (c) required tax documentation (W-9 or W-8BEN).

3.2 Minimum payout threshold. Payouts are subject to a minimum balance (currently $10.00 USD). Balances below this threshold accumulate until the threshold is met.

3.3 Platform fee. Artypot deducts a platform fee from each payout as specified in your creator dashboard. Fees are subject to change with 30 days' notice.

3.4 Hold period. Funds are subject to a 7-day hold before becoming available for withdrawal.

4. REFUNDS AND REVOCATIONS

4.1 Fan revocations. Fans may revoke open pledges at any time before a pot is marked complete. You are not entitled to compensation for revoked pledges.

4.2 Council rejection. If the Council rejects a submission, no funds are collected. You may resubmit after addressing the Council's feedback.

4.3 Post-collection disputes. Artypot reserves the right to claw back disbursed funds in cases of verified fraud or material misrepresentation.

5. CONTENT RULES

5.1 No IP infringement. You must not submit work that infringes the copyrights, trademarks, or other intellectual property rights of any third party.

5.2 No prohibited content. You must not submit content that is illegal, depicts minors sexually, constitutes harassment or hate speech, contains malware, or violates Artypot's Community Guidelines.

5.3 Your rights. You retain all ownership rights in your creative work. Nothing in these terms transfers copyright to Artypot or to any fan.

6. TERMINATION

6.1 Artypot may suspend or terminate your creator status if you breach these terms, engage in fraud, fail to deliver work after funds are collected, or violate applicable law.

6.2 Upon termination, open pots are closed, pledges are returned to fans, and any available creator balance will be disbursed to you subject to outstanding disputes and tax documentation requirements.

7. GOVERNING LAW

These Creator Terms are governed by the laws of the State of Florida. Disputes shall be resolved by binding arbitration in Miami-Dade County, Florida under AAA rules. You waive your right to participate in a class action.

Artypot LLC · Florida, USA · legal@artypot.com`;

// ── TOS + activation form ─────────────────────────────────────────────────────

function TosGate({ onActivated }: { onActivated: () => void }) {
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setSubmitting(true);
    try {
      await authApi.becomeCreator();
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
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* Scrollable TOS */}
      <div className="border border-border rounded-md bg-surface-2 h-48 overflow-y-auto p-4">
        <pre className="font-mono text-[10px] leading-relaxed text-muted whitespace-pre-wrap break-words">
          {CREATOR_TOS}
        </pre>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 flex-shrink-0 w-4 h-4 accent-[var(--color-role)] cursor-pointer"
        />
        <span className="font-display text-sm text-foreground leading-snug">
          I have read and agree to the Artypot Creator Terms of Service
        </span>
      </label>

      <Button type="submit" variant="primary" disabled={!agreed || submitting} className="w-full">
        {submitting ? 'activating…' : 'enable creator mode →'}
      </Button>
    </form>
  );
}

// ── Gate row ──────────────────────────────────────────────────────────────────

type GateStatus = 'complete' | 'active' | 'locked';

function GateRow({
  step,
  title,
  description,
  status,
  actionSlot,
  children,
}: {
  step: number;
  title: string;
  description: string;
  status: GateStatus;
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
            <h3 className="font-display font-bold text-foreground">{title}</h3>
            {status === 'complete' && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-good">complete</span>
            )}
            {status === 'locked' && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                complete steps 1 and 2 to unlock
              </span>
            )}
          </div>
          <p className="font-display text-sm text-muted mt-0.5">{description}</p>
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

  const handleActivated = useCallback(async () => {
    await refreshUser();
    router.push('/sanctum');
  }, [refreshUser, router]);

  if (authLoading) return null;

  if (!user) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

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
            <h2 className="font-display font-bold text-lg text-good">you&apos;re already a creator</h2>
          </div>
          <p className="font-display text-sm text-muted mb-4">
            your creator account is active. head to your sanctum to manage bounties, track earnings, and more.
          </p>
          <Link href="/sanctum">
            <Button variant="primary">go to sanctum →</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const gate1Complete = user.location_complete ?? false;
  const gate2Complete = user.has_verified_handle ?? false;
  const gate3Unlocked = gate1Complete && gate2Complete;

  return (
    <div className="space-y-7 pt-2 max-w-[600px]">
      <div>
        <SectionLabel>fan</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">become a creator</h1>
        <p className="font-display text-sm text-muted mt-1">
          unlock the creator view to accept bounties and get paid for your work.
        </p>
      </div>

      <div className="space-y-3">
        {/* Gate 1 — location */}
        <GateRow
          step={1}
          title="add your location of residence"
          description="we use this to know where to report your earnings later"
          status={gate1Complete ? 'complete' : 'active'}
          actionSlot={
            gate1Complete
              ? <Link href="/settings#location"><Button variant="ghost" size="sm">edit</Button></Link>
              : <Link href="/settings#location"><Button variant="default" size="sm">add location →</Button></Link>
          }
        />

        {/* Gate 2 — verified handle */}
        <GateRow
          step={2}
          title="verify a handle"
          description="link a social account so fans know you're the real deal"
          status={gate2Complete ? 'complete' : 'active'}
          actionSlot={
            !gate2Complete && (
              <Link href="/settings#handles"><Button variant="default" size="sm">verify a handle →</Button></Link>
            )
          }
        />

        {/* Gate 3 — TOS */}
        <GateRow
          step={3}
          title="agree to the creator terms of service"
          description="read and accept the creator terms to activate your account"
          status={!gate3Unlocked ? 'locked' : 'active'}
        >
          {gate3Unlocked && <TosGate onActivated={handleActivated} />}
        </GateRow>
      </div>

      <Link href="/dashboard">
        <Button variant="ghost" size="sm">← back to dashboard</Button>
      </Link>
    </div>
  );
}
