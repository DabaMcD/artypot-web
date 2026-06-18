'use client';

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
  const { bankConnected, canWithdraw, needsLocation, stripeLoading, isPayoutBlocked, isManualPayout } = p;

  return (
    <>
      <div id="bank-account">
        <Card>
          <div className="flex items-start justify-between mb-3">
            <SectionLabel>bank account</SectionLabel>
            {canWithdraw && <Badge tone="good">connected</Badge>}
          </div>
          {isPayoutBlocked || isManualPayout ? (
            /* Stripe self-serve onboarding can never lead to a payout in these
               regions, so replace the connect flow with the region notice. */
            <PayoutRegionNotice p={p} />
          ) : (
            <>
              <p className="text-sm text-muted leading-relaxed mb-4">
                Artypot uses Stripe for secure, direct bank verification — your credentials are never stored by us.
              </p>
              {needsLocation ? (
                <div>
                  <p className="text-sm text-muted mb-3">Set your location before connecting a bank account.</p>
                  <Link href="/c/settings#location">
                    <Button variant="primary">Set Location →</Button>
                  </Link>
                </div>
              ) : !bankConnected ? (
                <Button variant="primary" disabled={stripeLoading} onClick={p.handleConnectBank}>
                  {stripeLoading ? 'Starting setup…' : 'Connect Bank Account'}
                </Button>
              ) : !canWithdraw ? (
                <div>
                  <Button variant="primary" disabled={stripeLoading} onClick={p.handleContinueOnboarding}>
                    {stripeLoading ? 'Loading…' : 'Continue Setup →'}
                  </Button>
                  <p className="text-xs text-warn mt-2">Bank connection pending — complete Stripe setup to enable withdrawals.</p>
                </div>
              ) : (
                <Button variant="danger" size="sm" disabled={stripeLoading} onClick={() => p.setShowDisconnectConfirm(true)}>
                  Disconnect Bank
                </Button>
              )}
            </>
          )}
        </Card>
      </div>

      {p.showDisconnectConfirm && (
        <Modal
          title="Disconnect bank account?"
          onClose={() => { if (!stripeLoading) p.setShowDisconnectConfirm(false); }}
          actions={
            <>
              <Button variant="ghost" onClick={() => p.setShowDisconnectConfirm(false)} disabled={stripeLoading}>Cancel</Button>
              <Button variant="danger" onClick={p.handleDisconnect} disabled={stripeLoading}>
                {stripeLoading ? 'Disconnecting…' : 'Yes, Disconnect Bank'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed">
            This removes your linked bank account from Artypot. You won&apos;t be able to
            withdraw funds until you re-link and complete setup again.
          </p>
        </Modal>
      )}
    </>
  );
}
