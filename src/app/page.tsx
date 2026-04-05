import Link from 'next/link';
import HomeAuthGate from '@/components/HomeAuthGate';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Someone opens a pot',
    description:
      'Anyone can start one. Pick a summon, name the exact thing you want made — a song, a video essay, a drawing, whatever. Put your money in.',
  },
  {
    step: '02',
    title: 'The pot grows.',
    description:
      'Other people who want the same thing add their votives. The summon can see the pot growing in real time. Sometimes that\'s all the signal they need.',
  },
  {
    step: '03',
    title: 'Work ships. Money moves.',
    description:
      'The summon submits. The Council checks it\'s actually the thing. After a short window, the pot pays out. No delivery? No payout. Simple.',
  },
];

export default function HomePage() {
  return (
    <HomeAuthGate>
    <div className="min-h-screen">

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 text-brand text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Not a tip jar. Not a Kickstarter.
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
            A comment saying &apos;please&apos;
            <br />is easy to scroll past.
            <br /><span className="text-brand">$10,000 is harder.</span>
          </h1>

          <p className="text-lg text-muted max-w-xl leading-relaxed mb-10">
            Artypot lets fans pool real money for specific work from whoever they follow.
            The money holds until the work ships. No subscriptions. No vibes-based donations.
          </p>

          <div className="flex flex-wrap gap-3 mb-5">
            <Link
              href="/pots"
              className="bg-brand text-black font-semibold px-6 py-3 rounded-lg hover:bg-brand-dim transition-colors"
            >
              Browse Pots
            </Link>
            <Link
              href="/summons"
              className="bg-surface border border-border text-foreground font-semibold px-6 py-3 rounded-lg hover:border-creator/50 hover:text-creator transition-colors"
            >
              Find a Summon
            </Link>
          </div>
          <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
            Not sure what any of this is? → How it works
          </a>
        </div>
      </section>

      {/* Summon Psychology */}
      <section className="bg-surface border-t border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-24">

          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-3xl sm:text-4xl font-bold text-foreground leading-snug mb-4">
              The pot doesn&apos;t pressure anyone.
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

            <div className="bg-surface border border-brand/30 rounded-xl p-8">
              <p className="text-xs font-mono text-brand uppercase tracking-wider mb-4">
                The way this works
              </p>
              <p className="text-foreground text-base leading-relaxed">
                You and 200 strangers who have extremely specific taste put money in a pot.
                The pot just sits there, growing, being very visible. Some people only show
                up when the price is right. No judgment. That&apos;s just physics.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-2xl font-bold text-foreground mb-2">How it works</h2>
          <p className="text-muted mb-12">Three steps. One idea. You&apos;ll get it.</p>

          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className="bg-surface border border-border rounded-xl p-6">
                <div className="text-brand font-mono text-sm font-bold mb-4">{step}</div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who's in the room */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-2xl font-bold text-foreground mb-2">Who&apos;s in the room</h2>
          <p className="text-muted mb-12">Three kinds of people. You&apos;re probably one of them.</p>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4 bg-brand" />
              <h3 className="font-semibold text-brand mb-2">Fans</h3>
              <p className="text-sm text-muted leading-relaxed">
                Anyone willing to put actual money behind what they want made, instead of
                just asking nicely on the internet.
              </p>
            </div>

            <div className="rounded-xl border border-creator/30 bg-creator/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4 bg-creator" />
              <h3 className="font-semibold text-creator mb-2">The Summoned</h3>
              <p className="text-sm text-muted leading-relaxed">
                Public figures who&apos;ve claimed their Artypot profile. They see their pots
                growing. They decide whether to take the commission. When they deliver and
                The Council signs off, they get paid.
              </p>
            </div>

            <div className="rounded-xl border border-council/30 bg-council/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4 bg-council" />
              <h3 className="font-semibold text-council mb-2">The Council</h3>
              <p className="text-sm text-muted leading-relaxed">
                A small team that verifies submitted work actually matches what the pot asked
                for. No delivery, no payout. They keep the whole thing honest.
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
              <h2 className="text-2xl font-bold text-foreground mb-4">
                The boring-but-important part
              </h2>
              <p className="text-muted mb-6 leading-relaxed">
                I know how crowdfunding usually goes. You pay, you wait, you get a link to a
                Discord. Here, your money doesn&apos;t move until the thing exists. It sits in a
                pot — held through Stripe, not by me — until The Council signs off.
              </p>
              <ul className="space-y-3 text-sm text-muted">
                {[
                  'Held via Stripe until delivery — not in my pocket',
                  'Short review window before payout goes out',
                  '5% platform fee, voted on by the community each year',
                  'Direct bank payout to the summon',
                  'The finished work is free to the public',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-brand mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
              <div className="text-sm text-muted font-medium uppercase tracking-wider mb-4">
                A pot&apos;s life
              </div>
              {[
                { label: 'Pot opens', color: 'bg-muted' },
                { label: 'Fans add votives', color: 'bg-brand' },
                { label: 'Summon submits work', color: 'bg-blue-500' },
                { label: 'Council signs off', color: 'bg-creator' },
                { label: 'Short review window', color: 'bg-yellow-500' },
                { label: 'Summon gets paid', color: 'bg-council' },
              ].map(({ label, color }, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    {i < 5 && <div className="w-px h-4 bg-border" />}
                  </div>
                  <span className="text-sm text-foreground">{label}</span>
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
            <p className="text-sm text-muted leading-relaxed">
              There are obvious limits — illegal is illegal — but the platform doesn&apos;t have
              opinions about art.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            There&apos;s probably already a pot
            <br />
            for something you want.
          </h2>
          <p className="text-muted mb-8">
            Go look. If there isn&apos;t one yet, you know what to do.
          </p>
          <Link
            href="/pots"
            className="inline-block bg-brand text-black font-semibold px-8 py-3 rounded-lg hover:bg-brand-dim transition-colors"
          >
            Browse Open Pots
          </Link>
          <a
            href="/pots/new"
            className="block text-sm text-muted hover:text-foreground transition-colors mt-4"
          >
            or start a pot yourself →
          </a>
        </div>
      </section>

    </div>
    </HomeAuthGate>
  );
}
