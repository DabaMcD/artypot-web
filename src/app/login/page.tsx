'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { auth as authApi } from '@/lib/api';

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
      if (e.status === 501) {
        setError('Login is not yet available. Check back soon!');
      } else {
        setError(e.message ?? 'Login failed. Please try again.');
      }
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
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-fan font-display font-bold text-2xl mb-1">artypot</div>
          <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
          <p className="text-muted text-sm mt-1">Log in to your account</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* OAuth provider buttons */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                disabled={anyLoading}
                onClick={() => handleOAuth(id)}
                className="flex items-center justify-center gap-1.5 bg-surface-2 border border-border text-foreground text-xs font-medium py-2 px-3 rounded-lg hover:border-fan/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {oauthLoading === id ? (
                  <span className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                ) : null}
                {oauthLoading === id ? 'Redirecting…' : `Continue with ${label}`}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted">or continue with email</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
              placeholder="••••••••"
            />
            <div className="text-right mt-1.5">
              <Link href="/forgot-password" className="text-xs text-muted hover:text-fan transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={anyLoading}
            className="w-full bg-fan text-black font-semibold py-2.5 rounded-lg hover:bg-fan-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-fan hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
