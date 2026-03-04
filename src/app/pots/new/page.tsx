'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { pots as potsApi, summons as summonsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Summon } from '@/lib/types';

function NewPotForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillSummonId = searchParams.get('summon_id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [summonId, setSummonId] = useState(prefillSummonId ?? '');
  const [summonSearch, setSummonSearch] = useState('');
  const [summonResults, setSummonResults] = useState<Summon[]>([]);
  const [selectedSummon, setSelectedSummon] = useState<Summon | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If prefillSummonId, load that summon
  useEffect(() => {
    if (prefillSummonId) {
      summonsApi.get(Number(prefillSummonId)).then((res) => {
        setSelectedSummon(res.data);
        setSummonId(String(res.data.id));
      });
    }
  }, [prefillSummonId]);

  // Search summons
  useEffect(() => {
    if (!summonSearch || selectedSummon) return;
    const t = setTimeout(async () => {
      try {
        const res = await summonsApi.list({ q: summonSearch });
        setSummonResults(res.data.slice(0, 5));
      } catch {
        // ignore
      }
    }, 350);
    return () => clearTimeout(t);
  }, [summonSearch, selectedSummon]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!summonId) {
      setError('Please select a creator for this pot.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await potsApi.create({
        title,
        description: description || undefined,
        summon_id: Number(summonId),
      });
      router.push(`/pots/${res.data.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to create pot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-muted">
        <p className="mb-4">You need to be logged in to create a pot.</p>
        <Link href="/login" className="text-brand hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Create a Pot</h1>
        <p className="text-muted text-sm">Name the work. The community will fund it.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-border rounded-xl p-6 space-y-5"
      >
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
          <input
            type="text"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New album from The Weeknd"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Description <span className="text-muted font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What specifically should be made? Any requirements?"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Creator</label>
          {selectedSummon ? (
            <div className="flex items-center justify-between bg-surface-2 border border-creator/30 rounded-lg px-3 py-2.5">
              <span className="text-sm text-creator font-medium">{selectedSummon.display_name}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedSummon(null);
                  setSummonId('');
                  setSummonSearch('');
                }}
                className="text-xs text-muted hover:text-foreground"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={summonSearch}
                onChange={(e) => setSummonSearch(e.target.value)}
                placeholder="Search for a creator…"
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
              />
              {summonResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                  {summonResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSummon(s);
                        setSummonId(String(s.id));
                        setSummonResults([]);
                        setSummonSearch('');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-border transition-colors"
                    >
                      <span className="text-foreground">{s.display_name}</span>
                      {!s.claimed_at && (
                        <span className="text-muted text-xs ml-2">(unclaimed)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-black font-semibold py-2.5 rounded-lg hover:bg-brand-dim transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Pot'}
        </button>
      </form>
    </div>
  );
}

export default function NewPotPage() {
  return (
    <Suspense>
      <NewPotForm />
    </Suspense>
  );
}
