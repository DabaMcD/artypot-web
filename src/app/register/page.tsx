'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { auth as authApi, phone as phoneApi } from '@/lib/api';
import { PHONE_SIGNUP_ENABLED } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { Input, FieldLabel, FieldGrid2 } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';
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

// ── OTP verification step (shown inline after phone registration) ──────────────

function OtpStep({
  onVerified,
  onResend,
}: {
  onVerified: () => void;
  onResend: () => Promise<void>;
}) {
  const { refreshUser } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await phoneApi.verifyCode(otp);
      await refreshUser();
      onVerified();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Invalid code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await onResend();
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-2">verify phone</div>
      <h2 className="font-display font-bold text-[30px] text-foreground mb-2">Check your texts</h2>
      <p className="text-sm text-muted mb-6">
        We sent a 6-digit code to your phone number. Enter it below to finish creating your account.
      </p>

      {error && (
        <div className="bg-bad-soft border border-bad text-bad text-sm rounded px-4 py-3 mb-4">
          {error}
        </div>
      )}
      {resent && (
        <div className="bg-good-soft border border-good text-good text-sm rounded px-4 py-3 mb-4">
          New code sent.
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <FieldLabel>verification code</FieldLabel>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            mono
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          disabled={otp.length !== 6 || loading}
        >
          {loading ? 'Verifying…' : 'Verify & Continue'}
        </Button>
      </form>

      <p className="text-sm text-muted text-center mt-4">
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="ap-inline-link disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </p>
    </div>
  );
}

// ── Main registration page ────────────────────────────────────────────────────

export default function RegisterPage() {
  const { user, loading: authLoading, register } = useAuth();
  const router = useRouter();

  type Mode = 'email' | 'phone';
  const [mode, setMode] = useState<Mode>('email');

  // Shared fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [tos, setTos] = useState(false);

  // Email-mode field
  const [email, setEmail] = useState('');

  // Phone-mode field
  const [phone, setPhone] = useState<E164Number | undefined>(undefined);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // After phone registration, show the OTP step instead of redirecting
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard');
  }, [authLoading, user, router]);

  if (authLoading || user) return null;

  const handleOAuth = async (provider: string) => {
    setError('');
    setOauthLoading(provider);
    try {
      // Generate and store a nonce so the callback page can verify this flow
      // was initiated from this browser, preventing token injection attacks.
      const nonce = crypto.randomUUID();
      sessionStorage.setItem('oauth_nonce', nonce);
      const { url } = await authApi.oauthRedirect(provider);
      window.location.href = url;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to start sign-up. Please try again.');
      setOauthLoading(null);
    }
  };

  const anyLoading = loading || oauthLoading !== null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!tos) {
      setError('Please agree to the terms of service.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(
        mode === 'phone'
          ? { name, phone_number: phone ?? '', password, password_confirmation: confirm }
          : { name, email, password, password_confirmation: confirm },
      );

      if (result.phone_verification_required) {
        setAwaitingOtp(true);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 501) {
        setError('Registration is not yet available. Check back soon!');
      } else {
        setError(e.message ?? 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    await phoneApi.sendCode(phone ?? '');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

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
          start with a{' '}
          <span className="ap-sketch-u text-fan">fan</span>{' '}
          account.
        </h1>
        <p className="text-[17px] text-muted max-w-[460px] leading-relaxed mb-10">
          every artypot user starts as a fan — you can pledge to bounties, start new ones, and chip in on anything you want to see made.
        </p>

        <Card dashed className="max-w-[420px]">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">why this order?</div>
          <p className="text-sm text-foreground leading-relaxed mb-3">
            artypot uses a <strong className="text-fan">no-claim</strong> model — bounties are posted for public work, so there&apos;s nothing to claim in advance.
          </p>
          <p className="text-sm text-muted leading-relaxed">
            once you&apos;re in as a fan, you can verify a creator handle and complete the tax + payout gates to unlock the creator view.
          </p>
        </Card>
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

        {/* ── OTP verification step ───────────────────────────────────────── */}
        {awaitingOtp ? (
          <OtpStep
            onVerified={() => router.push('/dashboard')}
            onResend={handleResendOtp}
          />
        ) : (
          <>
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-2">create account</div>
            <h2 className="font-display font-bold text-[30px] text-foreground mb-6">Join Artypot</h2>

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
                    ? <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                    : null}
                  {oauthLoading === id ? 'redirecting…' : label}
                </button>
              ))}
            </div>

            {/* Divider + mode toggle */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Email / Phone toggle — hidden while phone-only signup is in beta */}
            {PHONE_SIGNUP_ENABLED && (
              <div className="flex rounded-lg border border-border overflow-hidden mb-5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => switchMode('email')}
                  className={`flex-1 py-2 transition-colors ${
                    mode === 'email'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  email
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('phone')}
                  className={`flex-1 py-2 border-l border-border transition-colors ${
                    mode === 'phone'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  phone
                </button>
              </div>
            )}

            {error && (
              <div className="bg-bad-soft border border-bad text-bad text-sm rounded px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifier field — email or phone depending on mode */}
              {mode === 'email' ? (
                <div>
                  <FieldLabel>email</FieldLabel>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              ) : (
                <div>
                  <FieldLabel>phone number</FieldLabel>
                  <PhoneNumberInput
                    value={phone}
                    onChange={setPhone}
                    disabled={anyLoading}
                  />
                </div>
              )}

              <FieldGrid2>
                <div>
                  <FieldLabel>Public name</FieldLabel>
                  <Input
                    type="text"
                    required
                    autoComplete="username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Harry Baldwig"
                  />
                </div>
                <div>
                  <FieldLabel>password</FieldLabel>
                  <Input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </FieldGrid2>

              <div>
                <FieldLabel>confirm password</FieldLabel>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Toggle on={tos} onChange={setTos} label="" />
                <p className="text-sm text-muted leading-snug pt-0.5">
                  I agree to the{' '}
                  <Link href="/tos" target="_blank" className="ap-inline-link">terms of service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" className="ap-inline-link">privacy policy</Link>
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center mt-2"
                disabled={anyLoading || (mode === 'phone' && (phone == null || !isValidPhoneNumber(phone)))}
              >
                {loading
                  ? 'Creating account…'
                  : mode === 'phone'
                    ? 'Create Account & Send Code'
                    : 'Create My Account'}
              </Button>
            </form>

            <div className="border-t border-dashed border-border my-5" />
            <p className="text-sm text-muted text-center">
              Already have one?{' '}
              <Link href="/login" className="ap-inline-link">Sign In →</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
