'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth as authApi } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect away if no token/email in the URL
  useEffect(() => {
    if (!token || !email) {
      router.replace('/login');
    }
  }, [token, email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirm,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-foreground mb-2">Password reset!</h2>
        <p className="text-muted text-sm mb-6">
          Your password has been updated. All other sessions have been logged out.
        </p>
        <Link
          href="/login"
          className="inline-block bg-fan text-black font-semibold px-6 py-2.5 rounded-lg hover:bg-fan-dim transition-colors text-sm"
        >
          Log in with new password →
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-1">Reset your password</h1>
      <p className="text-muted text-sm mb-6">
        Enter a new password for <span className="font-mono text-foreground/80">{email}</span>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-muted mb-1">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
            placeholder="At least 8 characters"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Confirm new password</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password || !passwordConfirm}
          className="w-full bg-fan text-black font-semibold py-2.5 text-sm rounded-lg hover:bg-fan-dim disabled:opacity-50 transition-colors"
        >
          {loading ? 'Resetting…' : 'Set new password'}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Remembered it?{' '}
        <Link href="/login" className="text-fan hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-xl">
        <Suspense fallback={<div className="text-muted text-sm text-center">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
