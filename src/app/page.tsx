import Link from 'next/link';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'A pot gets created',
    description:
      'Anyone can open a pot for a specific creative work — a song, illustration, video, meme. The creator is named upfront.',
  },
  {
    step: '02',
    title: 'The community funds it',
    description:
      'Fans pledge money. Funds are held safely until the work is done. No risk, no upfront contracts.',
  },
  {
    step: '03',
    title: 'The work gets made',
    description:
      'The creator submits their work. After a 7-day review window, the pot pays out directly to them.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 text-brand text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Crowdfund-commissioning for creative work
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
            Fund the work.
            <br />
            <span className="text-brand">Then it gets made.</span>
          </h1>

          <p className="text-lg text-muted max-w-xl leading-relaxed mb-10">
            Communities pool money into pots that pay out directly to creators once they complete a
            public creative work. No upfront contracts. No gatekeepers.
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
          <p className="text-muted mb-12">Simple. Transparent. Community-driven.</p>

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
          <h2 className="text-2xl font-bold text-foreground mb-12">Who&apos;s involved</h2>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-6">
              <div
                className="w-3 h-3 rounded-full mb-4"
                style={{ background: '#F5A623' }}
              />
              <h3 className="font-semibold text-brand mb-1">The Mob</h3>
              <p className="text-sm text-muted">
                Everyone. Fans and funders who pledge money into pots for creative work they want to
                see made.
              </p>
            </div>

            <div className="rounded-xl border border-creator/30 bg-creator/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4" style={{ background: '#47DFD3' }} />
              <h3 className="font-semibold text-creator mb-1">The Summoned</h3>
              <p className="text-sm text-muted">
                Creators who can receive payouts. They claim their profile and submit completed work
                to unlock the funds.
              </p>
            </div>

            <div className="rounded-xl border border-council/30 bg-council/5 p-6">
              <div className="w-3 h-3 rounded-full mb-4" style={{ background: '#8A2BE2' }} />
              <h3 className="font-semibold text-council mb-1">The Council</h3>
              <p className="text-sm text-muted">
                Platform admins who verify creator identities, approve completions, and keep things
                running fairly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Money logistics */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Safe, transparent funding
              </h2>
              <p className="text-muted mb-6 leading-relaxed">
                Funds are held securely and only released when the work is verified and approved.
                Artypot takes a 5% platform fee — subject to community vote each year.
              </p>
              <ul className="space-y-3 text-sm text-muted">
                {[
                  'Funds held via Stripe until work is complete',
                  '7-day funder review window before payout',
                  '5% platform fee (community-voted annually)',
                  'Direct bank payout to creators',
                  'No sales tax — delivered work is free to the public',
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
                Pot lifecycle
              </div>
              {[
                { label: 'Pot created', color: 'bg-muted' },
                { label: 'Community funds it', color: 'bg-brand' },
                { label: 'Creator submits work', color: 'bg-blue-500' },
                { label: 'Council approves', color: 'bg-creator' },
                { label: '7-day review window', color: 'bg-yellow-500' },
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
            Ready to fund some art?
          </h2>
          <p className="text-muted mb-8">
            Browse open pots and pledge to the creative work you want to see made.
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
  );
}
