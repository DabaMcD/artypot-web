'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { GateCard } from '@/components/ui/GateCard';
import { Button } from '@/components/ui/Button';
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
        <p className="text-sm text-muted mt-1">Complete all four gates to unlock withdrawals.</p>
      </div>

      <div className="space-y-3">
        <GateCard
          gate={{
            label: 'Handle Verification',
            detail: 'Verify at least one social handle or website to prove you\'re the real deal.',
            status: creator && (creator.youtube_handle || creator.twitter_handle || creator.tiktok_handle || creator.instagram_handle || creator.soundcloud_url || creator.bandcamp_url || creator.domain) ? 'done' : 'todo',
          }}
          action={<Link href="/settings#handles"><Button variant="default" size="sm">Manage Handles →</Button></Link>}
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
            label: 'Tax Compliance',
            detail: 'Submit your W-9 (US) or W-8BEN (international) once your annual payouts reach the threshold.',
            status: 'todo',
          }}
          action={<Link href="/creator"><Button variant="default" size="sm">Go to Dashboard →</Button></Link>}
        />
        <GateCard
          gate={{
            label: 'Bank Account',
            detail: 'Connect a Stripe-verified bank account for direct payouts.',
            status: creator?.bank_connected ? 'done' : 'todo',
          }}
          action={<Link href="/creator"><Button variant="default" size="sm">Connect Bank →</Button></Link>}
        />
      </div>

      <Card dashed>
        <p className="text-sm text-muted">
          Gates 3 and 4 are handled from your{' '}
          <Link href="/creator" className="ap-inline-link">main dashboard</Link>.
        </p>
      </Card>
    </div>
  );
}
