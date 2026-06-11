import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Artypot',
};

const LAST_UPDATED = 'June 11, 2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-10 border-t border-border">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-base text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function ToSPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* TL;DR */}
        <div className="bg-fan/5 border border-fan/30 rounded-xl p-6 mb-12">
          <p className="text-xs font-mono text-fan uppercase tracking-wider mb-3 font-semibold">TL;DR — plain English</p>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>No money moves when you back a bounty</strong> — not even a hold. Your card is only charged after The Council confirms a bounty complete, and charges are collected together in a monthly billing run.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>You can back out any time</strong> before a bounty completes, for free. No questions asked.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>But once it completes, the charge is final.</strong> After The Council confirms a bounty and you&apos;re charged, that payment is final and non-refundable — your window to back out is before completion, not after.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>Artypot takes a 20% platform fee</strong>, deducted from the creator&apos;s payout. This fee covers all transaction costs including payment processing — backers are charged their committed amount in full, creators receive 80%.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>Creators around the world can get paid</strong> — via direct bank payouts where supported, and alternative methods elsewhere. Fans anywhere can back bounties. A few countries are restricted by law.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>If a bounty never completes, no money moves.</strong> Ever.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>Backing isn&apos;t a purchase.</strong> You&apos;re funding a public result everyone gets equally — not buying private perks, goods, or access. Creators can&apos;t auction personal rewards to top backers, and you shouldn&apos;t ask them to.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✗</span><span><strong>No buying official acts or funding campaigns.</strong> You can&apos;t use a bounty to pay a government official for something they do in office, or to bankroll a candidate, campaign, or election effort — that runs into bribery and campaign-finance law.</span></li>
            <li className="flex gap-2"><span className="text-fan shrink-0 mt-0.5">✓</span><span><strong>Keep Artypot all-ages.</strong> Everything posted to the Platform — bounty text, profiles, comments, completion notes — must be PG, and you can&apos;t use a bounty to fund adult content (our payment partners forbid it). Nothing illegal, ever. What a creator makes and hosts elsewhere is their own business.</span></li>
          </ul>
          <p className="text-xs text-muted mt-4">This TL;DR is a helpful summary, not a substitute for the full terms below.</p>
        </div>

        {/* ToC */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-12 text-sm">
          <p className="font-semibold text-foreground mb-3">Contents</p>
          <ol className="space-y-1.5 text-muted list-decimal list-inside">
            {[
              ['acceptance', 'Acceptance of Terms'],
              ['description', 'What Artypot Is'],
              ['accounts', 'Accounts'],
              ['bounties', 'Bounties'],
              ['backing', 'Backing and Payments'],
              ['creators', 'Creator Obligations'],
              ['council', 'The Council'],
              ['fees', 'Fees'],
              ['content', 'Content Policy'],
              ['ip', 'Intellectual Property'],
              ['termination', 'Termination'],
              ['disclaimer', 'Disclaimers'],
              ['liability', 'Limitation of Liability'],
              ['governing', 'Governing Law'],
              ['changes', 'Changes to These Terms'],
              ['contact', 'Contact'],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-foreground transition-colors">{label}</a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-0">

          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>Artypot (&quot;the Platform,&quot; &quot;we,&quot; &quot;us&quot;) is operated by Artypot LLC, a Florida limited liability company. By accessing or using Artypot, you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
            <p>You must be at least 18 years old to create an account or back a bounty. By using the Platform, you represent that you meet this requirement.</p>
          </Section>

          <Section id="description" title="2. What Artypot Is">
            <p>Artypot is a bounty-style crowdfunding platform. Fans (&quot;backers&quot;) pool funding toward specific tasks from public entities (&quot;creators&quot;). Backing is a commitment of funds, but no money moves when you back a bounty. Charges only occur after The Council reviews and confirms a bounty as complete.</p>
            <p>Artypot is not a tip jar, subscription service, or pre-order platform. It is a mechanism for coordinating demand signals and releasing payment only on delivery.</p>
          </Section>

          <Section id="accounts" title="3. Accounts">
            <p>You are responsible for maintaining the security of your account and all activity that occurs under it. Do not share your login credentials.</p>
            <p>You agree to provide accurate, current, and complete information when registering. We reserve the right to suspend or terminate accounts with inaccurate or misleading information.</p>
            <p>One person, one account. Creating multiple accounts to circumvent restrictions is prohibited.</p>
          </Section>

          <Section id="bounties" title="4. Bounties">
            <p>Any registered user may open a bounty for any task a named creator could verifiably complete, subject to the Content Policy (Section 9). If it can be done, confirmed, and doesn&apos;t violate the Content Policy, it can be a bounty.</p>
            <p>Opening a bounty does not guarantee the named creator will fulfil it. The creator is under no contractual obligation to Artypot or to backers. A bounty is an expression of collective demand, not a contract with the creator.</p>
            <p><strong className="text-foreground">A bounty funds public work, not private perks.</strong> Backing is a contribution toward a result that is released publicly and equally to backers and non-backers alike. It is not a purchase of goods or services for the backer, and it confers no private benefit, ownership, exclusive access, or preferential treatment. Creators may not offer, and backers may not solicit or demand, any personal or backer-exclusive reward in exchange for a backing or its size — for example, private meetings, physical goods, personalized work, or an experience auctioned to the highest backer. Publicly acknowledging backers (such as a thank-you or a name in public credits) is the only recognition permitted.</p>
            <p><strong className="text-foreground">No bounties for official acts or political campaigns.</strong> A bounty may not reward, induce, or be conditioned on an <em>official act</em> — anything a government office holder or employee does, or could do, in their official capacity. Nor may a bounty serve as a contribution to or expenditure for a candidate, campaign, party, or committee, or otherwise aim to influence an election. Funding pointed at an official act or an election can create legal exposure for backers and for Artypot regardless of intent, so we don&apos;t allow it. This turns on the purpose of a bounty, not the identity of its subject: a public servant who is also a creator can still be the subject of a bounty for ordinary creative work. We may remove bounties that cross this line and take action on the accounts behind them.</p>
            <p>We reserve the right to remove any bounty at our sole discretion, including but not limited to bounties that are too vague, too difficult to verify completion, harmful, or illegal. We are not obligated to explain every removal, though we will attempt to provide a reason when possible.</p>
            <p>While we are committed to being reasonable, the creator a bounty is directed at may also remove that bounty at their sole discretion, for any reason or no reason.</p>
          </Section>

          <Section id="backing" title="5. Backing and Payments">
            <p><strong className="text-foreground">Backing vs. charge:</strong> When you back a bounty, no money moves and no authorization hold is placed on your card. Your card is only charged after The Council confirms a bounty is complete. Confirmed charges are collected together in a monthly billing run (on the 24th of each month), not instantly at the moment of approval.</p>
            <p><strong className="text-foreground">Backing out:</strong> You may back out at any time before a bounty is confirmed completed by Council, even during the &quot;pending review&quot; stage.</p>
            <p><strong className="text-foreground">Failed charges:</strong> If your card cannot be charged when payment is due (expired card, insufficient funds, etc.), the charge fails and you will be notified. You then have a short grace period to update your payment method. While a failed payment is unresolved you cannot back new bounties, and if it remains unresolved your affected backings will be cancelled.</p>
            <p><strong className="text-foreground">All completed charges are final and non-refundable:</strong> Once The Council confirms a bounty complete and your card is charged, that payment is <strong className="text-foreground">final and non-refundable</strong>. Your opportunity to change your mind is the window before completion — you may back out of any backing, for free, at any time before a bounty is confirmed complete, but not after the charge is made.</p>
            <p><strong className="text-foreground">Uncompleted bounties:</strong> If a bounty is closed or revoked before completion, no charges are made. Nothing was ever held against your card.</p>
            <p>Payments are processed by Stripe, Inc. By backing a bounty, you also agree to <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-fan hover:underline">Stripe&apos;s Terms of Service</a>.</p>
            <p>If a fan disputes a charge for your work, the disputed amount may be deducted from your earnings.</p>
          </Section>

          <Section id="creators" title="6. Creator Obligations">
            <p>Creators who claim their profile and accept a bounty agree to deliver the specific work described in the bounty in good faith, as understood by their community.</p>
            <p>Submission of a completion claim constitutes a representation that the submitted work satisfies the bounty description. Fraudulent submissions — submitting work that does not fulfil the bounty, or submitting work you do not own the rights to — may result in account termination and, where applicable, legal action.</p>
            <p>Creators receiving payouts must provide accurate payment and tax information. US-based creators complete a W-9; creators outside the US complete a W-8BEN. Payouts are available in most countries — via direct bank payout where supported and alternative methods elsewhere — but are unavailable in countries we are legally restricted from serving. Artypot issues 1099 or 1042-S forms where required by law.</p>
          </Section>

          <Section id="council" title="7. The Council">
            <p>The Council is a group of human reviewers appointed by Artypot. Their role is to verify that a submitted work actually fulfils the bounty before any funds are collected.</p>
            <p>The Council&apos;s decisions are final. There is no formal appeals process, though you may contact us to raise concerns.</p>
            <p>Council members are not liable for reasonable errors in judgment made in good faith during the review process.</p>
          </Section>

          <Section id="fees" title="8. Fees">
            <p>When a bounty pays out, Artypot deducts a <strong className="text-foreground">20% platform fee</strong> from the creator&apos;s payout. This single fee is all-inclusive: it covers Artypot&apos;s operating costs and all payment processing costs (including Stripe card transaction fees). Creators always receive 80% of the total amount backed.</p>
            <p>Backers are charged their exact committed amount — no processing surcharges are ever added to a backer&apos;s charge.</p>
            <p>Fee rates may change with notice. Changes apply to bounties opened after the effective date of the change.</p>
          </Section>

          <Section id="content" title="9. Content Policy">
            <p><strong className="text-foreground">The Artypot surface is all-ages.</strong> Anything you publish or post to the Platform itself — bounty titles and descriptions, profile text, display names, verified handles, comments, and the notes or links you attach to a completion — is hosted and publicly displayed by us and must be suitable for a general audience. It may not contain sexually explicit material, nudity, pornography, or gratuitous shock content. This is a rule about what appears on Artypot; it is not a judgment about the lawful creative work a creator produces and hosts elsewhere.</p>
            <p><strong className="text-foreground">No adult-content commerce.</strong> You may not use a bounty to request, commission, coordinate, or fund sexually explicit or pornographic work, whether or not the finished work is delivered off-platform. Artypot is the merchant of record for every charge, and our payment partners (including the card networks and Stripe) prohibit processing payments for adult content. A bounty whose purpose is to fund adult content is therefore not permitted, regardless of where the work is hosted.</p>
            <p><strong className="text-foreground">Absolute prohibitions.</strong> The following are never permitted on the Platform or in any work funded through it, and apply regardless of where the work is hosted:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Content that is illegal under US federal or state law</li>
              <li>Bounties that pay for an official government act or function as a political campaign contribution (see Section 4)</li>
              <li>Harassment, credible threats, or targeted hate speech</li>
              <li>Malware, malicious code, or attempts to compromise the Platform or its users</li>
            </ul>
            <p>We reserve the right to remove any content and suspend or terminate any account that violates this policy, at our sole discretion and without prior notice.</p>
          </Section>

          <Section id="ip" title="10. Intellectual Property">
            <p>Artypot does not claim ownership of any content created by creators in fulfilment of bounties. The creator retains all rights to their work.</p>
            <p>Backers who fund a bounty receive no special rights to the finished work — they receive the same access as the general public. Artypot is not a commissioned work platform.</p>
            <p>By posting content to Artypot (e.g., bounty descriptions, profile text), you grant us a non-exclusive, royalty-free licence to display that content on the Platform.</p>
          </Section>

          <Section id="termination" title="11. Termination">
            <p>You may delete your account at any time from your settings page. Deletion cancels all active commitments (no charges) and removes your public profile.</p>
            <p>We may suspend or terminate your account if you violate these Terms, engage in fraud, or abuse the Platform. In cases of serious violations, we reserve the right to take action without notice.</p>
          </Section>

          <Section id="disclaimer" title="12. Disclaimers">
            <p>Artypot is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We do not guarantee that the Platform will be uninterrupted, error-free, or that any bounty will be fulfilled.</p>
            <p>We are not responsible for the actions of creators, backers, or third parties.</p>
          </Section>

          <Section id="liability" title="13. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Artypot and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.</p>
            <p>Our total liability to you for any claim arising from these Terms or your use of Artypot shall not exceed the total amount you have paid to Artypot in the 12 months preceding the claim.</p>
          </Section>

          <Section id="governing" title="14. Governing Law">
            <p>These Terms are governed by and construed in accordance with the laws of the State of Florida, United States, without regard to conflict of law principles.</p>
            <p>Any disputes arising from these Terms shall be resolved in the state or federal courts located in Florida. You consent to personal jurisdiction in those courts.</p>
          </Section>

          <Section id="changes" title="15. Changes to These Terms">
            <p>We may update these Terms from time to time. When we do, we&apos;ll update the &quot;Last updated&quot; date at the top. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
            <p>For material changes, we&apos;ll make reasonable efforts to notify you by email or via the Platform.</p>
          </Section>

          <Section id="contact" title="16. Contact">
            <p>
              Questions about these Terms?{' '}
              <Link href="/support" className="text-fan hover:underline">Contact us here</Link>{' '}
              or email{' '}
              <a href="mailto:legal@artypot.com" className="text-fan hover:underline">legal@artypot.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
