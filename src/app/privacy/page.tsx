import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Artypot',
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* TL;DR */}
        <div className="bg-creator/5 border border-creator/30 rounded-xl p-6 mb-12">
          <p className="text-xs font-mono text-creator uppercase tracking-wider mb-3 font-semibold">TL;DR — plain English</p>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>We collect only what we need</strong> to run the platform — your name, email, and payment info.</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>We don&apos;t sell your data.</strong> We don&apos;t rent it. We don&apos;t use it for ads.</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>Stripe handles your card details.</strong> We never see or store your full card number.</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>Your backing history is private by default.</strong> You can make your profile anonymous in settings.</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>You can delete your account</strong> and we&apos;ll remove your personal data.</span></li>
            <li className="flex gap-2"><span className="text-creator shrink-0 mt-0.5">✓</span><span><strong>We use minimal cookies</strong> — just what&apos;s needed for the site to function.</span></li>
          </ul>
          <p className="text-xs text-muted mt-4">This TL;DR is a helpful summary, not a substitute for the full policy below.</p>
        </div>

        {/* ToC */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-12 text-sm">
          <p className="font-semibold text-foreground mb-3">Contents</p>
          <ol className="space-y-1.5 text-muted list-decimal list-inside">
            {[
              ['controller', 'Who Controls Your Data'],
              ['collected', 'What We Collect'],
              ['how-used', 'How We Use It'],
              ['sharing', 'Who We Share It With'],
              ['payments', 'Payment Data and Stripe'],
              ['retention', 'How Long We Keep It'],
              ['rights', 'Your Rights'],
              ['cookies', 'Cookies'],
              ['children', 'Children'],
              ['international', 'International Users'],
              ['changes', 'Changes to This Policy'],
              ['contact', 'Contact'],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-foreground transition-colors">{label}</a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-0">

          <Section id="controller" title="1. Who Controls Your Data">
            <p>
              Artypot is operated by Harry Baldwig (&quot;I,&quot; &quot;me,&quot; &quot;us&quot;). For questions about this policy, contact{' '}
              <a href="mailto:baldwig@artypot.com" className="text-fan hover:underline">baldwig@artypot.com</a>.
            </p>
          </Section>

          <Section id="collected" title="2. What We Collect">
            <p><strong className="text-foreground">Account information:</strong> Your name, email address, and password (hashed — we can&apos;t read it). Optionally: a profile picture and phone number for verification purposes.</p>
            <p><strong className="text-foreground">Financial information:</strong> For backers: payment method details (processed by Stripe — see Section 5). For creators receiving payouts: bank account information (processed by Plaid / Stripe Connect), Tax ID for 1099 reporting.</p>
            <p><strong className="text-foreground">Activity data:</strong> Bounties you&apos;ve created, bounties you&apos;ve backed, bounties you&apos;ve fulfilled, notifications you&apos;ve received.</p>
            <p><strong className="text-foreground">Usage data:</strong> Standard server logs — IP addresses, browser type, pages visited, timestamps. We use this to diagnose problems, not to build marketing profiles.</p>
            <p><strong className="text-foreground">Communications:</strong> If you contact us via the support form or email, we retain those messages to resolve your request.</p>
          </Section>

          <Section id="how-used" title="3. How We Use It">
            <p>We use your data to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Run the Platform — authenticate your account, process payments, trigger payouts</li>
              <li>Send you transactional emails (payment confirmations, bounty updates, payment receipts)</li>
              <li>Comply with legal obligations — tax reporting (1099s), fraud prevention</li>
              <li>Improve the Platform — identify bugs and usage patterns in aggregate</li>
              <li>Respond to support requests</li>
            </ul>
            <p>We do not use your data for advertising, profiling, or sale to third parties.</p>
          </Section>

          <Section id="sharing" title="4. Who We Share It With">
            <p>We share data only with the service providers needed to operate the Platform:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Stripe</strong> — payment processing and creator payouts</li>
              <li><strong className="text-foreground">Plaid</strong> — bank account verification for creator payouts</li>
              <li><strong className="text-foreground">TaxBandits / similar</strong> — 1099 filing where required</li>
              <li><strong className="text-foreground">Email service provider</strong> — transactional email delivery</li>
              <li><strong className="text-foreground">Hosting / infrastructure providers</strong> — servers and databases</li>
            </ul>
            <p>All service providers are bound by data processing agreements. We do not allow them to use your data for their own purposes.</p>
            <p>We may also disclose data where required by law, such as in response to a valid court order or subpoena.</p>
          </Section>

          <Section id="payments" title="5. Payment Data and Stripe">
            <p>All payment card data is handled directly by Stripe, Inc. When you enter your card details, that information goes to Stripe&apos;s servers — not ours. We never see or store your full card number, CVV, or expiry.</p>
            <p>We store a Stripe customer ID and a reference to your saved payment method (e.g., last four digits, card type) so you can manage your billing. This reference is not sufficient to initiate a charge — only Stripe can do that on our instruction.</p>
            <p>Stripe&apos;s privacy practices are governed by the <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-fan hover:underline">Stripe Privacy Policy</a>.</p>
            <p>Creator bank account information is processed by Plaid and Stripe Connect. We store only a tokenised reference to the linked account — not the account number itself.</p>
          </Section>

          <Section id="retention" title="6. How Long We Keep It">
            <p>We retain your account data for as long as your account is active. If you delete your account, we remove your personal information from active systems within 30 days.</p>
            <p>Financial records (payment amounts, payout records, receipts) are retained for 7 years as required by US tax law, even after account deletion. These records are anonymised where possible.</p>
            <p>Server logs are retained for up to 90 days and then deleted.</p>
          </Section>

          <Section id="rights" title="7. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Correct</strong> — update inaccurate information via your settings page</li>
              <li><strong className="text-foreground">Delete</strong> — delete your account and personal data (subject to legal retention requirements)</li>
              <li><strong className="text-foreground">Portability</strong> — request your data in a machine-readable format</li>
              <li><strong className="text-foreground">Object</strong> — object to processing where we rely on legitimate interests</li>
            </ul>
            <p>
              To exercise these rights,{' '}
              <Link href="/support" className="text-fan hover:underline">contact us</Link>{' '}
              or email{' '}
              <a href="mailto:baldwig@artypot.com" className="text-fan hover:underline">baldwig@artypot.com</a>.
              We will respond within 30 days.
            </p>
            <p>If you are in the EU/EEA or California, you may have additional rights under GDPR or CCPA. We&apos;ll honour those requests even if you don&apos;t cite the specific regulation.</p>
          </Section>

          <Section id="cookies" title="8. Cookies">
            <p>Artypot uses minimal cookies:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Authentication token</strong> — stored in localStorage (not a cookie) to keep you logged in. Cleared when you log out.</li>
              <li><strong className="text-foreground">Stripe&apos;s cookies</strong> — set by Stripe&apos;s JavaScript for fraud detection during payment flows. Governed by Stripe&apos;s policy.</li>
            </ul>
            <p>We do not use analytics cookies, tracking pixels, or third-party advertising cookies. There is no cookie consent banner because there is nothing to consent to beyond what&apos;s necessary.</p>
          </Section>

          <Section id="children" title="9. Children">
            <p>Artypot is not intended for anyone under 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected data from a minor, please contact us and we will delete it promptly.</p>
          </Section>

          <Section id="international" title="10. International Users">
            <p>Artypot is operated from the United States. If you are accessing the Platform from outside the US, your data will be transferred to and processed in the US. By using the Platform, you consent to this transfer.</p>
            <p>We apply data protection measures consistent with US law. We do not currently have a formal EU Standard Contractual Clause (SCC) framework in place, but we will comply with any lawful data subject requests we receive.</p>
          </Section>

          <Section id="changes" title="11. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Changes will be reflected in the &quot;Last updated&quot; date at the top. For material changes, we will notify you by email or via the Platform.</p>
          </Section>

          <Section id="contact" title="12. Contact">
            <p>
              Privacy questions or requests?{' '}
              <Link href="/support" className="text-fan hover:underline">Contact us here</Link>{' '}
              or email{' '}
              <a href="mailto:baldwig@artypot.com" className="text-fan hover:underline">baldwig@artypot.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
