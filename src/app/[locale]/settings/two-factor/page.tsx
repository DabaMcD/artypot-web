'use client';

import { useEffect, useState, FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, FieldLabel, FieldHint } from '@/components/ui/Input';
import { StepUpField } from '@/components/StepUpField';

type Status = { enabled: boolean; pending: boolean; recovery_codes_remaining: number };
type Setup = { secret: string; otpauth_uri: string; recovery_codes: string[] };

export default function TwoFactorSettingsPage() {
  const t = useTranslations('SettingsTwoFactor');
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const hasPassword = user?.has_password ?? false;

  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [regenerated, setRegenerated] = useState<string[] | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  // Step-up factor (a current TOTP or recovery code) for regenerate/disable,
  // which act on an already-enabled account.
  const [stepUpCode, setStepUpCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.twoFactor.status().then(setStatus).catch(() => setStatus({ enabled: false, pending: false, recovery_codes_remaining: 0 }));
  }, []);

  const fail = (err: unknown) => {
    const e = err as { message?: string };
    toast(e.message ?? t('errors.generic'), 'error');
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast(t('copied'), 'success')).catch(() => {});
  };

  // ── Begin setup ────────────────────────────────────────────────────────────
  const beginSetup = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authApi.twoFactor.enable(hasPassword ? { password } : undefined);
      setSetup(res);
      setPassword('');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // ── Confirm the code → enable ───────────────────────────────────────────────
  const confirm = async (e?: FormEvent, codeOverride?: string) => {
    e?.preventDefault();
    const value = (codeOverride ?? code).trim();
    setBusy(true);
    try {
      await authApi.twoFactor.confirm(value);
      await refreshUser();
      toast(t('toasts.enabled'), 'success');
      router.push('/settings');
    } catch (err) {
      setCode('');
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // ── Disable ──────────────────────────────────────────────────────────────────
  const disable = async () => {
    setBusy(true);
    try {
      await authApi.twoFactor.disable({ step_up_code: stepUpCode });
      await refreshUser();
      toast(t('toasts.disabled'), 'success');
      router.push('/settings');
    } catch (err) {
      setStepUpCode('');
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // ── Regenerate recovery codes ────────────────────────────────────────────────
  const regenerate = async () => {
    setBusy(true);
    try {
      const res = await authApi.twoFactor.regenerateRecoveryCodes({ step_up_code: stepUpCode });
      setRegenerated(res.recovery_codes);
      setStepUpCode('');
      toast(t('toasts.regenerated'), 'success');
    } catch (err) {
      setStepUpCode('');
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const passwordField = hasPassword ? (
    <div className="mb-4">
      <FieldLabel>{t('passwordLabel')}</FieldLabel>
      <PasswordInput
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />
    </div>
  ) : null;

  const recoveryCodeList = (codes: string[]) => (
    <div className="bg-surface-2 border border-border rounded p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
        {codes.map((c) => <span key={c}>{c}</span>)}
      </div>
      <Button variant="default" size="sm" className="mt-3" onClick={() => copy(codes.join('\n'))}>
        {t('copy')}
      </Button>
    </div>
  );

  return (
    <div className="max-w-[560px] mx-auto px-4 py-10">
      <Link href="/settings" className="ap-inline-link text-sm">← {t('back')}</Link>
      <h1 className="font-display font-bold text-[28px] text-foreground mt-3 mb-6">{t('heading')}</h1>

      {status === null ? (
        <p className="text-sm text-muted">{t('loading')}</p>
      ) : status.enabled ? (
        // ── Already enabled ──────────────────────────────────────────────────
        <Card>
          <SectionLabel className="mb-2">{t('enabled.title')}</SectionLabel>
          <p className="text-sm text-muted mb-4">{t('enabled.blurb')}</p>
          <p className="text-sm text-muted mb-4">
            {t('enabled.recoveryRemaining', { count: status.recovery_codes_remaining })}
          </p>

          {regenerated && (
            <div className="mb-4">
              <p className="text-sm text-foreground mb-2">{t('regenerated.hint')}</p>
              {recoveryCodeList(regenerated)}
            </div>
          )}

          <StepUpField user={user} value={stepUpCode} onChange={setStepUpCode} className="mb-4" />

          <div className="flex flex-wrap gap-2">
            <Button variant="default" onClick={regenerate} disabled={busy || !stepUpCode.trim()}>{t('enabled.regenerate')}</Button>
            <Button variant="danger" onClick={disable} disabled={busy || !stepUpCode.trim()}>{t('enabled.disable')}</Button>
          </div>
          {user?.role === 'council' && (
            <p className="text-xs text-muted mt-3">{t('enabled.councilNote')}</p>
          )}
        </Card>
      ) : setup ? (
        // ── Pending confirmation: scan + confirm ─────────────────────────────
        <Card>
          <SectionLabel className="mb-2">{t('setup.scanTitle')}</SectionLabel>
          <p className="text-sm text-muted mb-4">{t('setup.scanHint')}</p>

          <div className="flex justify-center bg-white rounded p-4 mb-4 w-fit mx-auto">
            <QRCodeSVG value={setup.otpauth_uri} size={180} />
          </div>

          <FieldLabel>{t('setup.manualLabel')}</FieldLabel>
          <div className="flex items-center gap-2 mb-5">
            <code className="font-mono text-sm bg-surface-2 border border-border rounded px-3 py-2 break-all flex-1">{setup.secret}</code>
            <Button variant="default" size="sm" onClick={() => copy(setup.secret)}>{t('copy')}</Button>
          </div>

          <SectionLabel className="mb-2">{t('setup.recoveryTitle')}</SectionLabel>
          <p className="text-sm text-muted mb-3">{t('setup.recoveryHint')}</p>
          <div className="mb-6">{recoveryCodeList(setup.recovery_codes)}</div>

          <form onSubmit={confirm}>
            <FieldLabel>{t('setup.confirmLabel')}</FieldLabel>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                // Auto-submit once the full 6-digit code is entered.
                if (v.length === 6 && !busy) confirm(undefined, v);
              }}
              placeholder={t('setup.confirmPlaceholder')}
            />
            <Button type="submit" variant="primary" className="mt-4" disabled={busy || code.length !== 6}>
              {t('setup.confirm')}
            </Button>
          </form>
        </Card>
      ) : (
        // ── Not set up yet: intro + begin ────────────────────────────────────
        <Card>
          <SectionLabel className="mb-2">{t('intro.title')}</SectionLabel>
          <p className="text-sm text-muted mb-4">{t('intro.blurb')}</p>
          <form onSubmit={beginSetup}>
            {passwordField}
            {hasPassword && <FieldHint className="mb-4">{t('passwordHint')}</FieldHint>}
            <Button type="submit" variant="primary" disabled={busy || (hasPassword && !password)}>
              {t('intro.begin')}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
