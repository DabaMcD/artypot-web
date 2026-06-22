'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * A single compact settings row: label (+ optional status badge) and a
 * current-value summary on the left, an action on the right. The default
 * action is an "Edit" button that opens the setting's edit modal; pass a custom
 * `action` (e.g. an inline <Toggle>, a link button, or a "Manage" link) to
 * override it.
 *
 * `id` is placed on the row wrapper so existing deep-link anchors
 * (`/settings#email`, `/c/settings#location`, …) continue to scroll here.
 */
export function SettingRow({
  id,
  label,
  value,
  badge,
  description,
  action,
  onEdit,
  editLabel = 'Edit',
  editVariant = 'default',
  disabled = false,
  hint,
}: {
  id?: string;
  label: ReactNode;
  /** Current-value summary (text, mono string, avatar+text, "Not set", …). */
  value?: ReactNode;
  /** Optional status pill shown next to the label (Verified / Pending / …). */
  badge?: ReactNode;
  /** Optional helper line under the value. */
  description?: ReactNode;
  /** Overrides the default Edit button entirely (Toggle, Link, etc.). */
  action?: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
  editVariant?: 'default' | 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  /** Tooltip shown on the Edit button (e.g. why it's disabled). */
  hint?: string;
}) {
  return (
    <div id={id} className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {badge}
        </div>
        {value != null && value !== '' && (
          <div className="text-sm text-muted mt-0.5 break-words">{value}</div>
        )}
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">
        {action ?? (
          <Button
            variant={editVariant}
            size="sm"
            onClick={onEdit}
            disabled={disabled}
            title={hint}
          >
            {editLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
