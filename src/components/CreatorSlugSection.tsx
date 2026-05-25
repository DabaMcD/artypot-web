'use client';

import { useEffect, useState, useCallback } from 'react';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
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
      toast(`Slug updated to /${res.slug}.`, 'success');
      setView('show');
      fetchInfo();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to update slug.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="slug">
      <Card>
        <SectionLabel className="mb-3">creator URL</SectionLabel>
        <p className="text-sm text-muted mb-4">
          Your public creator page lives at this URL. You can change it once every {info.cooldown_days} days,
          and old URLs will keep redirecting here.
        </p>

        {view === 'show' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-base text-foreground">
              artypot.com/<span className="text-creator">{info.slug}</span>
            </span>
            <Button variant="default" size="sm" onClick={startEditing}>change →</Button>
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
              You changed your slug recently — you can change it again on{' '}
              <span className="text-foreground">{cooldownUntil!.toLocaleDateString()}</span>.
            </Banner>
            <button
              type="button"
              onClick={cancelEditing}
              className="text-xs font-mono text-muted hover:text-foreground cursor-pointer transition-colors"
            >
              ← never mind
            </button>
          </div>
        )}

        {view === 'editing' && (
          <div className="space-y-4">
            <SlugInput
              value={newSlug}
              onChange={setNewSlug}
              label="new creator URL"
              onValidityChange={setSlugError}
            />

            <Banner tone="warn">
              Changing your slug starts a {info.cooldown_days}-day cooldown.
              The previous URL <span className="font-mono">/{info.slug}</span> will redirect here forever.
            </Banner>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={cancelEditing} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || slugError !== null || newSlug === info.slug}>
                {saving ? 'Saving…' : 'Save New URL'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
