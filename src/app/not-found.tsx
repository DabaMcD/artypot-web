import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Server component on purpose — keeps it dependency-free and avoids the
// "require is not defined" Next default-404 fallback that triggers when a
// nested client layout (e.g. /c/layout.tsx) is mid-render at miss time.

// Picked fresh on every request (server component — runs on the server,
// HTML ships with one quip, no client re-render so no hydration mismatch).
const QUIPS = [
  'No bounty here. Yet.',
  'This URL is unclaimed. Try a real one?',
  'You’ve found the void. It’s pretty quiet.',
  'Nothing to pledge to on this page.',
  'Even the search creators couldn’t find this.',
  'Either you typo’d this, or we did. Probably us.',
  '404: page missed its delivery deadline.',
  'This page got revoked.',
  'Off-platform. Off-grid. Off-page.',
] as const;

export default function NotFound() {
  const quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-[520px] w-full text-center">
        {/* Giant glyph instead of the literal "404" */}
        <div
          className="font-display text-[140px] sm:text-[180px] leading-none font-bold text-fan select-none mb-4"
          aria-hidden="true"
        >
          ◇
        </div>

        <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-3 inline-block">
          error · 404
        </div>

        <h1 className="font-display font-bold text-[36px] sm:text-[44px] text-foreground leading-tight mb-3">
          this page doesn&apos;t exist.
        </h1>

        <p className="text-muted text-base sm:text-lg mb-8 leading-relaxed">
          {quip}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="primary">← Back to safety</Button>
          </Link>
          <Link href="/bounties/new">
            <Button variant="default">Start a bounty for it</Button>
          </Link>
        </div>

        {/* Cute audit footer */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted/60 mt-10">
          pledged: 0 · supporters: 0 · status: missing
        </p>
      </div>
    </div>
  );
}
