'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

// Local password input matching this page's bespoke styling, with a show/hide
// eye toggle. (The settings/password surface predates the shared <Input>; kept
// visually consistent rather than migrating it here.)
function PasswordField({
  hideLabel,
  showLabel,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { hideLabel: string; showLabel: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className="w-full bg-surface-2 border border-border rounded-lg pl-3 pr-10 py-2.5 text-sm text-foreground focus:outline-none focus:border-fan transition-colors"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground transition-colors"
      >
        {visible ? (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243-4.243-4.243" />
          </svg>
        ) : (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function ChangePasswordPage() {
  const t = useTranslations('SettingsPassword');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      toast(t('mismatchError'), 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirm,
      });
      toast(t('successMessage'), 'success');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      // Brief delay so the toast is visible before navigating away
      setTimeout(() => router.push('/settings'), 900);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('failureMessage'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (!user.email_verified_at) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-muted text-sm mb-4">{t('verifiedEmailRequired')}</p>
        <Link href="/settings" className="text-fan hover:underline text-sm">
          ← {t('backToSettings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="mb-6">
        <Link
          href="/settings"
          className="text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4"
        >
          ← {t('backToSettings')}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{t('heading')}</h1>
        <p className="text-sm text-muted mt-1">{t('subheading')}</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('currentPasswordLabel')}
            </label>
            <PasswordField
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              hideLabel={t('hidePassword')}
              showLabel={t('showPassword')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('newPasswordLabel')}
            </label>
            <PasswordField
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              hideLabel={t('hidePassword')}
              showLabel={t('showPassword')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('confirmPasswordLabel')}
            </label>
            <PasswordField
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              hideLabel={t('hidePassword')}
              showLabel={t('showPassword')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !newPasswordConfirm}
            className="w-full bg-fan text-black font-semibold py-2.5 text-sm rounded-lg hover:bg-fan-dim disabled:opacity-50 transition-colors"
          >
            {loading ? t('saving') : t('updateButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
