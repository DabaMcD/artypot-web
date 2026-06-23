'use client';

// ─────────────────────────────────────────────────────────────────────────────
// BadAppleTakeover — the easter egg's primary delivery.
//
// Backing a certain bounty (see maybeFireBadApple) hands the baton to
// openBadAppleTakeover(), which mounts a full-viewport overlay: the page fades
// to ink, a monospace block of the site's own words rises from the bottom with
// the Bad Apple!! shadow-art video playing ON the characters, and when the song
// ends the block ascends out the top and the original page is revealed — exactly
// as it was, because the real DOM is never touched (the overlay only moves its
// own transforms). Esc / a persistent Skip / the browser Back button all exit
// through the same graceful ascend.
//
// The render engine is the shared, framework-agnostic /public/bad-apple/engine.js
// (window.BadApple) — also used by the standalone /bad-apple dev route.
// ─────────────────────────────────────────────────────────────────────────────

import { createRoot, type Root } from 'react-dom/client';
import { useCallback, useEffect, useRef, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { BadApple?: { create: (el: HTMLElement, opts: any) => any } }
}

let active = false;
let mountEl: HTMLDivElement | null = null;
let root: Root | null = null;
const launched = new Set<string>();

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function loadEngine(): Promise<Window['BadApple'] | null> {
  return new Promise((resolve) => {
    if (window.BadApple) return resolve(window.BadApple);
    const prior = document.querySelector('script[data-bad-apple-engine]') as HTMLScriptElement | null;
    if (prior) { prior.addEventListener('load', () => resolve(window.BadApple ?? null)); prior.addEventListener('error', () => resolve(null)); return; }
    const s = document.createElement('script');
    s.src = '/bad-apple/engine.js'; s.async = true; s.dataset.badAppleEngine = '1';
    s.onload = () => resolve(window.BadApple ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

/**
 * Launch the takeover. `key` (e.g. the backing/payment-intent id) de-dupes so
 * webhook echoes, StrictMode double-effects, or rapid re-clicks can't double-fire.
 * No-ops for reduced-motion users (a surprise full-screen scroll is vestibular
 * harm) — they keep the discoverable /bad-apple route instead.
 */
export function openBadAppleTakeover(key?: string, force?: boolean): void {
  if (active) return;
  if (!force && prefersReducedMotion()) return;
  if (key) { if (launched.has(key)) return; launched.add(key); }
  active = true;
  mountEl = document.createElement('div');
  mountEl.setAttribute('data-bad-apple-takeover', '');
  document.body.appendChild(mountEl);
  root = createRoot(mountEl);
  root.render(<Takeover onClose={teardown} />);
}

function teardown(): void {
  if (root) { try { root.unmount(); } catch { /* noop */ } }
  if (mountEl && mountEl.parentNode) mountEl.parentNode.removeChild(mountEl);
  root = null; mountEl = null; active = false;
}

type Phase = 'descend' | 'play' | 'ascend';

function Takeover({ onClose }: { onClose: () => void }) {
  const blockRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<any>(null);
  const exitingRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('descend');
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(false);

  const exit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setPhase('ascend');
    window.setTimeout(() => { try { ctrlRef.current?.destroy(); } catch { /* noop */ } onClose(); }, 1050);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    // Browser Back exits — push a throwaway history entry, pop on close.
    let pushed = false;
    try { history.pushState({ badApple: true }, ''); pushed = true; } catch { /* noop */ }
    const onPop = () => exit();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); exit(); } };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey, true);

    // descend transition (block 100% → 0); setTimeout (not rAF) so it still
    // fires if the tab is briefly backgrounded during the takeover.
    const enterT = window.setTimeout(() => { if (!cancelled) setEntered(true); }, 40);

    loadEngine().then((BA) => {
      if (cancelled || !blockRef.current || !BA) { if (!BA) exit(); return; }
      const ctrl = BA.create(blockRef.current, {
        loop: false,
        onEnd: () => exit(),
        onMuted: () => setMuted(true),
      });
      ctrlRef.current = ctrl;
      const startWhenReady = () => {
        if (cancelled) return;
        if (ctrl.ready) {
          ctrl.start();
          window.setTimeout(() => { if (!cancelled) setPhase('play'); }, 60);
        } else { window.setTimeout(startWhenReady, 60); }
      };
      startWhenReady();
    });

    return () => {
      cancelled = true;
      clearTimeout(enterT);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey, true);
      // consume our history entry if it's still on the stack
      try { if (pushed && window.history.state && (window.history.state as any).badApple) window.history.back(); } catch { /* noop */ }
    };
  }, [exit]);

  const veilOpacity = phase === 'ascend' ? 0 : entered ? 1 : 0;
  const blockY = phase === 'ascend' ? '-100%' : entered ? '0%' : '100%';
  const ease = phase === 'ascend' ? 'cubic-bezier(.7,0,.84,0)' : 'cubic-bezier(.16,1,.3,1)';

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483600, overflow: 'hidden',
        background: '#0F0E0D', opacity: veilOpacity,
        transition: 'opacity ' + (phase === 'ascend' ? '1s' : '0.9s') + ' ease',
      }}
    >
      <div
        ref={blockRef}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          transform: 'translateY(' + blockY + ')',
          transition: 'transform ' + (phase === 'ascend' ? '1s' : '0.95s') + ' ' + ease,
          willChange: 'transform',
        }}
      />
      <button
        onClick={exit}
        style={{
          position: 'absolute', top: 16, right: 18, zIndex: 2,
          font: '500 12px "DM Mono", ui-monospace, monospace', letterSpacing: '1px',
          color: '#BFB0A9', background: 'rgba(0,0,0,.35)', border: '1px solid #332F2B',
          borderRadius: 6, padding: '5px 10px', cursor: 'pointer', opacity: 0.5,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.5'; }}
      >
        skip ✕
      </button>
      {muted && (
        <button
          onClick={() => { try { ctrlRef.current?.unmute(); } catch { /* noop */ } setMuted(false); }}
          style={{
            position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
            font: '500 13px "DM Mono", ui-monospace, monospace', letterSpacing: '1px',
            color: '#0F0E0D', background: '#ffd966', border: '1px solid #ffd966',
            borderRadius: 8, padding: '8px 14px', cursor: 'pointer', boxShadow: '3px 3px 0 #000',
          }}
        >
          🔊 tap for sound
        </button>
      )}
    </div>
  );
}
