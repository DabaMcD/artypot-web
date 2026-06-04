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
  footnote = 'This TL;DR is a helpful summary, not a substitute for the full terms below.',
}: {
  className?: string;
  footnote?: string;
}) {
  return (
    <div className={`bg-creator/5 border border-creator/30 rounded-xl p-6 ${className}`}>
      <p className="text-xs font-mono text-creator uppercase tracking-wider mb-3 font-semibold">
        TL;DR — plain English
      </p>
      <ul className="space-y-2 text-sm text-foreground">
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>You keep {CREATOR_KEEP_PCT}% of fan payments.</strong>{' '}Artypot deducts a{' '}
            {PLATFORM_FEE_PCT}% platform fee which covers card
            processing, fraud protection, hosting, support, and organic veggies for the council
            members that moderate everything. No signup fee, no monthly fee.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>You&apos;re paid AFTER you deliver.</strong>{' '}Fans are never charged until
            you submit your completion and the Council confirms it satisfies the bounty.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>Bounties fund public work, not private perks.</strong>{' '}Your deliverable
            goes out to everyone equally. You can&apos;t trade backings for private access,
            physical goods, meetups, or rewards — a public thank-you is the only perk allowed.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>Act in good faith.</strong>{' '}Misleading comments, disingenuous
            submissions, identity deception, and other bad-faith behavior is not tolerated.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>Artypot is below the law.</strong>{' '}We have to collect tax info. Many
            countries don't support automated payment processing and have a higher minimum payout
            threshold. There are some countries we can&apos;t operate in at all.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>Funds clear after 7 days.</strong>{' '}Collected funds are held 7 days
            (for fraud and dispute review) before becoming withdrawable, subject to a minimum
            payout balance.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>You keep your copyright.</strong>{' '}Nothing here transfers ownership of your
            work to Artypot or to any fan. You grant only a limited license to display and
            promote completions on the platform.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-creator shrink-0 mt-0.5">✓</span>
          <span>
            <strong>Artypot is family friendly.</strong>{' '}Your bounty text, profile,
            handles, and completion notes are public and must be PG. You also can&apos;t use a
            bounty to fund adult content (our payment partners forbid it). Nothing illegal, and
            nothing that sexualizes or exploits minors — ever. What you make and host elsewhere
            is your business.
          </span>
        </li>
      </ul>
      <p className="text-xs text-muted mt-4">{footnote}</p>
    </div>
  );
}
