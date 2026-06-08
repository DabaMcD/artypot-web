import Link from 'next/link';
import CreatorTosTldr from '@/components/CreatorTosTldr';

export const metadata = {
  title: 'Creator Terms of Service — Artypot',
};

const LAST_UPDATED = 'May 20, 2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-10 border-t border-border">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-base text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function CreatorToSPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Legal · Creators</p>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">Creator Terms of Service</h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm text-muted mt-3">
            These Creator Terms supplement the{' '}
            <Link href="/tos" className="text-creator hover:underline">general Terms of Service</Link>{' '}
            and apply once you enable creator mode. Where the two conflict on creator-specific
            matters, these terms control.
          </p>
        </div>

        {/* TL;DR */}
        <CreatorTosTldr className="mb-12" />

        {/* ToC */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-12 text-sm">
          <p className="font-semibold text-foreground mb-3">Contents</p>
          <ol className="space-y-1.5 text-muted list-decimal list-inside">
            {[
              ['commitments', "Creator's Commitments"],
              ['role', "Artypot's Role"],
              ['payouts', 'Payouts and Fees'],
              ['refunds', 'Refunds and Revocations'],
              ['content', 'Content Rules'],
              ['termination', 'Termination'],
              ['disclaimer', 'Disclaimers and Limitation of Liability'],
              ['governing', 'Governing Law and Disputes'],
              ['misc', 'Miscellaneous'],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-foreground transition-colors">{label}</a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-0">

          <Section id="commitments" title="1. Creator's Commitments">
            <p>By enabling creator mode, you form a binding agreement with Artypot LLC, a Florida limited liability company, and agree to the following.</p>
            <p><strong className="text-foreground">1.1 Deliver commissioned work.</strong> You commit to producing the work described in a bounty in good faith and submitting it for review. Funds are only collected from fans <em>after</em> you submit your completed work and the Artypot Council confirms it satisfies the bounty — payment never precedes delivery. Submitting work you have not actually produced, do not own the rights to, or that does not fulfil the bounty may result in suspension or termination of your creator account.</p>
            <p><strong className="text-foreground">1.2 Maintain accurate handle information.</strong> The social handles and websites you verify through Artypot must genuinely represent your identity as a creator. You must not impersonate another person or entity or misrepresent your affiliation with any platform account.</p>
            <p><strong className="text-foreground">1.3 Provide accurate tax information when requested.</strong> When your cumulative annual payouts reach IRS reporting thresholds (or equivalent thresholds under applicable local law), you agree to provide a completed W-9 (for U.S. persons) or W-8BEN (for non-U.S. persons) upon request. Failure to provide required tax documentation will result in a hard block on payouts until documentation is provided.</p>
            <p><strong className="text-foreground">1.4 Keep your tax residence current.</strong> You must maintain an accurate country of tax residence (and U.S. state or territory, if applicable) in your creator profile. This information is used solely for earnings reporting and tax compliance purposes.</p>
            <p><strong className="text-foreground">1.5 Comply with all applicable laws.</strong> You are solely responsible for complying with all laws applicable to your activities on Artypot, including tax obligations, export controls, and local content regulations.</p>
            <p><strong className="text-foreground">1.6 Bounties fund public work, not private perks.</strong> A backing is a contribution toward a public deliverable — it is not a purchase, and it does not entitle the backer to anything the general public does not also receive. You must not offer, promise, or provide any private, personal, or backer-exclusive benefit in exchange for a backing or in recognition of its size, including (without limitation) private access, one-on-one time, physical goods, personalized or backer-owned work, travel, in-person meetings, early or exclusive access, or any preferential treatment. The work you deliver for a bounty must be a single public result, equally accessible to backers and non-backers alike. The only recognition you may give backers is public acknowledgment, such as a public thank-you or their name in public credits. Auctioning or selling personal access or private benefits — for example, offering an experience to the highest backer — is prohibited, and converts a non-sale contribution into a transaction our platform and payment partners do not support.</p>
          </Section>

          <Section id="role" title="2. Artypot's Role">
            <p><strong className="text-foreground">2.1 Platform, not employer.</strong> Artypot is a platform that facilitates fan-funded commissions. Artypot is not your employer, client, agent, or partner. You are an independent creator. Nothing in these terms creates an employment, agency, joint venture, or partnership relationship between you and Artypot.</p>
            <p><strong className="text-foreground">2.2 Payment intermediary.</strong> Artypot acts as a payment intermediary between fans and creators. Artypot collects fan backings, holds them in accordance with its billing and refund policies, and disburses net proceeds to creators after any applicable platform fees and processing costs.</p>
            <p><strong className="text-foreground">2.3 No guarantee of earnings.</strong> Artypot does not guarantee that any bounty will reach any amount, that fans will fulfill their backings, or that any particular level of earnings will result from your participation.</p>
            <p><strong className="text-foreground">2.4 Council review.</strong> Bounty completion submissions are reviewed by the Artypot Council, an independent body of verified users. Council decisions regarding approval or rejection of completions are final. There is no formal appeals process, though you may contact us to raise concerns about a decision.</p>
          </Section>

          <Section id="payouts" title="3. Payouts and Fees">
            <p><strong className="text-foreground">3.1 Payout eligibility.</strong> To receive a payout you must: (a) have a verified country of tax residence on file; (b) have a connected payout account (via Stripe Connect where available, or another approved payout method); and (c) have provided required tax documentation (a W-9 for U.S. persons, or a W-8BEN for non-U.S. persons) as applicable.</p>
            <p><strong className="text-foreground">3.2 Minimum payout threshold.</strong> Payouts are subject to a minimum balance threshold that depends on your country and payout method, as published on the Artypot website and shown in your creator dashboard from time to time. Balances below the applicable threshold will accumulate until the threshold is met.</p>
            <p><strong className="text-foreground">3.3 Platform fee.</strong> Artypot deducts a platform fee from each payout, as specified in your creator dashboard and on the Artypot pricing page. Fees are subject to change with 30 days&apos; notice to active creators.</p>
            <p><strong className="text-foreground">3.4 Hold period.</strong> Funds collected from fans are subject to a hold period (currently 7 days) before becoming available for withdrawal. This period exists to allow for fraud review and fan dispute resolution.</p>
            <p><strong className="text-foreground">3.5 Currency.</strong> All transactions are denominated in U.S. dollars unless otherwise stated. You are responsible for any currency conversion costs incurred by you or your bank.</p>
          </Section>

          <Section id="refunds" title="4. Refunds and Revocations">
            <p><strong className="text-foreground">4.1 Fan revocations.</strong> Fans may revoke open backings at any time before a bounty is marked complete. Revoked backings are returned to the fan in full; you are not entitled to compensation for revoked backings.</p>
            <p><strong className="text-foreground">4.2 Council rejection.</strong> If the Council rejects a completion submission, no funds are collected from fans. You may resubmit after addressing the Council&apos;s feedback.</p>
            <p><strong className="text-foreground">4.3 Post-collection disputes and chargebacks.</strong> After funds are collected (following a Council-approved completion), refund requests are handled per the Artypot General Refund Policy. If a fan&apos;s bank reverses a charge (a chargeback) while the corresponding funds are still within the clearing hold period, the disputed amount will be deducted from your creator balance. Artypot also reserves the right to claw back disbursed funds in cases of verified fraud or material misrepresentation.</p>
            <p><strong className="text-foreground">4.4 Completed charges are final.</strong> Once The Council confirms a completion and fans are charged, those charges are final and non-refundable to the fan. The only exceptions are the limited post-collection cases described in 4.3 (a chargeback within the clearing hold period, or a clawback for verified fraud or material misrepresentation).</p>
          </Section>

          <Section id="content" title="5. Content Rules">
            <p><strong className="text-foreground">5.1 No intellectual property infringement.</strong> You must not submit, represent, or claim as your own any work that infringes the copyrights, trademarks, trade secrets, or other intellectual property rights of any third party.</p>
            <p><strong className="text-foreground">5.2 The Artypot surface is all-ages.</strong> Everything you publish or submit to Artypot itself — bounty descriptions and titles, your profile, display name, verified handles, comments, and the notes or links you attach to a completion — must be suitable for a general audience. This material is hosted and publicly displayed by Artypot, so it may not contain sexually explicit material, pornography, nudity, or gratuitous shock content. This is a rule about the on-platform surface; it is not a judgment about the legitimate creative work you produce and host elsewhere.</p>
            <p><strong className="text-foreground">5.3 No adult-content commerce.</strong> You may not use Artypot to solicit, coordinate, or collect payment for sexually explicit or pornographic work, whether or not the work itself is delivered off-platform. Artypot is the merchant of record for every bounty charge, and our payment partners (including the card networks and Stripe) prohibit processing payments for adult content. A bounty whose purpose is to fund adult content is therefore not permitted, regardless of where the finished work is hosted.</p>
            <p><strong className="text-foreground">5.4 Illegal and harmful content.</strong> You must never submit, facilitate, represent as a completion, or use a bounty to fund any content that: (a) is illegal under applicable law; (b) constitutes harassment, a credible threat, or targeted hate speech; or (c) contains malware or malicious code. This prohibition is absolute and applies to both on-platform material and any work delivered off-platform in fulfilment of a bounty.</p>
            <p><strong className="text-foreground">5.5 Your license to Artypot.</strong> For the material you publish or submit to Artypot itself (such as completion notes, links, and profile content), you grant Artypot a limited, non-exclusive, royalty-free license to display, reproduce, and promote that material solely for the purpose of operating and marketing the Artypot platform.</p>
            <p><strong className="text-foreground">5.6 Your rights.</strong> You retain all ownership rights in your creative work. Nothing in these terms transfers copyright or other intellectual property rights to Artypot or to any fan.</p>
          </Section>

          <Section id="termination" title="6. Termination">
            <p><strong className="text-foreground">6.1 By you.</strong> You may disable creator mode at any time from your account settings, subject to any outstanding obligations (open bounties, pending payouts, or active disputes).</p>
            <p><strong className="text-foreground">6.2 By Artypot.</strong> Artypot may suspend or terminate your creator status immediately if you: (a) breach these Creator Terms or the General Terms of Service; (b) engage in fraudulent or deceptive conduct; (c) fail to deliver work after funds are collected, repeatedly; (d) violate any applicable law; or (e) pose a risk to Artypot or its users.</p>
            <p><strong className="text-foreground">6.3 Effect of termination.</strong> Upon termination: existing open bounties are closed and their backings are cancelled (no charges are made, since backings on open bounties are never charged); any available creator balance will be disbursed to you (subject to tax documentation requirements and any outstanding disputes) within a reasonable period.</p>
          </Section>

          <Section id="disclaimer" title="7. Disclaimers and Limitation of Liability">
            <p><strong className="text-foreground">7.1</strong> Artypot provides its platform &quot;as is&quot; and makes no warranties, express or implied, regarding availability, fitness for a particular purpose, or uninterrupted operation.</p>
            <p><strong className="text-foreground">7.2</strong> To the maximum extent permitted by law, Artypot&apos;s total liability to you arising out of or related to these Creator Terms shall not exceed the total platform fees paid by you (or collected on your behalf) in the twelve months preceding the claim.</p>
            <p><strong className="text-foreground">7.3</strong> Artypot is not liable for any indirect, incidental, consequential, or punitive damages, even if advised of the possibility of such damages.</p>
          </Section>

          <Section id="governing" title="8. Governing Law and Disputes">
            <p><strong className="text-foreground">8.1</strong> These Creator Terms are governed by the laws of the State of Florida, without regard to conflict-of-law principles.</p>
            <p><strong className="text-foreground">8.2</strong> Any dispute arising out of or related to these Creator Terms shall be resolved by binding arbitration administered in Hillsborough County, Florida, under the rules of the American Arbitration Association (AAA), except that either party may seek injunctive or other equitable relief in a court of competent jurisdiction in Florida.</p>
            <p><strong className="text-foreground">8.3</strong> You waive your right to participate in a class action or class-wide arbitration.</p>
          </Section>

          <Section id="misc" title="9. Miscellaneous">
            <p><strong className="text-foreground">9.1 Amendments.</strong> Artypot may update these Creator Terms at any time. Material changes will be communicated to you via the email address on your account or via an in-app notice at least 30 days before taking effect.</p>
            <p><strong className="text-foreground">9.2 Severability.</strong> If any provision of these Creator Terms is found to be unenforceable, the remaining provisions continue in full force.</p>
            <p><strong className="text-foreground">9.3 Entire Agreement.</strong> These Creator Terms, together with the Artypot{' '}
              <Link href="/tos" className="text-creator hover:underline">General Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-creator hover:underline">Privacy Policy</Link>, constitute the entire agreement between you and Artypot with respect to your role as a creator.</p>
            <p className="pt-4">
              Questions about these terms? Email{' '}
              <a href="mailto:legal@artypot.com" className="text-creator hover:underline">legal@artypot.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
