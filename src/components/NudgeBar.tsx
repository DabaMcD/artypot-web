'use client';

import { Link } from '@/i18n/routing';
import { useNudgeContext } from '@/lib/nudge-context';
import { useAuth } from '@/lib/auth-context';

const TONE_CLASSES: Record<string, string> = {
  add_contact_method:   'bg-bad-soft  border-bad  text-foreground',
  // verify_email is not a nudge — email verification is owned by
  // <EmailVerificationBanner>. See NudgeService::TYPES (backend).
  add_payment_method:   'bg-bad-soft  border-bad  text-foreground',
  payout_hold:          'bg-bad-soft  border-bad  text-foreground',
  setup_bank:           'bg-warn-soft border-warn text-foreground',
  request_admin_payout: 'bg-warn-soft border-warn text-foreground',
  // Urgent: only fires once earnings cross the reporting threshold, at which
  // point the missing form will block the creator's next payout.
  submit_tax_form:      'bg-bad-soft  border-bad  text-foreground',
  balance_ready:        'bg-good-soft border-good text-foreground',
};

const ICON_CLASSES: Record<string, string> = {
  add_contact_method:   'border-bad  text-bad',
  add_payment_method:   'border-bad  text-bad',
  payout_hold:          'border-bad  text-bad',
  setup_bank:           'border-warn text-warn',
  request_admin_payout: 'border-warn text-warn',
  submit_tax_form:      'border-bad  text-bad',
  balance_ready:        'border-good text-good',
};

export function NudgeBar() {
  const { user } = useAuth();
  const { nudge, dismiss } = useNudgeContext();

  if (!user || !nudge) return null;

  const toneClass = TONE_CLASSES[nudge.type] ?? 'bg-warn-soft border-warn text-foreground';
  const iconClass = ICON_CLASSES[nudge.type] ?? 'border-warn text-warn';
  const iconChar  = nudge.type === 'balance_ready' ? '✓' : '!';

  return (
    <div className={`flex items-center gap-4 border rounded-md px-5 py-4 mb-6 ${toneClass}`}>
      <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black leading-none ${iconClass}`}>{iconChar}</span>
      <p className="flex-1 text-sm">
        <span className="font-semibold">{nudge.title}</span>
        {nudge.body && <span className="text-foreground/70"> — {nudge.body}</span>}
      </p>
      <div className="flex items-center gap-4 shrink-0">
        {nudge.link && (
          <Link
            href={nudge.link}
            className="text-sm font-semibold whitespace-nowrap hover:underline underline-offset-2"
          >
            Set up now →
          </Link>
        )}
        {nudge.dismissable && (
          <button
            type="button"
            onClick={() => dismiss(nudge.type)}
            aria-label="Dismiss"
            className="text-foreground/40 hover:text-foreground/80 transition-colors leading-none"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
