'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { auth as authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PasswordInput, FieldLabel } from '@/components/ui/Input';

function ResetPasswordForm() {
  const t = useTranslations('PasswordReset');
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
      setError(t('reset.errors.mismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('reset.errors.tooShort'));
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
      setError(e.message ?? t('reset.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-good">{t('reset.success.label')}</div>
        <h2 className="font-display font-bold text-[24px] text-foreground">{t('reset.success.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">
          {t('reset.success.body')}
        </p>
        <Button
          variant="primary"
          className="justify-center"
          onClick={() => router.push('/login')}
        >
          {t('reset.success.signIn')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted ap-section-label-bar mb-2">{t('reset.sectionLabel')}</div>
      <h1 className="font-display font-bold text-[30px] text-foreground mb-2">{t('reset.title')}</h1>
      <p className="text-sm text-muted mb-8 leading-relaxed">
        {t('reset.forPrefix')} <span className="font-mono text-foreground">{email}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-bad-soft border border-bad text-bad text-sm rounded px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <FieldLabel>{t('reset.newPasswordLabel')}</FieldLabel>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
            placeholder={t('reset.newPasswordPlaceholder')}
          />
        </div>

        <div>
          <FieldLabel>{t('reset.confirmPasswordLabel')}</FieldLabel>
          <PasswordInput
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t('reset.confirmPasswordPlaceholder')}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          disabled={loading || !password || !passwordConfirm}
        >
          {loading ? t('reset.submitLoading') : t('reset.submit')}
        </Button>
      </form>

      <p className="text-sm text-muted text-center mt-6">
        {t('reset.rememberedPrompt')}{' '}
        <Link href="/login" className="ap-inline-link">{t('reset.signIn')}</Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('PasswordReset');
  return (
    <div data-role="auth" className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="block mb-10">
          <Image
            src="/artypot-logo-transparent-dark.png"
            alt="Artypot"
            width={797}
            height={258}
            className="h-8 w-auto"
          />
        </Link>

        <Suspense fallback={<div className="font-mono text-xs text-muted">{t('reset.loading')}</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
