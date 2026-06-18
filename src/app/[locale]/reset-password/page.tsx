'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { auth as authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, FieldLabel } from '@/components/ui/Input';

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
      <div className="text-center space-y-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-good">done</div>
        <h2 className="font-display font-bold text-[24px] text-foreground">Password Updated</h2>
        <p className="text-sm text-muted leading-relaxed">
          Your password has been changed. All other sessions have been signed out.
        </p>
        <Button
          variant="primary"
          className="justify-center"
          onClick={() => router.push('/login')}
        >
          Sign In with New Password →
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-2">password reset</div>
      <h1 className="font-display font-bold text-[30px] text-foreground mb-2">Set a New Password</h1>
      <p className="text-sm text-muted mb-8 leading-relaxed">
        For <span className="font-mono text-foreground">{email}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-bad-soft border border-bad text-bad text-sm rounded px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <FieldLabel>new password</FieldLabel>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
            placeholder="at least 8 characters"
          />
        </div>

        <div>
          <FieldLabel>confirm new password</FieldLabel>
          <PasswordInput
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="repeat your new password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          disabled={loading || !password || !passwordConfirm}
        >
          {loading ? 'Resetting…' : 'Set New Password'}
        </Button>
      </form>

      <p className="text-sm text-muted text-center mt-6">
        Remembered it?{' '}
        <Link href="/login" className="ap-inline-link">Sign In →</Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
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

        <Suspense fallback={<div className="font-mono text-xs text-muted">loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
