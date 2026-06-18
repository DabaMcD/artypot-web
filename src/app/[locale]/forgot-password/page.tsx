'use client';

import { useState, FormEvent } from 'react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { auth as authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, FieldLabel } from '@/components/ui/Input';

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
    <div data-role="auth" className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="block mb-10">
          <Image
            src="/artypot-logo-transparent-dark.png"
            alt="Artypot"
            width={1024}
            height={269}
            className="h-8 w-auto"
          />
        </Link>

        <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-2">password reset</div>
        <h1 className="font-display font-bold text-[30px] text-foreground mb-2">Forgot Your Password?</h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          {submitted
            ? 'Check your inbox — a reset link is on its way.'
            : "Enter your email and we'll send a reset link. It expires in 60 minutes."}
        </p>

        {submitted ? (
          <div className="bg-surface border border-border rounded p-6 space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-good mb-1">sent</div>
            <p className="text-sm text-muted leading-relaxed">
              If <span className="font-mono text-foreground">{email}</span>{" "}is registered, you&apos;ll receive the link shortly.
            </p>
            <Link href="/login" className="ap-inline-link text-sm">
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-bad-soft border border-bad text-bad text-sm rounded px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <FieldLabel>email address</FieldLabel>
              <Input
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              disabled={loading || !email}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </Button>

            <p className="text-sm text-muted text-center pt-1">
              Remembered it?{' '}
              <Link href="/login" className="ap-inline-link">Sign In →</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
