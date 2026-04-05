import Link from 'next/link';
import HomeAuthGate from '@/components/HomeAuthGate';
import { ROLE_COLORS } from '@/lib/theme';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Someone opens a pot',
    description:
      'Anyone can start one — pick a creator, name the work you want made. A song, a drawing, a video essay, whatever. Put your money in.',
  },
  {
    step: '02',
    title: 'Fans pile on',
    description:
      'Other people who want the same thing add their votives. The creator can see the pot growing. Sometimes that\'s all the motivation they need.',
  },
  {
    step: '03',
    title: 'Work ships. Money moves.',
    description:
      'The creator submits. The Council checks it\'s actually the thing. After a short window, the pot pays out. No delivery? No payout. Simple.',
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
            crowdfunding with receipts
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
            There&apos;s a thing
            <br />
            you want made.
            <br />
            <span className="text-brand">So pay them to make it.</span>
          </h1>

          <p className="text-lg text-muted max-w-xl leading-relaxed mb-10">
            Artypot lets fans pool money for specific creative work from creators they already
            follow. The money holds until the work is verified and delivered. No subscriptions.
            No vibes-based donations. Just a direct ask, and a payout when it ships.
          </p>

          <div className="flex flex-wrap gap-3">
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
              Find Creators
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
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

      {/* Role overview */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-2xl font-bold text-foreground mb-2">Who&apos;s in the room</h2>
          <p className="text-muted mb-12">Three kinds of people. You&apos;re probably one of them.</p>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4" style={{ background: ROLE_COLORS.mob }} />
              <h3 className="font-semibold text-brand mb-2">Fans</h3>
              <p className="text-sm text-muted leading-relaxed">
                Anyone willing to put actual money behind a specific creative ask instead of just
                tweeting about it.
              </p>
            </div>

            <div className="rounded-xl border border-creator/30 bg-creator/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4" style={{ background: ROLE_COLORS.summoned }} />
              <h3 className="font-semibold text-creator mb-2">The Summoned</h3>
              <p className="text-sm text-muted leading-relaxed">
                Creators who&apos;ve claimed their Artypot profile. They can see their pots
                growing — and they&apos;re the only ones who can collect, when they deliver.
              </p>
            </div>

            <div className="rounded-xl border border-council/30 bg-council/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4" style={{ background: ROLE_COLORS.council }} />
              <h3 className="font-semibold text-council mb-2">The Council</h3>
              <p className="text-sm text-muted leading-relaxed">
                A small team that checks submitted work actually matches what the pot asked
                for. They keep things honest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Money section */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                The boring-but-important part
              </h2>
              <p className="text-muted mb-6 leading-relaxed">
                We know how crowdfunding usually goes. You pay, you wait, you get a jpeg and a
                Discord invite. Here, your money doesn&apos;t move until The Council signs off on
                the delivery. It sits in a pot — held through Stripe, not us — until then.
              </p>
              <ul className="space-y-3 text-sm text-muted">
                {[
                  'Held via Stripe until delivery — not in our pocket',
                  'Short review window before payout goes out',
                  '5% platform fee, voted on by the community each year',
                  'Direct bank payout to creators',
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
                { label: 'Creator submits work', color: 'bg-blue-500' },
                { label: 'Council signs off', color: 'bg-creator' },
                { label: 'Short review window', color: 'bg-yellow-500' },
                { label: 'Creator gets paid', color: 'bg-council' },
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
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
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
        </div>
      </section>

    </div>
    </HomeAuthGate>
  );
}
