'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/api';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { pickPreferredLocale } from '@/lib/preferred-locale';
import { nextTarget, OAUTH_NEXT_KEY, OAUTH_VERIFY_KEY, OAUTH_VERIFY_RESULT_KEY } from '@/lib/next-redirect';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const currentLocale = useLocale();
  const t = useTranslations('OAuthCallback');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const err   = searchParams.get('error');
    // Verification outcome echoed by the backend on the success redirect.
    const verify = searchParams.get('verify');
    // Set by the handles-page modal: presence ⇒ this was a handle-verify flow
    // (not a login); value ⇒ the handle being verified (for the result message).
    const verifyHandle = sessionStorage.getItem(OAUTH_VERIFY_KEY);

    // Stash the verification outcome for the originating page to toast on return.
    const stashVerifyResult = (result: string) => {
      if (!verifyHandle) return;
      sessionStorage.setItem(
        OAUTH_VERIFY_RESULT_KEY,
        JSON.stringify({ handle: verifyHandle, result }),
      );
      sessionStorage.removeItem(OAUTH_VERIFY_KEY);
    };

    if (token) {
      // Nonce check: verify this callback was initiated from this browser session.
      // This prevents simple token injection attacks where an attacker crafts a
      // /oauth/callback?token=... URL. If the nonce is missing, the flow did not
      // originate from a legitimate handleOAuth call in this tab.
      const nonce = sessionStorage.getItem('oauth_nonce');
      if (!nonce) {
        sessionStorage.removeItem(OAUTH_NEXT_KEY);
        sessionStorage.removeItem(OAUTH_VERIFY_KEY);
        router.replace('/login?error=invalid_oauth_state');
        return;
      }
      sessionStorage.removeItem('oauth_nonce');

      // Where to land after auth: the `next` stashed when the flow was started
      // (sanitized again here as defence in depth), else /dashboard.
      const dest = nextTarget(sessionStorage.getItem(OAUTH_NEXT_KEY));
      sessionStorage.removeItem(OAUTH_NEXT_KEY);

      // Record the handle-verify outcome (backend result, or a neutral fallback).
      stashVerifyResult(verify ?? 'verified');

      setToken(token);
      refreshUser()
        .then((u) => {
          const loc = pickPreferredLocale(u, currentLocale);
          router.replace(dest, loc ? { locale: loc } : undefined);
        })
        .catch(() => setError(t('errorAccountLoad')));
      return;
    }

    // ── Error paths ──────────────────────────────────────────────────────────
    // For a handle-verification flow, send the user back to where they started
    // with a "couldn't connect" result instead of the login-error screen.
    if (verifyHandle) {
      stashVerifyResult('failed');
      const dest = nextTarget(sessionStorage.getItem(OAUTH_NEXT_KEY));
      sessionStorage.removeItem(OAUTH_NEXT_KEY);
      sessionStorage.removeItem('oauth_nonce');
      router.replace(dest);
      return;
    }

    if (err === 'provider_not_configured') {
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
      const label = PLATFORM_LABELS[slug] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : t('fallbackProvider'));
      setError(t('errorProviderNotConfigured', { provider: label }));
    } else {
      const messages: Record<string, string> = {
        invalid_state:        t('errorInvalidState'),
        invalid_provider:     t('errorInvalidProvider'),
        authentication_failed:t('errorAuthenticationFailed'),
        account_error:        t('errorAccountError'),
      };
      setError(messages[err ?? ''] ?? t('errorGeneric'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-foreground mb-2">{t('heading')}</h1>
          <p className="text-sm text-muted mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-fan text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            {t('backToLogin')}
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
