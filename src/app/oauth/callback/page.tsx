'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { setToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const err   = searchParams.get('error');

    if (token) {
      setToken(token);
      refreshUser()
        .then(() => router.replace('/dashboard'))
        .catch(() => setError('Failed to load your account. Please try logging in again.'));
    } else {
      const messages: Record<string, string> = {
        invalid_state:        'The sign-in request expired or was tampered with. Please try again.',
        invalid_provider:     'Unknown sign-in provider.',
        authentication_failed:'The provider could not complete authentication. Please try again.',
        account_error:        'There was a problem setting up your account. Please try again.',
      };
      setError(messages[err ?? ''] ?? 'Sign-in failed. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-foreground mb-2">Sign-in failed</h1>
          <p className="text-sm text-muted mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-fan text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-fan border-t-transparent animate-spin" />
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-fan border-t-transparent animate-spin" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
