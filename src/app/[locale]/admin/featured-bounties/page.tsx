'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { admin, bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Bounty } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';

interface Slot {
  bounty_id: string;
  preview: Bounty | null;
  previewError: string;
  previewing: boolean;
}

const EMPTY_SLOT: Slot = { bounty_id: '', preview: null, previewError: '', previewing: false };

export default function FeaturedBountiesAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [slots, setSlots] = useState<[Slot, Slot, Slot]>([
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin.getFeaturedBounties();
      const next: [Slot, Slot, Slot] = [{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }];
      res.data.forEach(({ position, bounty }) => {
        const idx = position - 1;
        if (idx >= 0 && idx < 3 && bounty) {
          next[idx] = { bounty_id: String(bounty.id), preview: bounty, previewError: '', previewing: false };
        }
      });
      setSlots(next);
    } catch {
      setError('Failed to load current featured bounties.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') load();
  }, [user, load]);

  const previewSlot = async (idx: number, rawId: string) => {
    const trimmed = rawId.trim();
    if (!trimmed || isNaN(Number(trimmed))) {
      setSlots((prev) => {
        const next = [...prev] as [Slot, Slot, Slot];
        next[idx] = { ...next[idx], preview: null, previewError: trimmed ? 'Enter a valid bounty ID.' : '' };
        return next;
      });
      return;
    }

    setSlots((prev) => {
      const next = [...prev] as [Slot, Slot, Slot];
      next[idx] = { ...next[idx], previewing: true, previewError: '', preview: null };
      return next;
    });

    try {
      const res = await bountiesApi.get(Number(trimmed));
      setSlots((prev) => {
        const next = [...prev] as [Slot, Slot, Slot];
        next[idx] = { ...next[idx], previewing: false, preview: res.data, previewError: '' };
        return next;
      });
    } catch {
      setSlots((prev) => {
        const next = [...prev] as [Slot, Slot, Slot];
        next[idx] = { ...next[idx], previewing: false, preview: null, previewError: `Bounty #${trimmed} not found.` };
        return next;
      });
    }
  };

  const handleIdChange = (idx: number, value: string) => {
    setSlots((prev) => {
      const next = [...prev] as [Slot, Slot, Slot];
      next[idx] = { ...next[idx], bounty_id: value, preview: null, previewError: '' };
      return next;
    });
  };

  const handleSave = async () => {
    setError('');
    const filled = slots.filter((s) => s.bounty_id.trim());
    if (filled.length === 0) {
      setError('Add at least one bounty ID.');
      return;
    }
    if (filled.some((s) => !s.preview)) {
      setError('Preview each bounty before saving (click outside the input or press Tab).');
      return;
    }

    setSaving(true);
    try {
      await admin.setFeaturedBounties(
        filled.map((s) => ({ bounty_id: Number(s.bounty_id.trim()) }))
      );
      setSavedAt(new Date());
      await load();
    } catch {
      setError('Failed to save. Check bounty IDs and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      {/* Header */}
      <div>
        <SectionLabel className="mb-2">council · admin</SectionLabel>
        <Link href="/admin">
          <Button variant="ghost" size="sm">← Admin</Button>
        </Link>
        <h1 className="font-display font-bold text-[28px] mt-2">Featured Bounties</h1>
        <p className="text-sm text-muted mt-1">
          These 3 bounties appear on the landing page for logged-out visitors.
          Enter a bounty ID in each slot, preview it, then save.
        </p>
      </div>

      {/* Slot cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="h-14 bg-surface-2 animate-pulse rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {slots.map((slot, idx) => (
            <Card key={idx}>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm font-bold text-fan w-6 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Bounty ID"
                    value={slot.bounty_id}
                    onChange={(e) => handleIdChange(idx, e.target.value)}
                    onBlur={(e) => previewSlot(idx, e.target.value)}
                    mono
                  />
                </div>
                {slot.previewing && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Loading…</span>
                )}
              </div>

              {slot.preview && (
                <div className="ml-10 mt-3 bg-surface-2 border border-fan/20 rounded px-4 py-3">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {slot.preview.title}
                  </p>
                  <p className="font-mono text-[10px] text-muted mt-0.5">
                    {slot.preview.owner_user?.display_name ?? '—'}
                    {' · '}
                    <span className="capitalize">{String(slot.preview.status).replace('_', ' ')}</span>
                    {' · '}
                    <span className="tabular-nums">${Number(slot.preview.total_backed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
              )}

              {slot.previewError && (
                <p className="ml-10 mt-2 font-mono text-[10px] uppercase tracking-widest text-bad">
                  {slot.previewError}
                </p>
              )}

              {!slot.bounty_id && !slot.previewError && (
                <p className="ml-10 mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  Empty — leave blank to feature fewer than 3 bounties.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Error / success banners */}
      {error && (
        <Banner tone="bad">{error}</Banner>
      )}

      {savedAt && !error && (
        <Banner tone="good">
          Saved at <span className="font-mono">{savedAt.toLocaleTimeString()}</span>
        </Banner>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Saving…' : 'Save Featured Bounties'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading || saving}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
