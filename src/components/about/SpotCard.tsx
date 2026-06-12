'use client';

import type { CSSProperties, ReactNode } from 'react';
import { trackSpotlight } from '@/lib/spotlight';

interface SpotCardProps {
  /** CSS color the spotlight takes on hover, e.g. 'var(--color-creator)'. */
  spotColor?: string;
  /** Caller owns the skin: background, border color, padding, rotation… */
  className?: string;
  children: ReactNode;
}

/**
 * Static content card with the cursor-tracking spotlight treatment from
 * BountyCard: a colored hot spot on the border ring plus a faint interior
 * glow, both following the pointer (see .ap-spot-* in globals.css). Pass a
 * role color so each card glows its own hue.
 */
export default function SpotCard({
  spotColor = 'var(--color-fan)',
  className = '',
  children,
}: SpotCardProps) {
  return (
    <div
      onMouseMove={trackSpotlight}
      style={{ '--spot-color': spotColor } as CSSProperties}
      className={`relative group rounded-xl border transition-transform duration-150 hover:-translate-y-0.5 ${className}`}
    >
      <span aria-hidden className="ap-spot-ring opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <span aria-hidden className="ap-spot-glow opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      {children}
    </div>
  );
}
