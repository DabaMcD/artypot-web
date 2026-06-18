'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useDateFormats } from '@/lib/format';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import SlugInput from '@/components/SlugInput';

interface SlugInfo {
  slug: string | null;
  slug_changed_at: string | null;
  cooldown_until: string | null;
  cooldown_days: number;
}

/**
 * Settings card: view + change the creator's artypot.com/{slug}.
 * Hidden entirely for non-creators (they pick their slug at become-creator time).
 */
export default function CreatorSlugSection() {
  const t = useTranslations('CreatorSlugSection');
  const dateFormats = useDateFormats();
  const { user } = useAuth();
  const { toast } = useToast();

  const [info, setInfo] = useState<SlugInfo | null>(null);
  // 'show'    — default: displays current slug + change button
  // 'blocked' — user clicked change while on cooldown; show the gate
  // 'editing' — user clicked change and is free to edit
  const [view, setView] = useState<'show' | 'blocked' | 'editing'>('show');
  const [newSlug, setNewSlug] = useState('');
  const [slugError, setSlugError] = useState<string | null>('Slug is required.');
  const [saving, setSaving] = useState(false);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await authApi.getSlug();
      setInfo(res);
    } catch {
      // ignore — non-fatal
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'creator') fetchInfo();
  }, [user, fetchInfo]);

  // Hide entirely for non-creators.
  if (!user || user.role !== 'creator') return null;
  if (!info) return null;

  const cooldownUntil = info.cooldown_until ? new Date(info.cooldown_until) : null;
  const onCooldown = cooldownUntil !== null && cooldownUntil > new Date();

  const startEditing = () => {
    if (onCooldown) {
      setView('blocked');
    } else {
      setView('editing');
      setNewSlug(info.slug ?? '');
      setSlugError(null);
    }
  };

  const cancelEditing = () => {
    setView('show');
    setNewSlug('');
    setSlugError(null);
  };

  const handleSave = async () => {
    if (slugError !== null || !newSlug) return;
    setSaving(true);
    try {
      const res = await authApi.updateSlug(newSlug);
      toast(t('toastUpdated', { slug: res.slug }), 'success');
      setView('show');
      fetchInfo();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toastFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="slug">
      <Card>
        <SectionLabel className="mb-3">{t('sectionLabel')}</SectionLabel>
        <p className="text-sm text-muted mb-4">
          {t('description')}
        </p>

        {view === 'show' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-base text-foreground">
              artypot.com/<span className="text-creator">{info.slug}</span>
            </span>
            <Button variant="default" size="sm" onClick={startEditing}>{t('changeButton')}</Button>
          </div>
        )}

        {view === 'blocked' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-base text-foreground">
                artypot.com/<span className="text-creator">{info.slug}</span>
              </span>
            </div>
            <Banner tone="default">
              {t.rich('cooldownBanner', {
                date: () => (
                  <span className="text-foreground">{dateFormats.short(info.cooldown_until!)}</span>
                ),
              })}
            </Banner>
            <button
              type="button"
              onClick={cancelEditing}
              className="text-xs font-mono text-muted hover:text-foreground cursor-pointer transition-colors"
            >
              {t('neverMind')}
            </button>
          </div>
        )}

        {view === 'editing' && (
          <div className="space-y-4">
            <SlugInput
              value={newSlug}
              onChange={setNewSlug}
              label={t('newUrlLabel')}
              onValidityChange={setSlugError}
            />

            <Banner tone="warn">
              {t.rich('cooldownWarning', {
                days: info.cooldown_days,
                slug: () => <span className="font-mono">/{info.slug}</span>,
              })}
            </Banner>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={cancelEditing} disabled={saving}>{t('cancelButton')}</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || slugError !== null || newSlug === info.slug}>
                {saving ? t('savingButton') : t('saveButton')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
