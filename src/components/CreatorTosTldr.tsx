import { useTranslations } from 'next-intl';
import { PLATFORM_FEE_PCT } from '@/lib/config';

const CREATOR_KEEP_PCT = 100 - PLATFORM_FEE_PCT;

/**
 * Plain-English summary of the Creator Terms of Service. Shared between the
 * standalone /creator-tos page and the /become-creator activation flow so the
 * headline economics (platform fee, payout requirements, content rules) are
 * stated identically in both places.
 *
 * Deliberately creator-teal regardless of the viewer's active role — a fan on
 * /become-creator still gets the creator-flavored summary.
 */
export default function CreatorTosTldr({
  className = '',
  footnote,
}: {
  className?: string;
  footnote?: string;
}) {
  const t = useTranslations('CreatorTosTldr');
  return (
    <div className={`bg-creator/5 border border-creator/30 rounded-xl p-6 ${className}`}>
      <p className="text-xs font-mono text-creator uppercase tracking-wider mb-3 font-semibold">
        {t('eyebrow')}
      </p>
      <ul className="space-y-2 text-sm text-foreground">
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('keep.title', { keepPct: CREATOR_KEEP_PCT })}</strong>{' '}
            {t('keep.body', { feePct: PLATFORM_FEE_PCT })}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('paidAfter.title')}</strong>{' '}{t('paidAfter.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('chargesFinal.title')}</strong>{' '}{t('chargesFinal.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('refundBounty.title')}</strong>{' '}{t('refundBounty.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('publicWork.title')}</strong>{' '}{t('publicWork.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✗</span>
          <span>
            <strong>{t('noOfficialActs.title')}</strong>{' '}{t('noOfficialActs.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✗</span>
          <span>
            <strong>{t('realPeople.title')}</strong>{' '}{t('realPeople.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('goodFaith.title')}</strong>{' '}{t('goodFaith.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('belowTheLaw.title')}</strong>{' '}{t('belowTheLaw.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('fundsClear.title')}</strong>{' '}{t('fundsClear.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('copyright.title')}</strong>{' '}{t('copyright.body')}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>{t('familyFriendly.title')}</strong>{' '}{t('familyFriendly.body')}
          </span>
        </li>
      </ul>
      <p className="text-xs text-muted mt-4">{footnote ?? t('footnote')}</p>
    </div>
  );
}
