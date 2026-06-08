'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useDefaultUpdatePrompt } from '@/lib/default-update-prompt-context';
import { users as usersApi } from '@/lib/api';

const AUTO_DISMISS_MS = 8000;
const EXIT_ANIM_MS = 280;

function formatExpiry(value: number, unit: string): string {
  const plural = value === 1 ? unit : `${unit}s`;
  return `${value} ${plural}`;
}

/**
 * Transient banner mounted near PaymentGraceBanner — fires when the user just
 * submitted a backing whose amount or expiry hit two consecutive uses of the
 * same non-default value. Same visual tone as the existing nudge/grace bars,
 * plus a 3px draining strip along the bottom that depletes left-to-right
 * over AUTO_DISMISS_MS, then self-dismisses with a fade-and-collapse animation.
 *
 * Buttons don't reset the server-side tracker — the trigger is `count === 2`
 * exactly, so once the user has answered (or ignored) this prompt the same
 * value won't re-fire it.
 */
export function DefaultUpdatePromptBar() {
  const { current, clear } = useDefaultUpdatePrompt();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  // `closing` flips the banner's class from entry-anim to exit-anim. The
  // actual context.clear() is deferred by EXIT_ANIM_MS so the user sees the
  // collapse before the banner unmounts (or before a queued prompt slides in).
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whenever the active prompt swaps (e.g. amount prompt clears and the
  // queued expiry prompt takes over), reset `closing` so the new banner
  // mounts with the entry animation.
  useEffect(() => {
    if (current) setClosing(false);
  }, [current]);

  const beginDismiss = () => {
    setClosing(true);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      // Tearing down `current` and resetting `closing` together — React
      // batches both into a single render, so the next prompt (if queued)
      // mounts fresh with `closing=false` and gets its entry animation.
      clear();
      setClosing(false);
    }, EXIT_ANIM_MS);
  };

  // Auto-dismiss timer. Restarts whenever a new prompt arrives. Cancelled
  // when the user clicks either button (saving / closing both gate this off).
  useEffect(() => {
    if (!current || closing) return;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(beginDismiss, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // beginDismiss is defined inside the component but its identity doesn't
    // change in a way that matters here — re-running this effect when it
    // does is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, closing]);

  // Final cleanup on unmount.
  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  if (!current || !user) return null;

  const handleUpdate = async () => {
    if (saving || closing) return;
    setSaving(true);
    try {
      if (current.kind === 'amount') {
        await usersApi.update(user.id, { default_backing_amount: current.payload.proposed });
        await refreshUser();
        toast('Default backing amount saved.', 'success');
      } else {
        await usersApi.update(user.id, {
          default_expiry_value: current.payload.proposed_value,
          default_expiry_unit: current.payload.proposed_unit,
        });
        await refreshUser();
        toast('Default backing expiry saved.', 'success');
      }
      beginDismiss();
    } catch {
      toast('Could not update default. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Copy + button labels per variant. "Keep at $X" / "Keep at N units" just
  // dismisses — the tracker stays where it is on the server.
  let headline: string;
  let updateLabel: string;
  let keepLabel: string;

  if (current.kind === 'amount') {
    const proposed = current.payload.proposed.toFixed(2);
    headline = `Update default backing to $${proposed}?`;
    updateLabel = `Update to $${proposed}`;
    keepLabel = current.payload.current !== null
      ? `Keep at $${current.payload.current.toFixed(2)}`
      : 'Keep current';
  } else {
    const proposed = formatExpiry(current.payload.proposed_value, current.payload.proposed_unit);
    headline = `Update default expiry to ${proposed}?`;
    updateLabel = `Update to ${proposed}`;
    keepLabel = current.payload.current_value !== null && current.payload.current_unit !== null
      ? `Keep at ${formatExpiry(current.payload.current_value, current.payload.current_unit)}`
      : 'Keep current';
  }

  // Keying by the prompt's payload makes React remount the banner when the
  // queued prompt takes over, which restarts both the entry animation and
  // the drain bar from full.
  const promptKey = `${current.kind}-${JSON.stringify(current.payload)}`;

  return (
    <div
      key={promptKey}
      className={`relative overflow-hidden flex items-center gap-4 bg-warn-soft border border-warn text-foreground rounded-md px-5 py-4 mb-6 ${
        closing ? 'ap-anim-banner-out' : 'ap-anim-banner-in'
      }`}
    >
      <span className="shrink-0 w-6 h-6 rounded-full border-2 border-warn text-warn flex items-center justify-center text-xs font-black leading-none">?</span>
      <p className="flex-1 text-sm font-semibold">{headline}</p>
      <div className="shrink-0 flex items-center gap-4">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={saving || closing}
          className="text-sm font-semibold whitespace-nowrap hover:underline underline-offset-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : updateLabel}
        </button>
        <button
          type="button"
          onClick={beginDismiss}
          disabled={saving || closing}
          className="text-sm whitespace-nowrap text-foreground/60 hover:text-foreground/90 transition-colors disabled:opacity-50"
        >
          {keepLabel}
        </button>
      </div>

      {/* Draining timer strip — width animates 100% → 0 over AUTO_DISMISS_MS.
          Using the `animation` shorthand inline guarantees the duration
          actually applies (splitting class + inline animation-duration was
          unreliable: the duration silently defaulted to 0 and the bar
          snapped invisible on mount). Paused while the exit animation plays
          so the strip doesn't appear to keep counting after the banner
          starts to collapse. */}
      <span
        className="absolute bottom-0 left-0 h-[3px] bg-warn"
        style={{
          animation: `ap-drain ${AUTO_DISMISS_MS}ms linear forwards`,
          animationPlayState: closing ? 'paused' : 'running',
        }}
        aria-hidden
      />
    </div>
  );
}
