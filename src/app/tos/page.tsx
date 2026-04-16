import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Artypot',
};

const LAST_UPDATED = 'April 11, 2026';

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
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* TL;DR */}
        <div className="bg-brand/5 border border-brand/30 rounded-xl p-6 mb-12">
          <p className="text-xs font-mono text-brand uppercase tracking-wider mb-3 font-semibold">TL;DR — plain English</p>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><span className="text-brand shrink-0 mt-0.5">✓</span><span><strong>No money moves when you place a pledge</strong> — not even a hold. Your card is only charged after The Council confirms a bounty complete.</span></li>
            <li className="flex gap-2"><span className="text-brand shrink-0 mt-0.5">✓</span><span><strong>You can revoke your pledge any time</strong> before a bounty completes, for free. No questions asked.</span></li>
            <li className="flex gap-2"><span className="text-brand shrink-0 mt-0.5">✓</span><span><strong>Artypot takes a 5% platform fee</strong> plus standard Stripe payment processing fees, both deducted from the creator&apos;s payout. Backers are charged their pledged amount in full.</span></li>
            <li className="flex gap-2"><span className="text-brand shrink-0 mt-0.5">✓</span><span><strong>Payouts go to US-based creators only</strong> for now. Fans anywhere in the world can place pledges.</span></li>
            <li className="flex gap-2"><span className="text-brand shrink-0 mt-0.5">✓</span><span><strong>If a bounty never completes, no money moves.</strong> Ever.</span></li>
            <li className="flex gap-2"><span className="text-brand shrink-0 mt-0.5">✓</span><span><strong>Anything legal is allowed.</strong> I personally request you don&apos;t ask for anything depraved — but freedom matters more than trying to enforce morality.</span></li>
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
              ['pledges', 'Pledges and Payments'],
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
            <p>By accessing or using Artypot (&quot;the Platform,&quot; &quot;we,&quot; &quot;us&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
            <p>You must be at least 18 years old to create an account or place a pledge. By using the Platform, you represent that you meet this requirement.</p>
          </Section>

          <Section id="description" title="2. What Artypot Is">
            <p>Artypot is a bounty-style crowdfunding platform. Fans (&quot;backers&quot;) pool pledges toward specific tasks from public entities (&quot;creators&quot;). Pledges are a commitment of funds, but no money moves when a pledge is placed. Charges only occur after The Council reviews and confirms a bounty as complete.</p>
            <p>Artypot is not a tip jar, subscription service, or pre-order platform. It is a mechanism for coordinating demand signals and releasing payment only on delivery.</p>
          </Section>

          <Section id="accounts" title="3. Accounts">
            <p>You are responsible for maintaining the security of your account and all activity that occurs under it. Do not share your login credentials.</p>
            <p>You agree to provide accurate, current, and complete information when registering. We reserve the right to suspend or terminate accounts with inaccurate or misleading information.</p>
            <p>One person, one account. Creating multiple accounts to circumvent restrictions is prohibited.</p>
          </Section>

          <Section id="bounties" title="4. Bounties">
            <p>Any registered user may open a bounty for any task a named creator could verifiably complete. There is no restriction on subject matter beyond legality and the Content Policy (Section 9). If it can be done and confirmed, it can be a bounty.</p>
            <p>Opening a bounty does not guarantee the named creator will fulfil it. The creator is under no contractual obligation to Artypot or to backers. A bounty is an expression of collective demand, not a contract with the creator.</p>
            <p>We reserve the right to remove any bounty at our sole discretion, including but not limited to bounties that are too vague, too difficult to verify completion, harmful, or illegal. We are not obligated to explain every removal, though we will attempt to provide a reason when possible.</p>
            <p>While we are committed to being reasonable, the creator a bounty is directed at may also remove that bounty at their sole discretion, for any reason or no reason.</p>
          </Section>

          <Section id="pledges" title="5. Pledges and Payments">
            <p><strong className="text-foreground">Pledge vs. charge:</strong> When you place a pledge, no money moves and no authorization hold is placed on your card. Your card is only charged after The Council confirms a bounty is complete.</p>
            <p><strong className="text-foreground">Revoking a pledge:</strong> You may revoke your pledge at any time before a bounty is confirmed completed by Council, even during the &quot;pending review&quot; stage.</p>
            <p><strong className="text-foreground">Failed charges:</strong> If your card cannot be charged when a bounty completes (expired card, insufficient funds, etc.), the charge will fail and you will be notified. You will not be able to place new pledges until the payment method is resolved.</p>
            <p><strong className="text-foreground">No completed-bounty refunds:</strong> Once a bounty has been approved by The Council and charges have been processed, payments are final and non-refundable. You had the opportunity to revoke your pledge before completion.</p>
            <p><strong className="text-foreground">Uncompleted bounties:</strong> If a bounty is closed or revoked before completion, no charges are made. Nothing was ever held against your card.</p>
            <p>Payments are processed by Stripe, Inc. By placing a pledge, you also agree to <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Stripe&apos;s Terms of Service</a>.</p>
          </Section>

          <Section id="creators" title="6. Creator Obligations">
            <p>Creators who claim their profile and accept a bounty agree to deliver the specific work described in the bounty in good faith, as understood by their community.</p>
            <p>Submission of a completion claim constitutes a representation that the submitted work satisfies the bounty description. Fraudulent submissions — submitting work that does not fulfil the bounty, or submitting work you do not own the rights to — may result in account termination and, where applicable, legal action.</p>
            <p>Creators receiving payouts must be based in the United States and must provide accurate payment and tax information (including a completed W-9 where required). Artypot will issue 1099s where required by law.</p>
          </Section>

          <Section id="council" title="7. The Council">
            <p>The Council is a group of human reviewers appointed by Artypot. Their role is to verify that a submitted work actually fulfils the bounty before any funds are collected.</p>
            <p>The Council&apos;s decisions are final. There is no formal appeals process, though you may contact us to raise concerns.</p>
            <p>Council members are not liable for reasonable errors in judgment made in good faith during the review process.</p>
          </Section>

          <Section id="fees" title="8. Fees">
            <p>When a bounty pays out, two fees are deducted from the creator&apos;s payout:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">5% platform fee</strong> — Artypot&apos;s fee for running the platform.</li>
              <li><strong className="text-foreground">Payment processing fees</strong> — charged by Stripe for processing the underlying card transactions. These vary slightly by card type and are passed through at cost.</li>
            </ul>
            <p>Backers are charged their pledged amount in full. All fees come out of the creator&apos;s side.</p>
            <p>Fee rates may change with notice. Changes apply to bounties opened after the effective date of the change.</p>
          </Section>

          <Section id="content" title="9. Content Policy">
            <p>You may not use Artypot to request, fund, or distribute content that is illegal under US federal or state law.</p>
            <p>We reserve the right to remove content and suspend accounts at our discretion, but we do not have a general content moderation policy beyond what is listed here.</p>
          </Section>

          <Section id="ip" title="10. Intellectual Property">
            <p>Artypot does not claim ownership of any content created by creators in fulfilment of bounties. The creator retains all rights to their work.</p>
            <p>Backers who fund a bounty receive no special rights to the finished work — they receive the same access as the general public. Artypot is not a commissioned work platform.</p>
            <p>By posting content to Artypot (e.g., bounty descriptions, profile text), you grant us a non-exclusive, royalty-free licence to display that content on the Platform.</p>
          </Section>

          <Section id="termination" title="11. Termination">
            <p>You may delete your account at any time from your settings page. Deletion cancels all active pledges (no charges) and removes your public profile.</p>
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
              <Link href="/support" className="text-brand hover:underline">Contact us here</Link>{' '}
              or email{' '}
              <a href="mailto:baldwig@artypot.com" className="text-brand hover:underline">baldwig@artypot.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
