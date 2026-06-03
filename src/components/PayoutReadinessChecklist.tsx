'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { PAYOUT_MINIMUM_AUTOMATED, PAYOUT_MINIMUM_MANUAL } from '@/lib/config';

interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
  error?: boolean;
}

function CheckIcon({ done, error }: { done: boolean; error?: boolean }) {
  if (error) {
    return (
      <span className="w-4 h-4 flex-shrink-0 rounded-full bg-bad/20 flex items-center justify-center text-bad text-[10px] font-bold">
        !
      </span>
    );
  }
  if (done) {
    return (
      <span className="w-4 h-4 flex-shrink-0 rounded-full bg-good/20 flex items-center justify-center text-good text-[10px]">
        ✓
      </span>
    );
  }
  return (
    <span className="w-4 h-4 flex-shrink-0 rounded-full border border-border bg-surface-2" />
  );
}

interface PayoutReadinessChecklistProps {
  /**
   * Whether the creator has actually crossed the W-9 / W-8BEN threshold and
   * the form is now blocking withdrawals. Tax forms are NOT a first-payout
   * gate — a creator can withdraw well before hitting the IRS reporting
   * threshold — so we only surface the tax line here once it genuinely
   * applies (or once it's already been submitted, shown as a ✓).
   */
  taxFormRequired?: boolean;
  /** Whether a valid tax form is already on file (verified / qualifying). */
  taxFormDone?: boolean;
}

export default function PayoutReadinessChecklist({
  taxFormRequired,
  taxFormDone: taxFormDoneProp,
}: PayoutReadinessChecklistProps = {}) {
  const { user } = useAuth();

  if (!user || !user.creator) return null;

  const creator = user.creator;
  const isUS = user.country_code === 'US';
  // If the creator has no bank_connected flag and no known Stripe connection, assume manual region
  const isManualPayoutRegion = !creator.bank_connected;

  // Determine minimum based on region
  const payoutMin = isManualPayoutRegion ? PAYOUT_MINIMUM_MANUAL : PAYOUT_MINIMUM_AUTOMATED;
  const amountEarned = creator.amount_earned ?? 0;
  const meetsMinimum = amountEarned >= payoutMin;

  const taxFormLabel = isUS ? 'W-9' : 'W-8BEN';
  const taxFormDone = taxFormDoneProp ?? ((user as unknown as Record<string, unknown>).tax_form_status === 'completed');
  // Only treat the tax form as a checklist line when it's genuinely required
  // (threshold crossed) or already satisfied. Below the threshold it's not a
  // first-payout blocker, so we keep it off the readiness list entirely — the
  // dashboard's "tax compliance" Card carries the informational heads-up.
  const showTaxForm = (taxFormRequired ?? false) || taxFormDone;

  const items: ChecklistItem[] = [
    {
      label: 'Email verified',
      done: user.email_verified_at !== null && user.email_verified_at !== undefined,
      href: '/settings#email',
    },
    {
      label: 'Creator TOS agreed',
      done: (user as unknown as Record<string, unknown>).creator_tos_accepted_at != null,
      href: '/c',
    },
    {
      label: 'Country / region set',
      done: user.location_complete === true,
      href: '/c/settings#location',
    },
    {
      label: 'Handle verified and approved',
      done: user.has_verified_handle === true,
      href: '/c/handles',
    },
    ...(creator.bank_connected !== undefined && !isManualPayoutRegion
      ? [
          {
            label: 'Bank account connected',
            done: creator.bank_connected === true,
            href: '/c/payouts#bank-account',
          } as ChecklistItem,
        ]
      : isManualPayoutRegion
        ? [
            {
              label: 'Bank account (manual payout — contact support)',
              done: false,
              href: '/support',
            } as ChecklistItem,
          ]
        : []),
    ...(showTaxForm
      ? [
          {
            label: `Tax form submitted (${taxFormLabel})`,
            done: taxFormDone,
            href: '/c/tax',
          } as ChecklistItem,
        ]
      : []),
    {
      label: `Minimum balance reached ($${payoutMin} required, $${amountEarned.toFixed(2)} earned)`,
      done: meetsMinimum,
      // No link — informational only
    },
  ];

  const payoutHold = (creator as unknown as Record<string, unknown>).payout_hold === true;

  // Find index of first incomplete item
  const firstIncompleteIdx = items.findIndex((item) => !item.done);

  return (
    <div className="space-y-2">
      {payoutHold && (
        <div className="flex items-start gap-3 py-2 px-3 rounded-md bg-bad-soft border border-bad/30">
          <CheckIcon done={false} error />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-bad font-medium">
              Identity verification required by Stripe
            </span>
            <Link
              href="/c/payouts#payout-hold"
              className="ml-2 text-xs text-bad underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Complete now →
            </Link>
          </div>
        </div>
      )}

      {items.map((item, idx) => {
        const isFirstIncomplete = idx === firstIncompleteIdx;
        return (
          <div
            key={idx}
            className={`flex items-start gap-3 py-2 px-3 rounded-md transition-colors ${
              isFirstIncomplete
                ? 'bg-surface-2 border border-border'
                : 'bg-transparent'
            }`}
          >
            <CheckIcon done={item.done} />
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm ${
                  item.done
                    ? 'text-muted line-through'
                    : isFirstIncomplete
                      ? 'text-foreground font-medium'
                      : 'text-muted'
                }`}
              >
                {item.label}
              </span>
              {isFirstIncomplete && item.href && (
                <Link
                  href={item.href}
                  className="ml-2 text-xs text-fan underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Set up now →
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
