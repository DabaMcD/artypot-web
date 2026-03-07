'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { auth as authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-brand font-bold text-2xl mb-1">artypot</div>
          <h1 className="text-xl font-semibold text-foreground">Forgot your password?</h1>
          <p className="text-muted text-sm mt-1">
            {submitted
              ? "Check your inbox for the reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {submitted ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-center space-y-4">
            <div className="text-4xl">📬</div>
            <p className="text-sm text-muted leading-relaxed">
              If <span className="font-mono text-foreground/80">{email}</span> is registered, a password reset link has been sent. It expires in 60 minutes.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm text-brand hover:underline"
            >
              ← Back to login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-surface border border-border rounded-xl p-6 space-y-4"
          >
            {error && (
              <div className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-brand text-black font-semibold py-2.5 rounded-lg hover:bg-brand-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-muted">
              Remembered it?{' '}
              <Link href="/login" className="text-brand hover:underline">
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
