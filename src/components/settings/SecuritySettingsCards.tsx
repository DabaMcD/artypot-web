'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/** Settings-hub card: shows 2FA on/off and links to the full setup flow. */
export function TwoFactorCard() {
  const t = useTranslations('Settings');
  const { user } = useAuth();
  const enabled = user?.two_factor_enabled ?? false;

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <SectionLabel className="mb-1">{t('twoFactor.label')}</SectionLabel>
          <p className="text-sm text-muted">
            {enabled ? t('twoFactor.onBlurb') : t('twoFactor.offBlurb')}
          </p>
        </div>
        <Link href="/settings/two-factor">
          <Button variant="default" size="sm">
            {enabled ? t('twoFactor.manage') : t('twoFactor.setUp')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

/** Settings-hub card: active session count + sign out everywhere. */
export function SessionsCard() {
  const t = useTranslations('Settings');
  const router = useRouter();
  const { logout } = useAuth();
  const { toast } = useToast();

  const [count, setCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.sessions.list().then((r) => setCount(r.active_sessions)).catch(() => setCount(null));
  }, []);

  const logoutAll = async () => {
    setBusy(true);
    try {
      await authApi.sessions.logoutAll();
      // Every token (including this one) is now revoked — clear local auth state
      // and return to login.
      await logout();
      router.push('/login');
    } catch (err) {
      const e = err as { message?: string };
      toast(e.message ?? t('sessions.error'), 'error');
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <SectionLabel className="mb-1">{t('sessions.label')}</SectionLabel>
          <p className="text-sm text-muted">
            {count === null
              ? t('sessions.blurb')
              : t('sessions.activeCount', { count })}
          </p>
        </div>
        <Button variant="default" size="sm" onClick={() => setConfirming(true)} disabled={count === null || count === 0}>
          {t('sessions.logoutAll')}
        </Button>
      </div>

      {confirming && (
        <Modal
          title={t('sessions.confirmTitle')}
          onClose={() => !busy && setConfirming(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                {t('sessions.cancel')}
              </Button>
              <Button variant="danger" onClick={logoutAll} disabled={busy}>
                {busy ? t('sessions.working') : t('sessions.confirm')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">{t('sessions.confirmBody')}</p>
        </Modal>
      )}
    </Card>
  );
}
