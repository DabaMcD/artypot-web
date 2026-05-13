'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Timeline } from '@/components/ui/Timeline';

export default function BecomeCreatorPage() {
  const router = useRouter();

  return (
    <div className="space-y-7 pt-2 max-w-[600px]">
      <div>
        <SectionLabel>fan</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">become a creator</h1>
        <p className="font-display text-sm text-muted mt-1">unlock the creator view to accept bounties and get paid for your work.</p>
      </div>

      <Card>
        <SectionLabel className="mb-4">how it works</SectionLabel>
        <Timeline
          items={[
            { when: 'step 1', what: 'verify a handle — link your social account or website so fans know you\'re the real deal', done: false },
            { when: 'step 2', what: 'agree to the creator terms of service', done: false },
            { when: 'step 3', what: 'complete your tax form (W-9 for US, W-8BEN for international)', done: false },
            { when: 'step 4', what: 'connect a bank account via stripe for direct payouts', done: false },
          ]}
        />
      </Card>

      <Card dashed>
        <SectionLabel className="mb-3">ready?</SectionLabel>
        <p className="font-display text-sm text-muted mb-4 leading-relaxed">
          to start the creator onboarding process, go to your sanctum and complete the setup gates. you&apos;ll need to verify at least one handle to unlock creator mode.
        </p>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => router.push('/sanctum/setup')}>go to creator setup →</Button>
          <Link href="/dashboard"><Button variant="ghost">back to dashboard</Button></Link>
        </div>
      </Card>
    </div>
  );
}
