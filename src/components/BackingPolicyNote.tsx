/**
 * Refund/cancellation policy disclosure shown at the point of backing.
 * Card-network rules require the policy to be disclosed conspicuously before
 * a charge is committed to, and the EU/UK withdrawal-consent sentence makes
 * the Article 16(a) acknowledgment claimed in the ToS and backing emails
 * something the fan actually saw when they clicked. Rendered beneath every
 * backing submit action: the bounty page form, the BountyCard quick-back
 * confirm step, and the new-bounty opening commitment.
 */
export default function BackingPolicyNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[10px] leading-snug text-muted/70 ${className}`}>
      Free to cancel anytime before the bounty completes. Once completed, your
      backing is locked, charged on the next billing day, and final — refunds
      after a charge are discretionary (hardship or verified fraud only). By
      backing, you agree performance may begin immediately; EU/UK 14-day
      withdrawal rights end when the bounty completes.
    </p>
  );
}
