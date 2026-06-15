import type { MouseEvent } from 'react';

/**
 * onMouseMove handler for cards carrying .ap-spot-ring / .ap-spot-glow
 * overlays (see globals.css). Writes the pointer position, in element-local
 * pixels, to the CSS vars the overlay gradients read — so the "hot spot"
 * follows the cursor. Styles are written straight to the DOM, bypassing
 * React state: tracking never triggers a re-render.
 */
export function trackSpotlight(e: MouseEvent<HTMLElement>): void {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
  el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
}
