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
      // Nonce check: verify this callback was initiated from this browser session.
      // This prevents simple token injection attacks where an attacker crafts a
      // /oauth/callback?token=... URL. If the nonce is missing, the flow did not
      // originate from a legitimate handleOAuth call in this tab.
      const nonce = sessionStorage.getItem('oauth_nonce');
      if (!nonce) {
        router.replace('/login?error=invalid_oauth_state');
        return;
      }
      sessionStorage.removeItem('oauth_nonce');

      setToken(token);
      refreshUser()
        .then(() => router.replace('/dashboard'))
        .catch(() => setError('Failed to load your account. Please try logging in again.'));
    } else if (err === 'provider_not_configured') {
      // Backend dropped us back because credentials for this provider aren't
      // set up yet. Build a friendly message that names the platform.
      const PLATFORM_LABELS: Record<string, string> = {
        google:    'Google',
        github:    'GitHub',
        facebook:  'Facebook',
        discord:   'Discord',
        instagram: 'Instagram',
        kick:      'Kick',
        tiktok:    'TikTok',
        twitter:   'X / Twitter',
        twitch:    'Twitch',
      };
      const slug  = searchParams.get('provider') ?? '';
      const label = PLATFORM_LABELS[slug] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'that provider');
      setError(`Sign-in with ${label} isn't available right now — we're still setting it up. Sorry for the inconvenience!`);
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
