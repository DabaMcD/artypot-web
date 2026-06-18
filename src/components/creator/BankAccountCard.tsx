'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import PayoutRegionNotice from '@/components/creator/PayoutRegionNotice';
import type { CreatorPayouts } from '@/lib/hooks/useCreatorPayouts';

/**
 * Bank-account (Stripe Connect) connect / continue / disconnect card, plus its
 * disconnect-confirmation modal. Presentational — all state and handlers come
 * from the shared {@link useCreatorPayouts} hook.
 */
export default function BankAccountCard({ p }: { p: CreatorPayouts }) {
  const t = useTranslations('BankAccountCard');
  const { bankConnected, canWithdraw, needsLocation, stripeLoading, isPayoutBlocked, isManualPayout } = p;

  return (
    <>
      <div id="bank-account">
        <Card>
          <div className="flex items-start justify-between mb-3">
            <SectionLabel>{t('sectionLabel')}</SectionLabel>
            {canWithdraw && <Badge tone="good">{t('connectedBadge')}</Badge>}
          </div>
          {isPayoutBlocked || isManualPayout ? (
            /* Stripe self-serve onboarding can never lead to a payout in these
               regions, so replace the connect flow with the region notice. */
            <PayoutRegionNotice p={p} />
          ) : (
            <>
              <p className="text-sm text-muted leading-relaxed mb-4">
                {t('stripeBlurb')}
              </p>
              {needsLocation ? (
                <div>
                  <p className="text-sm text-muted mb-3">{t('setLocationPrompt')}</p>
                  <Link href="/c/settings#location">
                    <Button variant="primary">{t('setLocationButton')}</Button>
                  </Link>
                </div>
              ) : !bankConnected ? (
                <Button variant="primary" disabled={stripeLoading} onClick={p.handleConnectBank}>
                  {stripeLoading ? t('startingSetup') : t('connectBankButton')}
                </Button>
              ) : !canWithdraw ? (
                <div>
                  <Button variant="primary" disabled={stripeLoading} onClick={p.handleContinueOnboarding}>
                    {stripeLoading ? t('loading') : t('continueSetupButton')}
                  </Button>
                  <p className="text-xs text-warn mt-2">{t('connectionPending')}</p>
                </div>
              ) : (
                <Button variant="danger" size="sm" disabled={stripeLoading} onClick={() => p.setShowDisconnectConfirm(true)}>
                  {t('disconnectBankButton')}
                </Button>
              )}
            </>
          )}
        </Card>
      </div>

      {p.showDisconnectConfirm && (
        <Modal
          title={t('disconnectModalTitle')}
          onClose={() => { if (!stripeLoading) p.setShowDisconnectConfirm(false); }}
          actions={
            <>
              <Button variant="ghost" onClick={() => p.setShowDisconnectConfirm(false)} disabled={stripeLoading}>{t('cancelButton')}</Button>
              <Button variant="danger" onClick={p.handleDisconnect} disabled={stripeLoading}>
                {stripeLoading ? t('disconnecting') : t('confirmDisconnectButton')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed">
            {t('disconnectModalBody')}
          </p>
        </Modal>
      )}
    </>
  );
}
