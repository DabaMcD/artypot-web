'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';
import { reports } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import type { ReportSubjectType } from '@/lib/types';

/**
 * Shared Content Policy report dialog, reused across bounties, creators,
 * handles, and comments. Controlled — the caller owns the open/close state and
 * renders its own trigger (so each surface can style its own button or link).
 */
export function ReportModal({
  open,
  onClose,
  subjectType,
  subjectId,
}: {
  open: boolean;
  onClose: () => void;
  subjectType: ReportSubjectType;
  subjectId: number;
}) {
  const t = useTranslations('Report');
  const { toast } = useToast();
  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  return (
    <Modal title={t(`title.${subjectType}`)} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await reports.submit(subjectType, subjectId, reason, details.trim() || undefined);
            onClose();
            setDetails('');
            toast(t('received'), 'success');
          } catch (err) {
            toast(err instanceof Error ? err.message : t('failed'), 'error');
          } finally {
            setSubmitting(false);
          }
        }}
        className="space-y-3"
      >
        <p className="text-sm text-muted">
          {t.rich('intro', {
            link: (chunks) => (
              <Link href="/tos#content" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="harassment">{t('reasons.harassment')}</option>
          <option value="illegal">{t('reasons.illegalOrInappropriate')}</option>
          <option value="spam">{t('reasons.spam')}</option>
          <option value="other">{t('reasons.other')}</option>
        </Select>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t('detailsPlaceholder')}
          rows={3}
          maxLength={2000}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="danger" type="submit" disabled={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
