'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { admin, pots as potsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Pot } from '@/lib/types';

interface Slot {
  pot_id: string;
  preview: Pot | null;
  previewError: string;
  previewing: boolean;
}

const EMPTY_SLOT: Slot = { pot_id: '', preview: null, previewError: '', previewing: false };

export default function FeaturedPotsAdminPage() {
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
      const res = await admin.getFeaturedPots();
      const next: [Slot, Slot, Slot] = [{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }];
      res.data.forEach(({ position, pot }) => {
        const idx = position - 1;
        if (idx >= 0 && idx < 3 && pot) {
          next[idx] = { pot_id: String(pot.id), preview: pot, previewError: '', previewing: false };
        }
      });
      setSlots(next);
    } catch {
      setError('Failed to load current featured pots.');
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
      const res = await potsApi.get(Number(trimmed));
      setSlots((prev) => {
        const next = [...prev] as [Slot, Slot, Slot];
        next[idx] = { ...next[idx], previewing: false, preview: res.data, previewError: '' };
        return next;
      });
    } catch {
      setSlots((prev) => {
        const next = [...prev] as [Slot, Slot, Slot];
        next[idx] = { ...next[idx], previewing: false, preview: null, previewError: `Pot #${trimmed} not found.` };
        return next;
      });
    }
  };

  const handleIdChange = (idx: number, value: string) => {
    setSlots((prev) => {
      const next = [...prev] as [Slot, Slot, Slot];
      next[idx] = { ...next[idx], pot_id: value, preview: null, previewError: '' };
      return next;
    });
  };

  const handleSave = async () => {
    setError('');
    const filled = slots.filter((s) => s.pot_id.trim());
    if (filled.length === 0) {
      setError('Add at least one bounty ID.');
      return;
    }
    if (filled.some((s) => !s.preview)) {
      setError('Preview each pot before saving (click outside the input or press Tab).');
      return;
    }

    setSaving(true);
    try {
      await admin.setFeaturedPots(
        filled.map((s) => ({ pot_id: Number(s.pot_id.trim()) }))
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
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Admin
        </Link>
      </div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-1">Featured Bounties</h1>
      <p className="text-sm text-muted mb-8">
        These 3 bounties appear on the landing page for logged-out visitors.
        Enter a bounty ID in each slot, preview it, then save.
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {slots.map((slot, idx) => (
            <div key={idx} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-fan font-mono text-sm font-bold w-6 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Bounty ID"
                  value={slot.pot_id}
                  onChange={(e) => handleIdChange(idx, e.target.value)}
                  onBlur={(e) => previewSlot(idx, e.target.value)}
                  className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
                />
                {slot.previewing && (
                  <span className="text-xs text-muted">Loading…</span>
                )}
              </div>

              {slot.preview && (
                <div className="ml-10 bg-surface-2 border border-fan/20 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {slot.preview.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {slot.preview.creator?.display_name ?? '—'}
                    {' · '}
                    <span className="capitalize">{String(slot.preview.status).replace('_', ' ')}</span>
                    {' · '}
                    ${Number(slot.preview.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {slot.previewError && (
                <p className="ml-10 text-xs text-red-400 mt-1">{slot.previewError}</p>
              )}

              {!slot.pot_id && !slot.previewError && (
                <p className="ml-10 text-xs text-muted">Empty — leave blank to feature fewer than 3 pots.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-4">{error}</p>
      )}

      {savedAt && !error && (
        <p className="text-sm text-creator mb-4">
          Saved at {savedAt.toLocaleTimeString()}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-fan text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-fan-dim disabled:opacity-40 transition-colors text-sm"
        >
          {saving ? 'Saving…' : 'Save Featured Bounties'}
        </button>
        <button
          onClick={load}
          disabled={loading || saving}
          className="text-sm text-muted hover:text-foreground transition-colors disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
