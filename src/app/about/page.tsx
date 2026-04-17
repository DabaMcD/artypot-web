import Link from 'next/link';
import FeaturedPotsSection from '@/components/FeaturedPotsSection';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Someone opens a bounty',
    description:
      'Anyone can start one. Pick a creator, name the exact thing you want made — a song, a video essay, a drawing, whatever. Put your money in.',
  },
  {
    step: '02',
    title: 'The bounty grows.',
    description:
      'Other people who want the same thing chip in. The creator can see the bounty growing in real time. Sometimes that\'s all the signal they need.',
  },
  {
    step: '03',
    title: 'Work ships. Money moves.',
    description:
      'The creator submits. The Council checks it\'s actually the thing. After a short window, the bounty pays out. No delivery? No payout. Simple.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-fan/10 border border-fan/30 text-fan text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-fan animate-pulse" />
            Not a tip jar. Not a Kickstarter.
          </div>

          <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight text-foreground leading-tight mb-6">
            A comment saying &apos;please&apos;
            <br />is easy to scroll past.
            <br /><span className="text-fan">$10,000? Not so much</span>
          </h1>

          <p className="text-xl text-muted max-w-xl leading-relaxed mb-10">
            Fans pool money for specific requests from public entities.
            Wallets are untouched until the work is done. No risk. Guaranteed results.
          </p>

          <div className="flex flex-wrap gap-3 mb-5">
            <Link
              href="/bounties"
              className="bg-fan text-black font-semibold px-6 py-3 rounded-lg hover:bg-fan-dim transition-colors"
            >
              Browse Bounties
            </Link>
            <Link
              href="/creators"
              className="bg-surface border border-border text-foreground font-semibold px-6 py-3 rounded-lg hover:border-creator/50 hover:text-creator transition-colors"
            >
              Find a Creator
            </Link>
          </div>
          <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
            Not sure what any of this is? → How it works
          </a>
        </div>
      </section>

      {/* Creator Psychology */}
      <section className="bg-surface border-t border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-24">

          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-3xl sm:text-4xl font-bold text-foreground leading-snug mb-4">
              The bounty doesn&apos;t pressure anyone.
              <br />It just sits there, growing,
              <br />being very visible.
            </p>
            <p className="text-lg text-muted">
              The demand was already there. I just gave it a number.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-background border border-border rounded-xl p-8">
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-4">
                The way it usually works
              </p>
              <p className="text-muted text-base leading-relaxed">
                You leave a comment. You quote-tweet. You ask nicely. You get ignored, or you
                get a &apos;soon.&apos; The moment passes. The thing never gets made.
              </p>
            </div>

            <div className="bg-surface border border-fan/30 rounded-xl p-8">
              <p className="text-xs font-mono text-fan uppercase tracking-wider mb-4">
                The way this works
              </p>
              <p className="text-foreground text-base leading-relaxed">
                You and 200 strangers who have extremely specific taste put money in a bounty.
                The bounty becomes impossible to ignore. Some people only show
                up when the price is right. No judgment, that&apos;s just physics.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">How it works</h2>
          <p className="text-muted mb-12">Three steps. Smart people usually have it by step two.</p>

          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className="bg-surface border border-border rounded-xl p-6">
                <div className="text-fan font-mono text-sm font-bold mb-4">{step}</div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-base text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who's in the room */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Who&apos;s in the room where it happens?</h2>
          <p className="text-muted mb-12">Three kinds of people. You&apos;re probably one of them.</p>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-fan/30 bg-fan/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4 bg-fan" />
              <h3 className="font-semibold text-fan mb-2">Fans</h3>
              <p className="text-base text-muted leading-relaxed">
                You. You want a specific thing made and you&apos;re willing to back it with
                real money instead of a strongly-worded tweet.
              </p>
            </div>

            <div className="rounded-xl border border-creator/30 bg-creator/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4 bg-creator" />
              <h3 className="font-semibold text-creator mb-2">The Creator</h3>
              <p className="text-base text-muted leading-relaxed">
                Whoever the bounty is for. They don&apos;t owe anyone anything — but there&apos;s
                real money sitting there with their name on it. It&apos;s only a matter of time...
              </p>
            </div>

            <div className="rounded-xl border border-council/30 bg-council/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4 bg-council" />
              <h3 className="font-semibold text-council mb-2">The Council</h3>
              <p className="text-base text-muted leading-relaxed">
                Me and some people I trust. We check that the thing is actually the thing
                before any money moves. Nobody gets paid without us.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Money + Freedom of Expression */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                The technical part
              </h2>
              <p className="text-muted mb-6 leading-relaxed">
                I know how crowdfunding usually goes. You pay, you wait, you get a link to a
                Discord. Here, your card isn&apos;t charged until the work is DONE.
                The Council verifies completion before any money moves.
              </p>
              <ul className="space-y-3 text-base text-muted">
                {[
                  'Your credit card is not charged until the work is done',
                  '5% platform fee — I need to eat',
                  'Direct bank payout to the creator',
                  'Fans who funded the project get no special access — same as everyone else',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-fan mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="text-sm text-muted font-medium uppercase tracking-wider mb-6">
                A bounty&apos;s life
              </div>
              {[
                { label: 'Bounty opens', color: 'bg-fan' },
                { label: 'Fans back the bounty', color: 'bg-fan' },
                { label: 'Creator submits work', color: 'bg-creator' },
                { label: 'Council signs off', color: 'bg-council' },
                { label: 'Fans get charged', color: 'bg-fan' },
                { label: 'Creator gets paid', color: 'bg-creator' },
              ].map(({ label, color }, i, arr) => (
                <div key={label} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${color}`} />
                    {i < arr.length - 1 && (
                      <div className="w-px grow bg-border mt-1" />
                    )}
                  </div>
                  <span className={`text-base text-foreground ${i < arr.length - 1 ? 'pb-4' : ''}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Freedom of expression */}
          <div className="mt-12 pt-12 border-t border-border max-w-3xl">
            <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">For the record</p>
            <p className="text-base text-muted leading-relaxed mb-3">
              I don&apos;t have a content policy that quietly updates on a Friday night. I don&apos;t
              decide what&apos;s worth making. You and your fans do. That&apos;s the whole thing.
            </p>
            <p className="text-base text-muted leading-relaxed">
              There are obvious limits — illegal is illegal — but the platform doesn&apos;t have
              opinions about art.
            </p>
          </div>

          {/* Current limitations */}
          <div className="mt-10 pt-10 border-t border-border max-w-3xl">
            <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">A note on where I&apos;m at</p>
            <p className="text-base text-muted leading-relaxed mb-3">
              Right now, Artypot only supports <span className="text-foreground">credit card payments</span>, and payouts
              can only go to creators who are <span className="text-foreground">based among the United States</span>. That&apos;s
              not a vision statement — it&apos;s just where the legal paperwork is currently in order.
            </p>
            <p className="text-base text-muted leading-relaxed">
              I&apos;m working on it. The goal is eventually worldwide. For now: if you&apos;re a fan
              anywhere in the world, you can still back bounties. If you&apos;re the one getting paid,
              you&apos;ll need a US bank account.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Pots */}
      <FeaturedPotsSection />

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            There&apos;s probably already a bounty
            <br />
            for something you want.
          </h2>
          <p className="text-muted mb-8">
            Go look. If there isn&apos;t one yet, you know what to do.
          </p>
          <Link
            href="/bounties"
            className="inline-block bg-fan text-black font-semibold px-8 py-3 rounded-lg hover:bg-fan-dim transition-colors"
          >
            Browse Open Bounties
          </Link>
          <a
            href="/bounties/new"
            className="block text-sm text-muted hover:text-foreground transition-colors mt-4"
          >
            or start a bounty yourself →
          </a>
        </div>
      </section>

    </div>
  );
}
