'use client';

import Link from 'next/link';
import { SectionLabel } from '@/components/ui/Card';
import HandlesSection from '@/components/HandlesSection';

export default function CreatorHandlesPage() {
  return (
    <div className="space-y-7 pt-2 max-w-[680px]">
      <div>
        <SectionLabel>creator · admin</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">handles</h1>
        <p className="text-sm text-muted mt-1">
          Connect and verify your social accounts so fans can find you and direct bounties your way.
        </p>
      </div>

      <HandlesSection />

      <p className="text-xs font-mono text-muted">
        <Link href="/creator/settings" className="hover:text-foreground transition-colors">← back to creator settings</Link>
      </p>
    </div>
  );
}
