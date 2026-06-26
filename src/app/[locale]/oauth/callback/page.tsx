'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { setToken, auth as authApi } from '@/lib/api';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { pickPreferredLocale } from '@/lib/preferred-locale';
import { nextTarget, OAUTH_NEXT_KEY, OAUTH_VERIFY_KEY } from '@/lib/next-redirect';

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

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const currentLocale = useLocale();
  const t = useTranslations('OAuthCallback');
  const th = useTranslations('HandlesSection'); // verifyResult.* live here
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The provider now redirects the browser to THIS frontend page with the
    // authorization code + state (or an error if the user denied). We finish the
    // flow by POSTing {code,state} to the API — which, being an authenticated
    // fetch, carries the user's token so the backend knows the real account.
    const code    = searchParams.get('code');
    const state   = searchParams.get('state');
    const provErr = searchParams.get('error'); // provider-side denial / failure
    // Set by the handles-page modal: presence ⇒ this round-trip was a handle
    // verify (not a login); value ⇒ the handle, for the result message.
    const verifyHandle = sessionStorage.getItem(OAUTH_VERIFY_KEY);

    const clearFlow = () => {
      sessionStorage.removeItem(OAUTH_NEXT_KEY);
      sessionStorage.removeItem(OAUTH_VERIFY_KEY);
      sessionStorage.removeItem('oauth_nonce');
    };

    // Toast the verify outcome from HERE. The ToastProvider lives in the locale
    // layout, so the toast survives the SPA redirect below and shows reliably no
    // matter where the user lands — the old approach stashed the result for the
    // destination page to toast, which silently dropped it whenever that page
    // didn't mount HandlesSection (onboarding bounce, re-mount race, etc.).
    const toastVerifyResult = (result: string) => {
      const at = verifyHandle ? `@${verifyHandle}` : th('verifyResult.yourHandle');
      switch (result) {
        case 'verified':  toast(th('verifyResult.verified', { at }), 'success'); break;
        case 'not_found': toast(th('verifyResult.notFound', { at }), 'error'); break;
        case 'failed':    toast(th('verifyResult.failed', { at }), 'error'); break;
        default:          toast(th('verifyResult.unknown', { at }), 'error');
      }
    };

    // A handle-verify failure returns the user to where they started with a
    // "couldn't connect" toast rather than the login-error screen.
    const failVerify = () => {
      toastVerifyResult('failed');
      const dest = nextTarget(sessionStorage.getItem(OAUTH_NEXT_KEY));
      clearFlow();
      router.replace(dest);
    };

    // A login/registration failure shows the error screen.
    const failLogin = (reason: string | null, providerSlug?: string) => {
      clearFlow();
      if (reason === 'provider_not_configured') {
        const label = PLATFORM_LABELS[providerSlug ?? ''] ?? (providerSlug
          ? providerSlug.charAt(0).toUpperCase() + providerSlug.slice(1)
          : t('fallbackProvider'));
        setError(t('errorProviderNotConfigured', { provider: label }));
        return;
      }
      const messages: Record<string, string> = {
        invalid_state:          t('errorInvalidState'),
        invalid_provider:       t('errorInvalidProvider'),
        authentication_failed:  t('errorAuthenticationFailed'),
        account_error:          t('errorAccountError'),
      };
      setError(messages[reason ?? ''] ?? t('errorGeneric'));
    };

    const fail = (reason: string | null, providerSlug?: string) =>
      verifyHandle ? failVerify() : failLogin(reason, providerSlug);

    // Provider denied, or we didn't get the code/state we need to continue.
    if (provErr || !code || !state) {
      fail(provErr ?? 'authentication_failed');
      return;
    }

    // Nonce: this callback must have been initiated from this browser tab —
    // guards against a crafted /oauth/callback URL completing an unsolicited flow.
    const nonce = sessionStorage.getItem('oauth_nonce');
    if (!nonce) {
      clearFlow();
      router.replace('/login?error=invalid_oauth_state');
      return;
    }
    sessionStorage.removeItem('oauth_nonce');

    authApi.oauthComplete({ code, state })
      .then((res) => {
        // Verify flow: toast the outcome now (persists across the redirect).
        if (verifyHandle) {
          toastVerifyResult(res.verify ?? 'verified');
          sessionStorage.removeItem(OAUTH_VERIFY_KEY);
        }

        const dest = nextTarget(sessionStorage.getItem(OAUTH_NEXT_KEY));
        sessionStorage.removeItem(OAUTH_NEXT_KEY);

        // A login/registration returns a fresh token; a logged-in verifier keeps
        // their existing session. Either way refresh the user (verification may
        // have changed their creator status) and continue.
        if (res.token) setToken(res.token);
        refreshUser()
          .then((u) => {
            const loc = pickPreferredLocale(u, currentLocale);
            router.replace(dest, loc ? { locale: loc } : undefined);
          })
          .catch(() => setError(t('errorAccountLoad')));
      })
      .catch((e: { reason?: string; data?: { provider?: string } }) => {
        fail(e?.reason ?? 'account_error', e?.data?.provider);
      });
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
