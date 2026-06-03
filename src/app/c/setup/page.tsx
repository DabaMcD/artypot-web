'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { GateCard } from '@/components/ui/GateCard';
import { Button } from '@/components/ui/Button';
import { PLATFORM_FEE_PCT } from '@/lib/config';
import Link from 'next/link';

export default function CreatorSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  const creator = user.creator;

  return (
    <div className="space-y-7 pt-2 max-w-[640px]">
      <div>
        <SectionLabel>creator · setup</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">creator gates</h1>
        <p className="text-sm text-muted mt-1">Complete all three gates to unlock withdrawals.</p>
      </div>

      <div className="space-y-3">
        <GateCard
          gate={{
            label: 'Handle Verification',
            detail: 'Verify at least one social handle or website to prove you\'re the real deal.',
            // Authoritative signal: the user has at least one *verified* handle
            // claim. The denormalized creator.*_handle fields aren't returned by
            // /me, and a handle merely being set isn't the same as verified.
            status: user.has_verified_handle ? 'done' : 'todo',
          }}
          action={<Link href="/c/handles"><Button variant="default" size="sm">Manage Handles →</Button></Link>}
        />
        <GateCard
          gate={{
            label: 'Creator Terms of Service',
            detail: 'Agree to the Artypot creator terms to accept bounties.',
            status: creator ? 'done' : 'todo',
          }}
          action={<Button variant="default" size="sm">View Terms →</Button>}
        />
        <GateCard
          gate={{
            label: 'Bank Account',
            detail: `Connect a Stripe-verified bank account for direct payouts. You keep ${100 - PLATFORM_FEE_PCT}% of each bounty — Artypot's ${PLATFORM_FEE_PCT}% fee is deducted only from completed payouts.`,
            status: creator?.bank_connected ? 'done' : 'todo',
          }}
          action={<Link href="/c"><Button variant="default" size="sm">Connect Bank →</Button></Link>}
        />
      </div>

      <Card dashed>
        <p className="text-sm text-muted">
          Gate 3 is handled from your{' '}
          <Link href="/c" className="ap-inline-link">main dashboard</Link>.
        </p>
      </Card>

      <Card dashed>
        <SectionLabel className="mb-2">tax forms — later</SectionLabel>
        <p className="text-sm text-muted leading-relaxed">
          Tax forms aren&apos;t a setup gate. You can take your first payout without one.
          We&apos;ll only ask for a W-9 (US) or W-8BEN (international) once your annual
          payouts approach the IRS reporting threshold — and we&apos;ll prompt you from
          your{' '}
          <Link href="/c#tax" className="ap-inline-link">dashboard</Link>{' '}
          when that time comes.
        </p>
      </Card>
    </div>
  );
}
