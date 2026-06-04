'use client';

import { useId, useRef, useState } from 'react';

interface InfoDotProps {
  /** Tooltip body — plain text or rich nodes. */
  children: React.ReactNode;
  /** Optional bold heading shown above the body. */
  heading?: string;
  className?: string;
}

const MARGIN = 8;       // viewport gutter
const MAX_WIDTH = 256;  // w-64

/**
 * Small "[i]" affordance that reveals an explanatory blurb on hover/focus.
 *
 * The panel is positioned with `position: fixed` from the trigger's measured
 * rect and clamped to the viewport, so it never clips or misaligns regardless of
 * where the icon sits (grid edges, near the left margin, mobile reflow, etc.).
 * It also opens instantly — unlike a native `title` tooltip.
 */
export function InfoDot({ children, heading, className = '' }: InfoDotProps) {
  const [tip, setTip] = useState<{ left: number; top: number; width: number; placement: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipId = useId();

  const show = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(MAX_WIDTH, vw - MARGIN * 2);
    // Centre on the trigger, then clamp horizontally to the viewport.
    const left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - width / 2, vw - width - MARGIN));
    // Prefer above; flip below when there isn't room near the top of the page.
    const placement: 'top' | 'bottom' = r.top > 200 ? 'top' : 'bottom';
    const top = placement === 'top' ? r.top : r.bottom;
    setTip({ left, top, width, placement });
  };
  const hide = () => setTip(null);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => { e.preventDefault(); tip ? hide() : show(); }}
        aria-label="More info"
        aria-describedby={tip ? tipId : undefined}
        className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-muted/40 text-muted text-[9px] font-mono leading-none cursor-help select-none align-middle hover:border-foreground hover:text-foreground focus:outline-none focus:border-foreground focus:text-foreground transition-colors ${className}`}
      >
        i
      </button>
      {tip && (
        <div
          id={tipId}
          role="tooltip"
          style={{
            position: 'fixed',
            left: tip.left,
            top: tip.top,
            width: tip.width,
            transform: tip.placement === 'top' ? 'translateY(calc(-100% - 8px))' : 'translateY(8px)',
          }}
          className="z-[100] pointer-events-none rounded-md border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted shadow-xl"
        >
          {heading && <p className="mb-1.5 font-semibold text-foreground">{heading}</p>}
          {children}
        </div>
      )}
    </>
  );
}
