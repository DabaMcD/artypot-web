import { ReactNode } from 'react';
import { Card, SectionLabel } from '@/components/ui/Card';

/**
 * A settings "section" — one Card with a mono heading and a vertically-divided
 * stack of rows (or any inline content). Replaces the old one-Card-per-setting
 * sprawl: related settings now live as compact rows inside a single section.
 *
 * Children are typically <SettingRow>s; the `divide-y` supplies the separators
 * so callers don't repeat border classes per row.
 */
export function SettingsSection({
  title,
  description,
  danger = false,
  className = '',
  children,
}: {
  title: string;
  description?: ReactNode;
  danger?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`${danger ? 'border-bad/30' : ''} ${className}`}>
      <SectionLabel className={`mb-1 ${danger ? 'text-bad' : ''}`}>{title}</SectionLabel>
      {description && <p className="text-sm text-muted mb-2">{description}</p>}
      <div className="divide-y divide-border">{children}</div>
    </Card>
  );
}
