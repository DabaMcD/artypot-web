'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { SectionLabel } from '@/components/ui/Card';
import HandlesSection from '@/components/HandlesSection';

export default function CreatorHandlesPage() {
  const t = useTranslations('CreatorHandles');
  return (
    <div className="space-y-7 pt-2 max-w-[680px]">
      <div>
        <SectionLabel>creator · account</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('heading')}</h1>
        <p className="text-sm text-muted mt-1">
          {t('description')}
        </p>
      </div>

      <HandlesSection />

      <p className="text-xs font-mono text-muted">
        <Link href="/c/settings" className="hover:text-foreground transition-colors">{t('backLink')}</Link>
      </p>
    </div>
  );
}
