/**
 * The positive half of the backing-point messaging (BackingPolicyNote is the
 * legal fine print): pay-on-verified-completion with no escrow is Artypot's
 * structural advantage over pledge-upfront crowdfunding, so it's stated
 * plainly wherever a fan commits money.
 */
export default function PayOnVerifiedNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-xs text-good ${className}`}>
      <span aria-hidden className="mt-px shrink-0">✓</span>
      <span>
        You only pay if the work gets made — nothing is charged until the
        completed work is verified.
      </span>
    </p>
  );
}
