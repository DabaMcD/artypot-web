'use client';

import { useTranslations } from 'next-intl';
import { Input, PasswordInput, FieldLabel } from '@/components/ui/Input';
import type { StepUp } from '@/lib/api';

export type StepUpUser = { has_password?: boolean; two_factor_enabled?: boolean } | null | undefined;

/**
 * Build the step-up payload for the strongest factor the account actually has —
 * a current TOTP/recovery code once 2FA is on, otherwise the password. Returns
 * undefined when the account has no in-band factor (the backend allows those
 * actions on the session alone there). Mirrors backend StepUpService precedence.
 */
export function buildStepUp(user: StepUpUser, value: string): StepUp | undefined {
  if (user?.two_factor_enabled) return { step_up_code: value };
  if (user?.has_password) return { password: value };
  return undefined;
}

/** Whether the account must supply a factor before a sensitive action. */
export function stepUpRequired(user: StepUpUser): boolean {
  return !!(user?.two_factor_enabled || user?.has_password);
}

/**
 * Re-auth input shown before sensitive account actions (regenerate/disable 2FA,
 * delete account, change email). Renders a code field for 2FA accounts and a
 * password field otherwise; renders nothing for password-less / no-2FA accounts.
 */
export function StepUpField({
  user,
  value,
  onChange,
  className = '',
}: {
  user: StepUpUser;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const t = useTranslations('StepUp');

  if (!stepUpRequired(user)) return null;

  const is2fa = !!user?.two_factor_enabled;

  return (
    <div className={className}>
      <FieldLabel>{is2fa ? t('codeLabel') : t('passwordLabel')}</FieldLabel>
      {is2fa ? (
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('codePlaceholder')}
        />
      ) : (
        <PasswordInput
          autoComplete="current-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
        />
      )}
      <p className="text-xs text-muted mt-1">{is2fa ? t('codeHint') : t('passwordHint')}</p>
    </div>
  );
}
