'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { pickPreferredLocale } from '@/lib/preferred-locale';
import { auth as authApi } from '@/lib/api';
import { nextTarget, readNextFromLocation, withNext, OAUTH_NEXT_KEY } from '@/lib/next-redirect';
import { PLATFORM_FEE_PCT, PHONE_SIGNUP_ENABLED, PAYOUT_MINIMUM_AUTOMATED } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, FieldLabel } from '@/components/ui/Input';
import { BrandIcon } from '@/components/ui/BrandIcon';
import PhoneNumberInput, { isValidPhoneNumber, type E164Number } from '@/components/PhoneNumberInput';

/** All OAuth providers the backend supports, in preferred display order. */
const ALL_PROVIDERS = [
  { id: 'google',    label: 'Google' },
  { id: 'github',    label: 'GitHub' },
  { id: 'discord',   label: 'Discord' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok',    label: 'TikTok' },
  { id: 'kick',      label: 'Kick' },
  { id: 'twitch',    label: 'Twitch' },
  { id: 'twitter',   label: 'Twitter / X' },
  { id: 'facebook',  label: 'Facebook' },
] as const;

const _enabledSet = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS
  ? new Set(process.env.NEXT_PUBLIC_OAUTH_PROVIDERS.split(',').map((s) => s.trim()).filter(Boolean))
  : null;

const PROVIDERS = _enabledSet
  ? ALL_PROVIDERS.filter((p) => _enabledSet.has(p.id))
  : ALL_PROVIDERS;

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const currentLocale = useLocale();
  const t = useTranslations('Login');

  type IdentifierMode = 'email' | 'phone';
  const [mode, setMode] = useState<IdentifierMode>('email');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState<E164Number | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  // Two-factor step: shown after correct credentials when the account has 2FA.
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      const loc = pickPreferredLocale(user, currentLocale);
      router.replace(nextTarget(readNextFromLocation()), loc ? { locale: loc } : undefined);
    }
  }, [authLoading, user, router, currentLocale]);

  if (authLoading || user) return null;

  const switchMode = (next: IdentifierMode) => {
    setMode(next);
    setError('');
  };

  const identifierReady =
    mode === 'email'
      ? emailInput.trim().length > 0
      : phoneInput != null && isValidPhoneNumber(phoneInput);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (twoFactorStep ? !code.trim() : !identifierReady) return;
    setError('');
    setLoading(true);
    const identifier = mode === 'email' ? emailInput.trim() : (phoneInput ?? '');
    try {
      // The user-watching effect above handles the post-login redirect and
      // applies the stored preferred-locale switch, so we don't navigate here.
      const result = await login(identifier, password, twoFactorStep ? code.trim() : undefined);
      if (result.twoFactorRequired) {
        // Credentials are valid; reveal the code step and wait for the user.
        setTwoFactorStep(true);
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      setError(e.message ?? t('errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const cancelTwoFactor = () => {
    setTwoFactorStep(false);
    setCode('');
    setError('');
  };

  const handleOAuth = async (provider: string) => {
    setError('');
    setOauthLoading(provider);
    try {
      // Generate and store a nonce so the callback page can verify this flow
      // was initiated from this browser, preventing token injection attacks.
      const nonce = crypto.randomUUID();
      sessionStorage.setItem('oauth_nonce', nonce);
      // Carry `next` across the provider round-trip so the callback can return
      // the user to where they started instead of /dashboard.
      const next = readNextFromLocation();
      if (next) sessionStorage.setItem(OAUTH_NEXT_KEY, next);
      else sessionStorage.removeItem(OAUTH_NEXT_KEY);
      const { url } = await authApi.oauthRedirect(provider);
      window.location.href = url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? t('errors.oauthFailed'));
      setOauthLoading(null);
    }
  };

  const anyLoading = loading || oauthLoading !== null;

  return (
    <div data-role="auth" className="min-h-screen grid md:grid-cols-2">
      {/* Left — marketing */}
      <div className="hidden md:flex flex-col justify-center px-14 py-16 bg-surface border-r border-border">
        <Link href="/">
          <Image
            src="/artypot-logo-transparent-dark.png"
            alt="Artypot"
            width={1024}
            height={269}
            className="h-9 w-auto mb-10"
          />
        </Link>

        <h1 className="font-display font-bold text-[54px] leading-[1.05] tracking-tight text-foreground mb-5">
          {t.rich('hero.title', {
            accent: (chunks) => <span className="ap-sketch-u text-fan">{chunks}</span>,
          })}
        </h1>
        <p className="text-[17px] text-muted max-w-[460px] leading-relaxed mb-10">
          {t('hero.subtitle')}
        </p>

        <div className="flex gap-8 max-w-[460px]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('stats.charged.label')}</div>
            <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">{t('stats.charged.value')}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-1">{t('stats.charged.note')}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('stats.creatorsKeep.label')}</div>
            <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">{100 - PLATFORM_FEE_PCT}%</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-1">{t('stats.creatorsKeep.note')}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('stats.payouts.label')}</div>
            <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">${PAYOUT_MINIMUM_AUTOMATED} min</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-1">{t('stats.payouts.note')}</div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-col justify-center px-8 md:px-14 py-14 max-w-[520px] mx-auto w-full">
        {/* Mobile logo */}
        <Link href="/" className="md:hidden mb-8">
          <Image
            src="/artypot-logo-transparent-dark.png"
            alt="Artypot"
            width={1024}
            height={269}
            className="h-8 w-auto"
          />
        </Link>

        <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-2">{t('sectionLabel')}</div>
        <h2 className="font-display font-bold text-[30px] text-foreground mb-6">{twoFactorStep ? t('twoFactor.heading') : t('heading')}</h2>

        {!twoFactorStep && (
          <>
            {/* OAuth */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {PROVIDERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  disabled={anyLoading}
                  onClick={() => handleOAuth(id)}
                  className="flex items-center justify-center gap-1.5 border border-border bg-surface rounded py-2 px-3 font-mono text-xs text-muted hover:bg-surface-2 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {oauthLoading === id
                    ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin shrink-0" />
                    : <BrandIcon slug={id} className="w-3.5 h-3.5 shrink-0" />}
                  {oauthLoading === id ? t('oauth.redirecting') : label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('divider')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Email / Phone toggle — hidden while phone-only signup is in beta */}
            {PHONE_SIGNUP_ENABLED && (
              <div className="flex rounded-lg border border-border overflow-hidden mb-5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => switchMode('email')}
                  className={`flex-1 py-2 transition-colors ${
                    mode === 'email' ? 'bg-surface-2 text-foreground' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {t('modeToggle.email')}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('phone')}
                  className={`flex-1 py-2 border-l border-border transition-colors ${
                    mode === 'phone' ? 'bg-surface-2 text-foreground' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {t('modeToggle.phone')}
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-bad-soft border border-bad text-bad text-sm rounded px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!twoFactorStep ? (
            <>
              {/* Identifier field */}
              {mode === 'email' ? (
                <div>
                  <FieldLabel>{t('fields.email.label')}</FieldLabel>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={t('fields.email.placeholder')}
                  />
                </div>
              ) : (
                <div>
                  <FieldLabel>{t('fields.phone.label')}</FieldLabel>
                  <PhoneNumberInput
                    value={phoneInput}
                    onChange={setPhoneInput}
                    disabled={anyLoading}
                  />
                </div>
              )}

              <div>
                <FieldLabel>{t('fields.password.label')}</FieldLabel>
                <PasswordInput
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="ap-inline-link text-sm">{t('forgotPassword')}</Link>
              </div>
            </>
          ) : (
            <>
              {/* Two-factor code step */}
              <p className="text-sm text-muted">{t('twoFactor.blurb')}</p>
              <div>
                <FieldLabel>{t('twoFactor.codeLabel')}</FieldLabel>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('twoFactor.codePlaceholder')}
                />
                <p className="text-xs text-muted mt-2">{t('twoFactor.recoveryHint')}</p>
              </div>
              <button type="button" onClick={cancelTwoFactor} className="ap-inline-link text-sm">
                {t('twoFactor.back')}
              </button>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center mt-2"
            disabled={anyLoading || (twoFactorStep ? !code.trim() : (!identifierReady || !password))}
          >
            {loading
              ? t('submit.loading')
              : (twoFactorStep ? t('twoFactor.submit') : t('submit.label'))}
          </Button>
        </form>

        {!twoFactorStep && (
          <>
            <div className="border-t border-dashed border-border my-5" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted text-center mb-3">{t('register.prompt')}</div>
            <Button
              variant="default"
              className="w-full justify-center"
              onClick={() => router.push(withNext('/register'))}
            >
              {t('register.cta')}
            </Button>

            <p className="text-sm text-muted mt-5 pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-fan">
              {t('register.creatorNote')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
