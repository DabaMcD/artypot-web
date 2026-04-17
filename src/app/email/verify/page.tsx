'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

type VerifyState = 'loading' | 'verified' | 'already_verified' | 'expired';

// ── Inner component (needs Suspense boundary for useSearchParams) ───────────
function EmailVerifyContent() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<VerifyState>('loading');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const id        = searchParams.get('id')        ?? '';
  const hash      = searchParams.get('hash')      ?? '';
  const expires   = searchParams.get('expires')   ?? '';
  const signature = searchParams.get('signature') ?? '';

  useEffect(() => {
    if (!id || !hash || !expires || !signature) {
      setState('expired');
      return;
    }

    authApi
      .verifyEmail(id, hash, expires, signature)
      .then(({ message }) => {
        if (message.toLowerCase().includes('already')) {
          setState('already_verified');
        } else {
          setState('verified');
          // Best-effort refresh so email_verified_at propagates to the auth context
          refreshUser().catch(() => {});
        }
      })
      .catch(() => {
        setState('expired');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendVerification();
      setResent(true);
      toast('Verification email sent! Check your inbox.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to send verification email.', 'error');
    } finally {
      setResending(false);
    }
  };

  // ── Shared footer shown on success ─────────────────────────────────────
  const successFooter = (
    <div className="mt-6 text-center">
      <p className="text-sm text-muted">You can close this tab</p>
      <p className="text-xs text-muted/60 my-2">or</p>
      <Link
        href="/dashboard"
        className="inline-block bg-fan text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-fan-dim transition-colors"
      >
        Continue to dashboard
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">

        {/* Loading */}
        {state === 'loading' && (
          <>
            <div className="w-10 h-10 rounded-full border-2 border-fan border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium">Verifying your email…</p>
          </>
        )}

        {/* Newly verified */}
        {state === 'verified' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-foreground">Email successfully verified</h1>
            {successFooter}
          </>
        )}

        {/* Already verified */}
        {state === 'already_verified' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-foreground">Email already verified</h1>
            {successFooter}
          </>
        )}

        {/* Expired / invalid */}
        {state === 'expired' && (
          <>
            <div className="text-4xl mb-4">⏱️</div>
            <h1 className="text-xl font-bold text-foreground">Verification link expired</h1>
            {user && (
              <div className="mt-6">
                {resent ? (
                  <p className="text-sm text-green-400 font-medium">Email sent ✓ — check your inbox.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="bg-fan text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-fan-dim disabled:opacity-50 transition-colors"
                  >
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ── Page wrapper with Suspense (required for useSearchParams in App Router) ─
export default function EmailVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-fan border-t-transparent animate-spin" />
        </div>
      }
    >
      <EmailVerifyContent />
    </Suspense>
  );
}
