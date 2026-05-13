'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useToast } from '@/lib/toast-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { pots as potsApi, creators as creatorsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import CreatorSearchWidget from '@/components/CreatorSearchWidget';
import type { Creator } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, FieldLabel, FieldHint } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';

type CreatorMode = 'search' | 'create';

function NewPotForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCreatorId = searchParams.get('creator_id');

  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [initialVotiveAmount, setInitialVotiveAmount] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const [creatorId, setCreatorId] = useState(prefillCreatorId ?? '');
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('search');

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

  useEffect(() => {
    if (prefillCreatorId) {
      creatorsApi.get(Number(prefillCreatorId)).then((res) => {
        setSelectedCreator(res.data);
        setCreatorId(String(res.data.id));
      });
    }
  }, [prefillCreatorId]);

  const selectCreator = (s: Creator) => {
    setSelectedCreator(s);
    setCreatorId(String(s.id));
  };

  const clearCreator = () => {
    setSelectedCreator(null);
    setCreatorId('');
    setCreatorMode('search');
  };

  const openCreateMode = (prefill?: string) => {
    setNewDisplayName(prefill ?? '');
    setNewHandles({ youtube_handle: '', twitter_handle: '', tiktok_handle: '', instagram_handle: '', domain: '', wikipedia_url: '', soundcloud_url: '', bandcamp_url: '' });
    setCreateError('');
    setCreatorMode('create');
  };

  const hasAtLeastOneHandle = Object.values(newHandles).some((v) => v.trim().length > 0);

  const preventEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const handleCreateCreator = async () => {
    if (!hasAtLeastOneHandle) {
      setCreateError('Please fill in at least one social handle or website.');
      return;
    }
    setCreateError('');
    setCreatingNew(true);
    try {
      const handles = Object.fromEntries(Object.entries(newHandles).filter(([, v]) => v.trim().length > 0));
      const res = await creatorsApi.create({ display_name: newDisplayName, ...handles });
      selectCreator(res.data);
      setCreatorMode('search');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCreateError(e.message ?? 'Failed to create creator profile.');
    } finally {
      setCreatingNew(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!creatorId) {
      toast('Please select or create a creator for this bounty.', 'error');
      return;
    }
    const amount = parseFloat(initialVotiveAmount);
    if (isNaN(amount) || amount < 1) {
      toast('Minimum opening commitment is $1.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await potsApi.create({
        title,
        description: description || undefined,
        creator_id: Number(creatorId),
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
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="font-display text-muted mb-4">you need to be logged in to create a bounty.</p>
        <Link href="/login"><Button variant="primary">sign in →</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] space-y-7 pt-2">
      <div>
        <SectionLabel>fan</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">start a bounty</h1>
        <p className="font-display text-sm text-muted mt-1">name the work. the community will fund it.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Creator */}
        <Card>
          <SectionLabel className="mb-3">who should do this?</SectionLabel>

          {creatorMode !== 'create' ? (
            <CreatorSearchWidget
              selectedCreator={selectedCreator}
              onSelect={selectCreator}
              onClear={clearCreator}
              onCreateNew={openCreateMode}
              placeholder="search by name… e.g. The Weeknd"
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-creator">new creator profile</span>
                <button type="button" onClick={() => setCreatorMode('search')} className="ap-inline-link font-mono text-[10px] uppercase cursor-pointer">
                  ← back to search
                </button>
              </div>

              <div>
                <FieldLabel>name <span className="text-bad">*</span></FieldLabel>
                <Input
                  type="text"
                  maxLength={255}
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  onKeyDown={preventEnter}
                  placeholder="e.g. Kendrick Lamar"
                  autoFocus
                />
              </div>

              <div>
                <FieldLabel>socials / website <span className="text-bad">* (at least one)</span></FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'youtube_handle',   label: 'YouTube',     placeholder: '@mrbeast' },
                    { key: 'twitter_handle',   label: 'X / Twitter', placeholder: '@elonmusk' },
                    { key: 'tiktok_handle',    label: 'TikTok',      placeholder: '@zachking' },
                    { key: 'instagram_handle', label: 'Instagram',   placeholder: '@alexathanacio' },
                    { key: 'wikipedia_url',    label: 'Wikipedia',   placeholder: 'en.wikipedia.org/wiki/…' },
                    { key: 'soundcloud_url',   label: 'SoundCloud',  placeholder: 'soundcloud.com/…' },
                    { key: 'bandcamp_url',     label: 'Bandcamp',    placeholder: 'name.bandcamp.com' },
                    { key: 'domain',           label: 'Other URL',   placeholder: 'rumble.com/c/…' },
                  ] as const).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <FieldLabel className="mb-1">{label}</FieldLabel>
                      <Input
                        type="text"
                        value={newHandles[key]}
                        onChange={(e) => setNewHandles((prev) => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={preventEnter}
                        placeholder={placeholder}
                        className={newHandles[key].trim() ? 'border-creator/60' : ''}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {createError && <Banner tone="bad">{createError}</Banner>}

              <Button
                type="button"
                variant="primary"
                className="w-full justify-center"
                disabled={creatingNew || !newDisplayName.trim() || !hasAtLeastOneHandle}
                onClick={handleCreateCreator}
              >
                {creatingNew ? 'creating…' : 'create & select'}
              </Button>

              <p className="font-display text-xs text-muted">
                they can claim control of this profile later. you can add a bio and picture before they claim it.
              </p>
            </div>
          )}
        </Card>

        {/* Title */}
        <Card>
          <SectionLabel className="mb-3">what should they make?</SectionLabel>
          <FieldLabel>title</FieldLabel>
          <Input
            type="text"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. do a backflip while singing the national anthem"
          />
          <div className="mt-4">
            <FieldLabel>description <span className="text-muted font-normal">(optional)</span></FieldLabel>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="what specifically must be done? any requirements?"
            />
          </div>
        </Card>

        {/* Opening commitment */}
        <Card>
          <SectionLabel className="mb-3">your opening commitment</SectionLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted text-sm select-none">$</span>
            <Input
              type="number"
              required
              min={1}
              max={999999.99}
              step="0.01"
              value={initialVotiveAmount}
              onChange={(e) => setInitialVotiveAmount(e.target.value)}
              className="pl-7"
            />
          </div>
          <FieldHint>minimum $1. you are only charged if council confirms the bounty is completed.</FieldHint>
        </Card>

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          disabled={submitting}
        >
          {submitting ? 'creating…' : 'create bounty'}
        </Button>
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
