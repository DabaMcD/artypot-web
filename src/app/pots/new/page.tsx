'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useToast } from '@/lib/toast-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { pots as potsApi, summons as summonsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
  const [submitting, setSubmitting] = useState(false);

  // Creator selection
  const [summonId, setSummonId] = useState(prefillSummonId ?? '');
  const [selectedSummon, setSelectedSummon] = useState<Summon | null>(null);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('search');

  // Search state
  const [summonSearch, setSummonSearch] = useState('');
  const [summonResults, setSummonResults] = useState<Summon[]>([]);

  // Inline create state
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newHandles, setNewHandles] = useState({
    youtube_handle: '',
    twitter_handle: '',
    tiktok_handle: '',
    instagram_handle: '',
    domain: '',
    wikipedia_handle: '',
    soundcloud_handle: '',
    bandcamp_handle: '',
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

  // Debounced summon search
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

  const selectSummon = (s: Summon) => {
    setSelectedSummon(s);
    setSummonId(String(s.id));
    setSummonResults([]);
    setSummonSearch('');
  };

  const clearCreator = () => {
    setSelectedSummon(null);
    setSummonId('');
    setSummonSearch('');
    setSummonResults([]);
    setCreatorMode('search');
  };

  const openCreateMode = (prefill?: string) => {
    setNewDisplayName(prefill ?? summonSearch);
    setNewHandles({
      youtube_handle: '',
      twitter_handle: '',
      tiktok_handle: '',
      instagram_handle: '',
      domain: '',
      wikipedia_handle: '',
      soundcloud_handle: '',
      bandcamp_handle: '',
    });
    setCreateError('');
    setSummonResults([]);
    setCreatorMode('create');
  };

  const hasAtLeastOneHandle = Object.values(newHandles).some((v) => v.trim().length > 0);

  const handleCreateSummon = async (e: FormEvent) => {
    e.preventDefault();
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
      toast('Please select or create a creator for this pot.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await potsApi.create({
        title,
        description: description || undefined,
        summon_id: Number(summonId),
      });
      toast('Pot created!', 'success');
      setTimeout(() => router.push(`/pots/${res.data.id}`), 700);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to create pot.', 'error');
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
        {/* Title */}
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

        {/* Description */}
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

        {/* Creator */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Creator</label>

          {/* Selected */}
          {selectedSummon ? (
            <div className="flex items-center justify-between bg-surface-2 border border-creator/30 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: '#47DFD3', color: '#0a0a0a' }}
                >
                  {selectedSummon.display_name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-creator font-medium">
                  {selectedSummon.display_name}
                </span>
                {!selectedSummon.claimed_at && (
                  <span className="text-xs text-muted">(unclaimed)</span>
                )}
              </div>
              <button
                type="button"
                onClick={clearCreator}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Change
              </button>
            </div>
          ) : creatorMode === 'create' ? (
            /* ── Inline create form ── */
            <div className="bg-surface-2 border border-creator/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-creator uppercase tracking-wider">
                  New creator profile
                </span>
                <button
                  type="button"
                  onClick={() => setCreatorMode('search')}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  ← Back to search
                </button>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required={creatorMode === 'create'}
                  maxLength={255}
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Kendrick Lamar"
                  autoFocus
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-creator transition-colors"
                />
              </div>

              {/* Social handles — at least one required */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-xs text-muted">
                    Socials / Website <span className="text-red-400">*</span>
                  </label>
                  <span className="text-xs text-muted">at least one</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: 'youtube_handle',    label: 'YouTube',      placeholder: 'channel name' },
                      { key: 'twitter_handle',    label: 'X / Twitter',  placeholder: 'username' },
                      { key: 'tiktok_handle',     label: 'TikTok',       placeholder: 'username' },
                      { key: 'instagram_handle',  label: 'Instagram',    placeholder: 'username' },
                      { key: 'domain',            label: 'Website',      placeholder: 'example.com' },
                      { key: 'wikipedia_handle',  label: 'Wikipedia',    placeholder: 'article title' },
                      { key: 'soundcloud_handle', label: 'SoundCloud',   placeholder: 'username' },
                      { key: 'bandcamp_handle',   label: 'Bandcamp',     placeholder: 'username' },
                    ] as const
                  ).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs text-muted mb-0.5">{label}</label>
                      <input
                        type="text"
                        value={newHandles[key]}
                        onChange={(e) =>
                          setNewHandles((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={placeholder}
                        className={`w-full bg-surface border rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none transition-colors ${
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

              <p className="text-xs text-muted">
                The creator can claim this profile later. You can add a bio, fan name, and profile
                picture from their page.
              </p>
            </div>
          ) : (
            /* ── Search mode ── */
            <div className="relative">
              <input
                type="text"
                value={summonSearch}
                onChange={(e) => setSummonSearch(e.target.value)}
                placeholder="Search for a creator…"
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
              />

              {/* Dropdown: results + create option */}
              {(summonResults.length > 0 || summonSearch.trim().length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                  {summonResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectSummon(s)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-border transition-colors flex items-center gap-2"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: '#47DFD3', color: '#0a0a0a' }}
                      >
                        {s.display_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-foreground">{s.display_name}</span>
                      {!s.claimed_at && (
                        <span className="text-muted text-xs">(unclaimed)</span>
                      )}
                    </button>
                  ))}

                  {/* Divider only if there are results above */}
                  {summonResults.length > 0 && (
                    <div className="border-t border-border" />
                  )}

                  <button
                    type="button"
                    onClick={() => openCreateMode(summonSearch.trim() || undefined)}
                    className="w-full text-left px-4 py-2.5 text-sm text-creator hover:bg-border transition-colors flex items-center gap-2"
                  >
                    <span className="text-lg leading-none">+</span>
                    {summonSearch.trim()
                      ? <>Add <span className="font-semibold">&ldquo;{summonSearch.trim()}&rdquo;</span> as a new creator</>
                      : 'Create a new creator profile'}
                  </button>
                </div>
              )}

              {/* Persistent create link when dropdown isn't open */}
              {summonSearch.trim().length === 0 && (
                <button
                  type="button"
                  onClick={() => openCreateMode()}
                  className="mt-2 text-xs text-creator hover:underline"
                >
                  + Create a new creator profile
                </button>
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
