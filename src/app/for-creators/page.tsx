import Link from 'next/link';
import FeaturedBountiesSection from '@/components/FeaturedBountiesSection';
import { PLATFORM_FEE_PCT, BILLING_DAY, PLATFORM_PAYOUT_WAIT_DAYS } from '@/lib/config';

export const metadata = {
  title: 'For Creators — Artypot',
  description: 'Tell your fans exactly what you want to make. Let them fund it. Get paid when you deliver.',
};

const creatorReceivesPct = 100 - PLATFORM_FEE_PCT;

// ── Steps to money in the bank ─────────────────────────────────────────────────
const PAYOUT_STEPS: { label: string; sub: string; color: string }[] = [
  {
    label: 'Sign up and become a creator',
    sub: 'Link a social handle so we can confirm it\'s you. A Council member verifies it — usually within a day or two.',
    color: 'bg-creator',
  },
  {
    label: 'Open a bounty for your own project',
    sub: 'Write exactly what you want to make — a video, an album, an illustration series, anything. Be specific. Vague bounties back slowly.',
    color: 'bg-creator',
  },
  {
    label: 'Share the link with your audience',
    sub: 'Post it wherever your fans are. They can back it in two clicks — no account required to back, though they\'ll need one to pay.',
    color: 'bg-creator',
  },
  {
    label: 'Backings come in (no money moves yet)',
    sub: 'Fans commit amounts. Nothing is charged. You can watch the total grow in real time. Decide when you\'re happy with the return.',
    color: 'bg-creator',
  },
  {
    label: 'Make the thing',
    sub: 'On your own schedule. No deadline unless you set one. When it\'s done, submit it from your dashboard.',
    color: 'bg-creator',
  },
  {
    label: 'The Council reviews it',
    sub: 'A small group of human reviewers checks that your submission actually matches what the bounty asked for. Straightforward ones clear in a few days.',
    color: 'bg-council',
  },
  {
    label: 'Fans get charged',
    sub: `Cards are charged on the ${BILLING_DAY}th of the month following approval. Backers who backed get notified before it hits.`,
    color: 'bg-fan',
  },
  {
    label: `${PLATFORM_PAYOUT_WAIT_DAYS}-day clearing window`,
    sub: 'A short buffer for any disputed charges to surface. Standard payment processing practice.',
    color: 'bg-fan',
  },
  {
    label: 'Withdraw to your bank',
    sub: `You keep ${creatorReceivesPct}% of what fans paid. Transfer it to your bank via Stripe Global Payouts.`,
    color: 'bg-creator',
  },
];

export default function ForCreatorsPage() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight text-foreground leading-tight mb-6">
            Tell your fans
            <br />
            what you want to make.
            <br /><span className="text-creator">Let them fund it.</span>
          </h1>

          <p className="text-xl text-muted max-w-xl leading-relaxed mb-10">
            Artypot is a bounty platform. Create a bounty for a specific project, share it with
            your audience, and they put money toward it. No subscriptions. No paywalls. You do
            the thing, you get paid. If you don't deliver, credit cards are never touched.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-creator text-brand-dark font-semibold px-6 py-3 rounded-lg hover:brightness-110 transition-all"
            >
              Get started →
            </Link>
            <a
              href="#how-you-get-paid"
              className="bg-surface border border-border text-foreground font-semibold px-6 py-3 rounded-lg hover:border-creator/50 hover:text-creator transition-colors"
            >
              How you get paid
            </a>
          </div>
        </div>
      </section>

      {/* ── Why it's different ────────────────────────────────────────────── */}
      <section className="bg-surface border-t border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-snug mb-4">
              Not a tip jar. Not a subscription.
              <br /><span className="text-creator">A funded project request.</span>
            </h2>
            <p className="text-lg text-muted">
              You already know what your audience wants... but how much do they want it? Artypot turns their
              "plz do X" comments into a number with a dollar sign in front of it.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <div className="bg-background border border-border rounded-xl p-6">
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Patreon</p>
              <p className="text-muted text-sm leading-relaxed">
                Monthly subscriptions. Good for creators with consistent output — tough if your
                work comes in bursts. Fans are paying for access, not for anything specific.
              </p>
            </div>

            <div className="bg-background border border-border rounded-xl p-6">
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Ko-fi / tips</p>
              <p className="text-muted text-sm leading-relaxed">
                Low friction, but also low signal. Tips don&apos;t tell you what anyone actually
                wants made. They&apos;re appreciation for things you&apos;ve already done.
              </p>
            </div>

            <div className="bg-surface border border-creator/30 rounded-xl p-6">
              <p className="text-xs font-mono text-creator uppercase tracking-wider mb-3">Artypot</p>
              <p className="text-foreground text-sm leading-relaxed">
                Fans put money toward one specific thing you want to make. Nothing moves until
                it&apos;s done. You only get paid when you deliver — which is exactly why fans
                are comfortable putting real money in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The appeal ────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-2 gap-16 items-start max-w-5xl">

            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Why fans back it</p>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                They&apos;re not donating.
                <br />They&apos;re commissioning.
              </h2>
              <ul className="space-y-4">
                {[
                  ['Their card isn\'t charged until you deliver', 'No delivery means no payment. Ever. That makes backing feel safe.'],
                  ['They back one thing, not a monthly commitment', 'No subscription guilt. They put money toward a specific thing they want to exist.'],
                  ['They can back out any time before completion', 'Changed their mind? They withdraw their backing. No hard feelings, no money lost.'],
                ].map(([title, detail]) => (
                  <li key={title as string} className="flex gap-3">
                    <span className="text-creator mt-1 shrink-0">✓</span>
                    <div>
                      <p className="text-foreground text-sm font-medium mb-0.5">{title}</p>
                      <p className="text-muted text-sm leading-relaxed">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Why creators use it</p>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                Test demand before
                <br />investing the time.
              </h2>
              <ul className="space-y-4">
                {[
                  ['Know if it\'s worth making before you make it', 'Open the bounty. Share it. If backings don\'t justify the work, nothing happens and nobody lost money.'],
                  ['Your content stays public', 'This isn\'t a paywall. Backers don\'t get exclusive access — they get the same thing everyone else gets, plus the satisfaction of having made it happen.'],
                  ['No platform decides your payout schedule', `You withdraw when you want. The ${BILLING_DAY}th is when fans are charged — after that, funds clear in ${PLATFORM_PAYOUT_WAIT_DAYS} days.`],
                ].map(([title, detail]) => (
                  <li key={title as string} className="flex gap-3">
                    <span className="text-creator mt-1 shrink-0">✓</span>
                    <div>
                      <p className="text-foreground text-sm font-medium mb-0.5">{title}</p>
                      <p className="text-muted text-sm leading-relaxed">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── How you get paid ──────────────────────────────────────────────── */}
      <section id="how-you-get-paid" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">The full picture</p>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            From sign-up to bank transfer
          </h2>
          <p className="text-muted mb-14 max-w-xl leading-relaxed">
            Every step, in order. No surprises.
          </p>

          <div className="max-w-2xl space-y-0">
            {PAYOUT_STEPS.map(({ label, sub, color }, i, arr) => (
              <div key={label} className="flex gap-5">
                {/* Timeline spine */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${color}`} />
                  {i < arr.length - 1 && (
                    <div className="w-px grow bg-border mt-1.5" />
                  )}
                </div>

                {/* Content */}
                <div className={`${i < arr.length - 1 ? 'pb-8' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                  </div>
                  <p className="text-muted text-sm leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fee breakdown ─────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-2 gap-12 items-start max-w-5xl">

            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-4">The fee</p>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                {PLATFORM_FEE_PCT}%. Flat. All-in.
              </h2>
              <p className="text-muted leading-relaxed mb-4">
                One fee covers everything — Artypot&apos;s operating costs and all Stripe
                payment processing. No monthly fee to list a bounty. No charge if a bounty
                never completes. You only pay when you get paid.
              </p>
              <p className="text-muted leading-relaxed">
                Backers are charged their exact backed amount. The fee comes out of your
                side only, not theirs.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <p className="text-xs font-mono text-muted uppercase tracking-wider">Example payout</p>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-muted text-sm">Total backed by fans</span>
                  <span className="font-mono font-bold text-foreground">$2,000.00</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-muted text-sm">Platform fee ({PLATFORM_FEE_PCT}%)</span>
                  <span className="font-mono text-bad">−${(2000 * PLATFORM_FEE_PCT / 100).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4 bg-creator/5">
                  <span className="text-foreground font-semibold text-sm">You receive</span>
                  <span className="font-mono font-bold text-creator text-xl">
                    ${(2000 * creatorReceivesPct / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Social proof ──────────────────────────────────────────────────── */}
      <FeaturedBountiesSection />

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            Pick something you want to make.
            <br />Open a bounty. Share the link.
          </h2>
          <p className="text-muted mb-8 max-w-sm mx-auto leading-relaxed">
            If your audience wants it, the money will show up.
            If there&apos;s not enough support or you don&apos;t deliver, nobody pays anything.
          </p>
          <Link
            href="/register"
            className="inline-block bg-creator text-brand-dark font-semibold px-8 py-3 rounded-lg hover:brightness-110 transition-all"
          >
            Create your account →
          </Link>
          <p className="text-sm text-muted mt-4">
            Already have one?{' '}
            <Link href="/login" className="text-creator hover:brightness-110 transition-all">
              Log in →
            </Link>
          </p>
          <p className="text-xs text-muted mt-8">
            <Link href="/about" className="hover:text-foreground transition-colors">How Artypot works</Link>
            {' · '}
            <Link href="/tos" className="hover:text-foreground transition-colors">Terms of Service</Link>
            {' · '}
            <Link href="/support" className="hover:text-foreground transition-colors">Questions? Contact us</Link>
          </p>
        </div>
      </section>

    </div>
  );
}
