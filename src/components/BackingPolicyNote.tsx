/**
 * Refund/cancellation policy disclosure shown at the point of backing.
 * Card-network rules require the policy to be disclosed conspicuously before
 * a charge is committed to, and the (conditional) withdrawal-consent sentence
 * makes the Article 16(a) acknowledgment claimed in the ToS and backing emails
 * something the fan actually saw when they clicked. The sentence is phrased
 * conditionally ("to the extent this backing constitutes a contract for
 * services…") so that disclosing the services-withdrawal waiver does not itself
 * concede that a backing is a sale rather than a non-sale contribution.
 * Rendered beneath every backing submit action: the bounty page form, the
 * BountyCard quick-back confirm step, and the new-bounty opening commitment.
 */
import { useTranslations } from 'next-intl';

export default function BackingPolicyNote({ className = '' }: { className?: string }) {
  const t = useTranslations('BackingPolicyNote');
  return (
    <p className={`text-[10px] leading-snug text-muted/70 ${className}`}>
      {t('text')}
    </p>
  );
}
