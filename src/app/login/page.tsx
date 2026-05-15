'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { auth as authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, FieldLabel } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Timeline } from '@/components/ui/Timeline';

const PROVIDERS = [
  { id: 'google',   label: 'Google' },
  { id: 'apple',    label: 'Apple' },
  { id: 'github',   label: 'GitHub' },
  { id: 'discord',  label: 'Discord' },
  { id: 'twitch',   label: 'Twitch' },
  { id: 'twitter',  label: 'Twitter / X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'reddit',   label: 'Reddit' },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      setError(e.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setError('');
    setOauthLoading(provider);
    try {
      const { url } = await authApi.oauthRedirect(provider);
      window.location.href = url;
    } catch {
      setError('Failed to start sign-in. Please try again.');
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
          put your money where your{' '}
          <span className="ap-sketch-u text-fan">mouth</span> is.
        </h1>
        <p className="font-display text-[17px] text-muted max-w-[460px] leading-relaxed mb-10">
          start a bounty for a creator to make a public, free piece of work.
          others can chip in. when the work is delivered, the creator gets paid.
        </p>

        <div className="flex gap-8 max-w-[460px]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">charged</div>
            <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">monthly</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-1">only after delivery</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">complaint</div>
            <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">7 days</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-1">after work verified</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">platform fee</div>
            <div className="font-mono text-[22px] font-medium text-foreground tabular-nums">15%</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-1">no sales tax</div>
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

        <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-2">sign in</div>
        <h2 className="font-display font-bold text-[30px] text-foreground mb-6">welcome back</h2>

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

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {error && (
          <div className="bg-bad-soft border border-bad text-bad text-sm rounded px-4 py-3 mb-4 font-display">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <FieldLabel>password</FieldLabel>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <Toggle on={remember} onChange={setRemember} label="remember me" />
            <Link href="/forgot-password" className="ap-inline-link text-sm">forgot password?</Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center mt-2"
            disabled={anyLoading}
          >
            {loading ? 'signing in…' : 'sign in'}
          </Button>
        </form>

        <div className="border-t border-dashed border-border my-5" />
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted text-center mb-3">new here?</div>
        <Button
          variant="default"
          className="w-full justify-center"
          onClick={() => router.push('/register')}
        >
          create an account
        </Button>

        <p className="font-display text-sm text-muted mt-5 pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-fan">
          becoming a creator is a separate flow — first sign up, then verify a handle and complete tax + bank gates.
        </p>
      </div>
    </div>
  );
}
