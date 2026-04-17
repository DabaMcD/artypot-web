'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ConfirmState = 'loading' | 'confirmed' | 'error';

function EmailChangeConfirmContent() {
  const params = useParams<{ id: string; hash: string }>();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [state, setState] = useState<ConfirmState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const id        = params.id        ?? '';
  const hash      = params.hash      ?? '';
  const expires   = searchParams.get('expires')   ?? '';
  const signature = searchParams.get('signature') ?? '';

  useEffect(() => {
    if (!id || !hash || !expires || !signature) {
      setState('error');
      setErrorMsg('This confirmation link is invalid or incomplete.');
      return;
    }

    authApi
      .confirmEmailChange(id, hash, expires, signature)
      .then(() => {
        setState('confirmed');
        refreshUser().catch(() => {});
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setState('error');
        setErrorMsg(e.message ?? 'This confirmation link is invalid or has expired.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">

        {state === 'loading' && (
          <>
            <div className="w-10 h-10 rounded-full border-2 border-fan border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium">Confirming your new email…</p>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-foreground mb-2">Email address updated</h1>
            <p className="text-sm text-muted mb-6">Your email has been changed successfully.</p>
            <Link
              href="/settings"
              className="inline-block bg-fan text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-fan-dim transition-colors"
            >
              Go to settings
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-foreground mb-2">Confirmation failed</h1>
            <p className="text-sm text-muted mb-6">{errorMsg}</p>
            <Link
              href="/settings"
              className="inline-block bg-surface-2 border border-border text-foreground font-medium px-6 py-2.5 rounded-lg text-sm hover:border-foreground/30 transition-colors"
            >
              Back to settings
            </Link>
          </>
        )}

      </div>
    </div>
  );
}

export default function EmailChangeConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-fan border-t-transparent animate-spin" />
        </div>
      }
    >
      <EmailChangeConfirmContent />
    </Suspense>
  );
}
