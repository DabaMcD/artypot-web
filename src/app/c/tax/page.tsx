'use client';

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { countryName } from '@/lib/countries';
import { Card, SectionLabel } from '@/components/ui/Card';
import TaxComplianceCard from '@/components/creator/TaxComplianceCard';

function TaxContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !user.creator) router.push('/dashboard');
  }, [loading, user, router]);

  if (loading || !user || !user.creator) return null;

  const isUS = user.country_code === 'US';
  const residence = user.location_complete
    ? (isUS ? `${user.state_code}, US` : countryName(user.country_code ?? ''))
    : null;

  return (
    <div className="space-y-7 pt-2">
      <div>
        <SectionLabel>creator · money</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">tax &amp; compliance</h1>
        <p className="text-sm text-muted mt-1">
          Your tax forms and reporting status. Artypot uses TaxBandits for secure
          submission — we never see your SSN or personal tax details.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT — the form */}
        <div className="space-y-6">
          <TaxComplianceCard returnPath="/c/tax" />
        </div>

        {/* RIGHT — residence + future documents */}
        <div className="space-y-4">
          <Card>
            <SectionLabel className="mb-3">tax residence</SectionLabel>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">declared</span>
              <span className={residence ? 'text-foreground' : 'text-warn'}>
                {residence ?? 'not set'}
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-3">
              Determines whether a W-9 (US) or W-8BEN (international) applies, and how
              your earnings are reported. Changes are logged for compliance.
            </p>
            <div className="border-t border-border mt-3 pt-3">
              <Link href="/c/settings#location" className="ap-inline-link text-xs">Update tax residence →</Link>
            </div>
          </Card>

          <Card dashed>
            <SectionLabel className="mb-2">tax documents</SectionLabel>
            <p className="text-xs text-muted leading-relaxed">
              Your annual tax forms — {isUS ? '1099-NEC' : '1042-S'} — will appear here
              once the tax year closes and your earnings reach the reporting threshold.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TaxPage() {
  return (
    <Suspense>
      <TaxContent />
    </Suspense>
  );
}
