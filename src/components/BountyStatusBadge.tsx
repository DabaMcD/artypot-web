import { Badge } from '@/components/ui/Badge';

// ── Single source of truth for bounty status labels and tones ─────────────────
// Update here and every card/list/page that uses <BountyStatusBadge> will
// automatically reflect the change.

export const BOUNTY_STATUS_LABELS: Record<string, string> = {
  open:      'Open',
  pending:   'Pending Review',
  completed: 'Completed',
  paid_out:  'Paid Out',
  revoked:   'Revoked',
};

type BadgeTone = 'default' | 'info' | 'warn' | 'good' | 'bad';

export const BOUNTY_STATUS_TONES: Record<string, BadgeTone> = {
  open:      'default',
  pending:   'info',
  completed: 'warn',
  paid_out:  'good',
  revoked:   'bad',
};

interface BountyStatusBadgeProps {
  status: string;
  /** Use the larger badge size — matches the bounty detail page header. */
  lg?: boolean;
}

export function BountyStatusBadge({ status, lg }: BountyStatusBadgeProps) {
  const label = BOUNTY_STATUS_LABELS[status] ?? status;
  const tone  = BOUNTY_STATUS_TONES[status]  ?? 'default';
  return (
    <Badge tone={tone} lg={lg}>
      {label}
    </Badge>
  );
}
