'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { overlord as overlordApi, type BountyEasterEggRow } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

const ACCENT = '#8A2BE2';
const PRESET = 'bad-apple';

export default function OverlordEasterEggsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<BountyEasterEggRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const fetchRows = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await overlordApi.listBountyEasterEggs(query);
      setRows(res.data);
    } catch {
      toast('Failed to load bounties.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
    fetchRows('');
  }, [user, authLoading, router, fetchRows]);

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); fetchRows(q); };

  const applyUpdate = (id: number, easterEgg: string | null) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, easter_egg: easterEgg } : r)));

  if (authLoading || (!user?.is_overlord && !authLoading)) {
    return null; // redirect in useEffect
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-mono mb-3">
          <Link href="/obelisk" className="hover:underline text-muted">← Obelisk</Link>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🍎</span>
          <h1 className="text-2xl font-display font-bold text-foreground">Easter Eggs</h1>
        </div>
        <p className="text-sm text-muted">
          Tag a bounty so that backing it triggers an easter egg. Set{' '}
          <code className="text-foreground">bad-apple</code> to summon the Bad Apple takeover
          (any backing of <span className="text-foreground">$3.39</span> also triggers it).
        </p>
      </div>

      {/* Search */}
      <div className="bg-surface border border-[#8A2BE2]/30 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: ACCENT }}>
          Find a bounty
        </h2>
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            type="search"
            placeholder="bounty id or title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={loading}
            className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[#8A2BE2]/60 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: ACCENT, color: '#fff' }}
          >
            Search
          </button>
        </form>
        <p className="text-xs text-muted/70 mt-2">Empty search lists bounties that are already tagged.</p>
      </div>

      {/* Results */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: ACCENT }}>
          {q.trim() ? 'Results' : 'Currently tagged'}
          {!loading && (
            <span className="ml-2 font-normal text-muted normal-case tracking-normal">
              ({rows.length})
            </span>
          )}
        </h2>

        {loading ? (
          <div className="py-6 flex justify-center">
            <div className="w-5 h-5 border-2 border-[#8A2BE2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted py-2">
            {q.trim() ? 'No bounties matched.' : 'No bounties are tagged yet — search to tag one.'}
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <EggRow key={r.id} row={r} onSaved={applyUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EggRow({
  row,
  onSaved,
}: {
  row: BountyEasterEggRow;
  onSaved: (id: number, easterEgg: string | null) => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(row.easter_egg ?? '');
  const [saving, setSaving] = useState(false);

  const dirty = (value.trim() || null) !== (row.easter_egg ?? null);

  const save = async (next: string | null) => {
    setSaving(true);
    try {
      const res = await overlordApi.setBountyEasterEgg(row.id, next);
      onSaved(row.id, res.data.easter_egg);
      setValue(res.data.easter_egg ?? '');
      toast(
        res.data.easter_egg
          ? `Tagged “${res.data.title}” as ${res.data.easter_egg}.`
          : `Cleared the tag on “${res.data.title}”.`,
        'success',
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to update bounty.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface-2 border border-border rounded-lg px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-foreground truncate">
          <span className="text-muted font-mono mr-2">#{row.id}</span>
          {row.title}
        </p>
        <span className="shrink-0 text-xs font-mono text-muted">{row.status ?? ''}</span>
      </div>
      {row.target && <p className="text-xs text-muted mb-2 truncate">{row.target}</p>}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="(no tag)"
          disabled={saving}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-[#8A2BE2]/60 transition-colors disabled:opacity-50"
        />
        {value !== PRESET && (
          <button
            type="button"
            onClick={() => setValue(PRESET)}
            disabled={saving}
            className="shrink-0 text-xs text-muted hover:text-foreground border border-border rounded-lg px-2.5 py-2 transition-colors disabled:opacity-40"
          >
            🍎 bad-apple
          </button>
        )}
        <button
          type="button"
          onClick={() => save(value.trim() || null)}
          disabled={saving || !dirty}
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          style={{ background: ACCENT, color: '#fff' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {row.easter_egg && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={saving}
            className="shrink-0 text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-40"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}
