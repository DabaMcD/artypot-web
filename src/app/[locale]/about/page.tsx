import { Link } from '@/i18n/routing';
import type { CSSProperties } from 'react';
import FeaturedBountiesSection from '@/components/FeaturedBountiesSection';
import SpotCard from '@/components/about/SpotCard';
import BountyGrowthDemo from '@/components/about/BountyGrowthDemo';
import LifecycleRail from '@/components/about/LifecycleRail';
import { Badge } from '@/components/ui/Badge';
import { PLATFORM_FEE_PCT } from '@/lib/config';

export const metadata = {
  title: 'About',
  description:
    'Like Kickstarter, but no money moves until the thing is done. Fans pool money on specific requests; nobody is charged until the work is delivered and approved.',
};

// Pins .ap-sketch-u (which reads --color-role) to fan yellow regardless of the
// visitor's role, since AppShell sets data-role from the logged-in user.
const fanRole = { '--color-role': 'var(--color-fan)' } as CSSProperties;

const microLabel = 'font-mono text-[10px] uppercase tracking-[2px] text-muted';

// Signature hard-shadow press buttons
const pressBtn =
  'inline-block bg-fan text-brand-dark font-bold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow] duration-75 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]';
const pressBtnSecondary =
  'inline-block bg-surface-2 border border-border text-foreground font-semibold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow,border-color] duration-75 hover:border-creator/60 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]';

const TAGLINES: { text: string; pill: string; dot: string }[] = [
  {
    text: 'Like Kickstarter, but no money moves until the thing is done.',
    pill: 'bg-fan/10 border-fan/30 text-fan',
    dot: 'bg-fan',
  },
  {
    text: 'Like Change.org, but with accurate financial incentives.',
    pill: 'bg-fan/10 border-fan/30 text-fan',
    dot: 'bg-fan',
  },
  {
    text: 'Artypot is a communication device. A demand coordinator.',
    pill: 'bg-creator/10 border-creator/30 text-creator',
    dot: 'bg-creator',
  },
];

const HOW_IT_WORKS: { step: string; chip: string; spot: string; title: string; description: string }[] = [
  {
    step: '01',
    chip: 'bg-fan',
    spot: 'var(--color-fan)',
    title: 'Someone opens a bounty',
    description:
      'Anyone can start one. Pick a creator, name the exact thing you want made — a song, a video essay, a drawing, whatever. Set your dollar figure.',
  },
  {
    step: '02',
    chip: 'bg-creator',
    spot: 'var(--color-creator)',
    title: 'The bounty grows',
    description:
      'Other people who want the same thing chip in. The creator can see the bounty growing in real time. Sometimes that\'s all the signal they need.',
  },
  {
    step: '03',
    chip: 'bg-council',
    spot: 'var(--color-council)',
    title: 'Work ships. Money moves.',
    description:
      'The creator submits completion. The Council checks it matches the request. Cards are charged and the bounty pays out. No delivery = no charge.',
  },
];

const ROLES: {
  name: string;
  badge: string;
  tone: 'fan' | 'creator' | 'council';
  spot: string;
  skin: string;
  dot: string;
  text: string;
  body: string;
}[] = [
  {
    name: 'Fans',
    badge: 'that\'s you',
    tone: 'fan',
    spot: 'var(--color-fan)',
    skin: 'border-fan/30 bg-fan/5',
    dot: 'bg-fan',
    text: 'text-fan',
    body: 'You want a specific thing to happen and you\'re willing to back it with real money.',
  },
  {
    name: 'The Creator',
    badge: 'the talent',
    tone: 'creator',
    spot: 'var(--color-creator)',
    skin: 'border-creator/30 bg-creator/5',
    dot: 'bg-creator',
    text: 'text-creator',
    body: 'Whoever the bounty is for. They don\'t owe anyone anything — but there\'s real money sitting there with their name on it. It\'s only a matter of time...',
  },
  {
    name: 'The Council',
    badge: 'the referees',
    tone: 'council',
    spot: 'var(--color-council)',
    skin: 'border-council/30 bg-council/5',
    dot: 'bg-council',
    text: 'text-council',
    body: 'Me and some people I trust. We check that the thing is actually the thing before any money moves. Nobody gets paid without us.',
  },
];

const GUARANTEES: { title: string; detail: string }[] = [
  {
    title: 'Charged only on delivery',
    detail:
      'Your card isn\'t touched until the work is done and the Council has approved it. Back out anytime before completion — no risk while you wait.',
  },
  {
    title: `${PLATFORM_FEE_PCT}% platform fee, all-in`,
    detail: 'Covers everything — I need to eat, file taxes, and payment processors needs to get paid.',
  },
  {
    title: 'Direct bank payout',
    detail: 'When a bounty clears, the money goes straight to the creator\'s bank account.',
  },
  {
    title: 'No special access for backers',
    detail: 'The content stays public. Fans who funded it get the same thing as everyone else.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative">
        {/* Soft fan glow behind the hero, clipped so it never bleeds sideways. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 h-[420px] w-[820px] max-w-[140vw] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,217,102,0.10) 0%, transparent 65%)' }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-7 pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
            <div>
              <div className="flex flex-col items-start gap-2 mb-8">
                {TAGLINES.map(({ text, pill, dot }) => (
                  <p key={text} className={`inline-flex items-center gap-2 border text-xs font-medium px-3 py-1.5 rounded-full ${pill}`}>
                    <span aria-hidden className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                    {text}
                  </p>
                ))}
              </div>

              <h1 className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-foreground leading-[1.1] mb-6">
                Money talks loudest
                <br />
                <span className="text-fan">
                  when it&apos;s <span className="ap-sketch-u" style={fanRole}>in your pocket.</span>
                </span>
              </h1>

              <p className="text-xl text-muted max-w-xl leading-relaxed mb-10">
                Fans pool money on specific requests aimed at creators and public entities.
                Nobody&apos;s card is charged until the thing is delivered and Council-approved —
                back out anytime before then. No risk while you wait.{' '}
                <span className="text-foreground">A wish, multiplied, becomes an offer no one can ignore.</span>
              </p>

              <div className="flex flex-wrap gap-4 mb-6">
                <Link href="/bounties" className={pressBtn}>Browse bounties</Link>
                <Link href="/search" className={pressBtnSecondary}>Explore creators</Link>
              </div>
              <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
                Not sure what any of this is? → How it works
              </a>
            </div>

            {/* The product object, shown instead of described. */}
            <BountyGrowthDemo />
          </div>
        </div>
      </section>

      {/* ── The psychology ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-7 py-24">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <p className={`${microLabel} mb-3`}>the psychology</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-snug mb-5">
              A bounty doesn&apos;t pressure anyone.
              <br />It just sits there, growing,
              <br /><span className="ap-sketch-u" style={fanRole}>being very visible.</span>
            </h2>
            <p className="text-lg text-muted">
              The demand was already there. We gave it a number.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <SpotCard spotColor="var(--color-muted)" className="border-border bg-background p-7">
              <p className={`${microLabel} mb-4`}>the way it usually works</p>
              <p className="text-muted leading-relaxed">
                You leave a comment. You quote-tweet. You ask nicely. You get ignored, or you
                get a &lsquo;soon.&rsquo; The moment passes. The thing never gets made.
              </p>
            </SpotCard>

            <SpotCard spotColor="var(--color-fan)" className="border-fan/30 bg-background p-7">
              <p className="font-mono text-[10px] uppercase tracking-[2px] text-fan mb-4">the way we work</p>
              <p className="text-foreground leading-relaxed">
                You and 200 strangers who have extremely similar taste put money in a bounty.
                The bounty becomes impossible to ignore. Some people only show up when the
                price is right.
              </p>
            </SpotCard>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <p className={`${microLabel} mb-3`}>the mechanics</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">How it works</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, chip, spot, title, description }) => (
              <SpotCard key={step} spotColor={spot} className="border-border bg-surface p-6">
                <div className={`w-12 h-12 rounded-md font-mono font-bold text-lg flex items-center justify-center shadow-[3px_3px_0_#000] text-brand-dark mb-5 ${chip}`}>
                  {step}
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">{title}</h3>
                <p className="text-base text-muted leading-relaxed">{description}</p>
              </SpotCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who's in the room ─────────────────────────────────────────────── */}
      <section id="roles" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <p className={`${microLabel} mb-3`}>the cast</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
            Who&apos;s in the room where it happens?
          </h2>
          <p className="text-muted mb-12">Three kinds of people. You&apos;re probably one of them.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {ROLES.map(({ name, badge, tone, spot, skin, dot, text, body }) => (
              <SpotCard key={name} spotColor={spot} className={`${skin} p-6`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span aria-hidden className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
                    <h3 className={`font-display font-bold text-2xl ${text}`}>{name}</h3>
                  </div>
                  <Badge tone={tone} className="shrink-0">{badge}</Badge>
                </div>
                <p className="text-base text-muted leading-relaxed">{body}</p>
              </SpotCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── The money ─────────────────────────────────────────────────────── */}
      <section id="the-money" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <div className="max-w-3xl mb-12">
            <p className={`${microLabel} mb-3`}>follow the money</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">The technical part</h2>
            <p className="text-muted leading-relaxed">
              We know how crowdfunding usually goes. You pay, you wait, you get a link to a
              Discord. Here, your card isn&apos;t charged until the work is DONE. The Council
              verifies completion before any money moves.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GUARANTEES.map(({ title, detail }) => (
              <div key={title} className="rounded-xl border border-border bg-surface p-5">
                <p className="font-semibold text-foreground mb-2">
                  <span aria-hidden className="text-fan mr-2">✓</span>
                  {title}
                </p>
                <p className="text-sm text-muted leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>

          <div id="lifecycle" className="mt-14 rounded-xl border border-border bg-surface p-6 sm:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-10">
              <h3 className="font-display font-bold text-2xl text-foreground">A bounty&apos;s life</h3>
              <p className={microLabel}>six stops · color = who acts</p>
            </div>
            <LifecycleRail />
          </div>
        </div>
      </section>

      {/* ── The fine print ────────────────────────────────────────────────── */}
      <section id="fine-print" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <div className="max-w-3xl mb-12">
            <p className={`${microLabel} mb-3`}>no surprises</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">The fine print</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            <div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">For the record</h3>
              <p className="text-base text-muted leading-relaxed mb-3">
                I don&apos;t have a content policy that quietly updates on a Friday night. I don&apos;t
                decide what&apos;s worth making. You and your fans do. That&apos;s the whole thing.
              </p>
              <p className="text-base text-muted leading-relaxed">
                There are obvious limits — illegal is illegal — but the platform doesn&apos;t have
                opinions about art.
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">A note on where I&apos;m at</h3>
              <p className="text-base text-muted leading-relaxed mb-3">
                Right now, Artypot only supports <span className="text-foreground">credit card payments</span>,
                and payouts can only go to creators who are <span className="text-foreground">based in the
                United States</span>. That&apos;s not a vision statement — it&apos;s just where the legal
                paperwork is currently in order.
              </p>
              <p className="text-base text-muted leading-relaxed">
                I&apos;m working on it. The goal is eventually worldwide. For now: if you&apos;re a fan
                anywhere in the world, you can still back bounties. If you&apos;re the one getting paid,
                you&apos;ll need a US bank account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured bounties ─────────────────────────────────────────────── */}
      <FeaturedBountiesSection />

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative border-t border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 bottom-0 h-[300px] w-[700px] max-w-[140vw] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,217,102,0.08) 0%, transparent 65%)' }}
          />
        </div>

        <div className="max-w-3xl mx-auto px-7 py-24 text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-tight mb-4">
            There&apos;s probably already a bounty
            <br />for something you want.
          </h2>
          <p className="text-muted text-lg mb-9">
            Go look. If there isn&apos;t one yet, you know what to do.
          </p>
          <Link href="/bounties" className={`${pressBtn} px-8`}>
            Browse open bounties
          </Link>
          <Link
            href="/bounties/new"
            className="block text-sm text-muted hover:text-foreground transition-colors mt-5"
          >
            or start a bounty yourself →
          </Link>
        </div>
      </section>

    </div>
  );
}
