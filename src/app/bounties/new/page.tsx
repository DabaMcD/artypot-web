'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useToast } from '@/lib/toast-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { pots as potsApi, summons as summonsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import SummonSearchWidget from '@/components/SummonSearchWidget';
import type { Summon } from '@/lib/types';

type CreatorMode = 'search' | 'create';

function NewPotForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillSummonId = searchParams.get('summon_id');

  const { toast } = useToast();

  // Pot fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [initialVotiveAmount, setInitialVotiveAmount] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // Creator selection
  const [summonId, setSummonId] = useState(prefillSummonId ?? '');
  const [selectedSummon, setSelectedSummon] = useState<Summon | null>(null);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('search');

  // Inline create state
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newHandles, setNewHandles] = useState({
    youtube_handle: '',
    twitter_handle: '',
    tiktok_handle: '',
    instagram_handle: '',
    domain: '',
    wikipedia_url: '',
    soundcloud_url: '',
    bandcamp_url: '',
  });
  const [creatingNew, setCreatingNew] = useState(false);
  const [createError, setCreateError] = useState('');

  // If prefillSummonId, load that summon
  useEffect(() => {
    if (prefillSummonId) {
      summonsApi.get(Number(prefillSummonId)).then((res) => {
        setSelectedSummon(res.data);
        setSummonId(String(res.data.id));
      });
    }
  }, [prefillSummonId]);

  const selectSummon = (s: Summon) => {
    setSelectedSummon(s);
    setSummonId(String(s.id));
  };

  const clearCreator = () => {
    setSelectedSummon(null);
    setSummonId('');
    setCreatorMode('search');
  };

  const openCreateMode = (prefill?: string) => {
    setNewDisplayName(prefill ?? '');
    setNewHandles({
      youtube_handle: '',
      twitter_handle: '',
      tiktok_handle: '',
      instagram_handle: '',
      domain: '',
      wikipedia_url: '',
      soundcloud_url: '',
      bandcamp_url: '',
    });
    setCreateError('');
    setCreatorMode('create');
  };

  const hasAtLeastOneHandle = Object.values(newHandles).some((v) => v.trim().length > 0);

  // Prevent Enter key inside the create section from submitting the outer bounty form
  const preventEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const handleCreateSummon = async () => {
    if (!hasAtLeastOneHandle) {
      setCreateError('Please fill in at least one social handle or website.');
      return;
    }
    setCreateError('');
    setCreatingNew(true);
    try {
      // Strip empty handle fields so we don't send empty strings
      const handles = Object.fromEntries(
        Object.entries(newHandles).filter(([, v]) => v.trim().length > 0),
      );
      const res = await summonsApi.create({ display_name: newDisplayName, ...handles });
      selectSummon(res.data);
      setCreatorMode('search');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCreateError(e.message ?? 'Failed to create creator profile.');
    } finally {
      setCreatingNew(false);
    }
  };

  // Main pot submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!summonId) {
      toast('Please select or create a creator for this bounty.', 'error');
      return;
    }
    const amount = parseFloat(initialVotiveAmount);
    if (isNaN(amount) || amount < 1) {
      toast('Initial pledge must be at least $1.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await potsApi.create({
        title,
        description: description || undefined,
        summon_id: Number(summonId),
        initial_votive_amount: amount,
      });
      toast('Bounty created!', 'success');
      setTimeout(() => router.push(`/bounties/${res.data.id}`), 700);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to create bounty.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-muted">
        <p className="mb-4">You need to be logged in to create a bounty.</p>
        <Link href="/login" className="text-brand hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Create a Bounty</h1>
        <p className="text-muted text-sm">Name the work. The community will fund it.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-border rounded-xl p-6 space-y-5"
      >
        {/* Creator — first so the pot is anchored before anything else */}
        <div>
          <label className="flex items-baseline justify-between mb-1.5">
            <span className="text-s font-medium text-foreground">Summon</span>
            <span className="text-sm text-muted font-normal">(Who's doing the work?)</span>
          </label>

          {/* ── Search widget (controlled) or create panel ── */}
          {creatorMode !== 'create' ? (
            <SummonSearchWidget
              selectedSummon={selectedSummon}
              onSelect={selectSummon}
              onClear={clearCreator}
              onCreateNew={openCreateMode}
              placeholder="Search by name… e.g. The Weeknd"
            />
          ) : (
            /* ── Inline create panel ── */
            <div className="bg-surface-2 border border-creator/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-creator uppercase tracking-wider">
                  New creator profile
                </span>
                <button
                  type="button"
                  onClick={() => setCreatorMode('search')}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  ← Back to search
                </button>
              </div>

              <div>
                <label className="block text-s text-muted mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  onKeyDown={preventEnter}
                  placeholder="e.g. Kendrick Lamar"
                  autoFocus
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-creator transition-colors"
                />
              </div>

              {/* Social handles — at least one required */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-s text-muted">
                    Socials / Website <span className="text-sm text-red-400">* (at least one)</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: 'youtube_handle',  label: 'YouTube',     placeholder: 'handle e.g. @mrbeast' },
                      { key: 'twitter_handle',  label: 'X / Twitter', placeholder: 'handle e.g. @elonmusk' },
                      { key: 'tiktok_handle',   label: 'TikTok',      placeholder: 'handle e.g. @zachking' },
                      { key: 'instagram_handle',label: 'Instagram',   placeholder: 'handle e.g. @alexathanacio' },
                      { key: 'wikipedia_url',   label: 'Wikipedia',   placeholder: 'en.wikipedia.org/wiki/Keanu_Reeves' },
                      { key: 'soundcloud_url',  label: 'SoundCloud',  placeholder: 'soundcloud.com/black-veil-brides-official' },
                      { key: 'bandcamp_url',    label: 'Bandcamp',    placeholder: 'lovesolfege.bandcamp.com' },
                      { key: 'domain',          label: 'Other URL',   placeholder: 'rumble.com/c/nickjfuentes' },
                    ] as const
                  ).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm text-muted mb-0.5">{label}</label>
                      <input
                        type="text"
                        value={newHandles[key]}
                        onChange={(e) =>
                          setNewHandles((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        onKeyDown={preventEnter}
                        placeholder={placeholder}
                        className={`w-full bg-surface border rounded px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                          newHandles[key].trim()
                            ? 'border-creator/60 focus:border-creator'
                            : 'border-border focus:border-creator/60'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {createError && (
                <p className="text-red-400 text-xs">{createError}</p>
              )}

              <button
                type="button"
                onClick={handleCreateSummon}
                disabled={creatingNew || !newDisplayName.trim() || !hasAtLeastOneHandle}
                className="w-full bg-creator text-black font-semibold py-2 text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {creatingNew ? 'Creating…' : 'Create & Select'}
              </button>

              <p className="text-sm text-muted">
                They can claim control of this profile later. You can add a bio and profile
                picture for them before they claim it.
              </p>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-s font-medium text-foreground mb-1.5">Title</label>
          <input
            type="text"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Do a backflip while singing the national anthem"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-s font-medium text-foreground mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What specifically must be done? Any requirements?"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors resize-none"
          />
        </div>

        {/* Initial pledge amount */}
        <div>
          <label className="block text-s font-medium text-foreground mb-1.5">
            Your opening pledge
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm select-none">$</span>
            <input
              type="number"
              required
              min={1}
              max={999999.99}
              step="0.01"
              value={initialVotiveAmount}
              onChange={(e) => setInitialVotiveAmount(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <p className="text-sm text-muted mt-1.5">
            Minimum $1. You are only charged if Council confirms the bounty is completed.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-black font-semibold py-2.5 rounded-lg hover:bg-brand-dim transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Bounty'}
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
