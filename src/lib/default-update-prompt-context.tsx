'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Backend prompt payload returned by /v1/bounties POST and
 * /v1/bounties/{id}/back POST under `default_update_prompts`.
 *
 * Each key is independently nullable — a single backing event can fire one,
 * both, or neither prompt. The banner consumes them one at a time
 * (amount-first queue) so the user sees a single tidy prompt at a time.
 */
export type AmountPromptPayload = {
  proposed: number;
  current: number | null;
};

export type ExpiryPromptPayload = {
  proposed_value: number;
  proposed_unit: string;
  current_value: number | null;
  current_unit: string | null;
};

export type DefaultUpdatePrompts = {
  amount: AmountPromptPayload | null;
  expiry: ExpiryPromptPayload | null;
};

type ActivePrompt =
  | { kind: 'amount'; payload: AmountPromptPayload }
  | { kind: 'expiry'; payload: ExpiryPromptPayload };

interface DefaultUpdatePromptContextValue {
  /** The prompt currently visible in the banner (or null if dismissed). */
  current: ActivePrompt | null;
  /**
   * Drop a backend payload into the context. If both keys are populated, the
   * amount prompt shows first; once cleared, the expiry prompt takes its
   * place. If neither is populated, this is a no-op.
   */
  dispatch: (payload: DefaultUpdatePrompts | null | undefined) => void;
  /** Clear the active prompt — called by the banner's buttons and timer. */
  clear: () => void;
}

const Ctx = createContext<DefaultUpdatePromptContextValue | null>(null);

export function DefaultUpdatePromptProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ActivePrompt | null>(null);
  // The expiry prompt waits its turn behind an active amount prompt — the
  // banner only renders one thing at a time, so we queue the second prompt
  // and surface it when the first clears.
  const [queued, setQueued] = useState<ActivePrompt | null>(null);

  const dispatch = useCallback((payload: DefaultUpdatePrompts | null | undefined) => {
    if (!payload) return;
    const amount = payload.amount ? { kind: 'amount' as const, payload: payload.amount } : null;
    const expiry = payload.expiry ? { kind: 'expiry' as const, payload: payload.expiry } : null;

    if (amount && expiry) {
      setCurrent(amount);
      setQueued(expiry);
    } else if (amount) {
      setCurrent(amount);
    } else if (expiry) {
      setCurrent(expiry);
    }
  }, []);

  const clear = useCallback(() => {
    if (queued) {
      setCurrent(queued);
      setQueued(null);
    } else {
      setCurrent(null);
    }
  }, [queued]);

  return (
    <Ctx.Provider value={{ current, dispatch, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDefaultUpdatePrompt(): DefaultUpdatePromptContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDefaultUpdatePrompt must be used inside <DefaultUpdatePromptProvider>');
  return ctx;
}
