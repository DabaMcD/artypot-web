'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary';
import { summons as summonsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Summon } from '@/lib/types';

const HANDLE_FIELDS: { key: keyof Summon; label: string; placeholder: string }[] = [
  { key: 'youtube_handle',    label: 'YouTube',    placeholder: 'channelname' },
  { key: 'twitter_handle',    label: 'X / Twitter', placeholder: 'username' },
  { key: 'tiktok_handle',     label: 'TikTok',     placeholder: 'username' },
  { key: 'instagram_handle',  label: 'Instagram',  placeholder: 'username' },
  { key: 'domain',            label: 'Website',    placeholder: 'example.com' },
  { key: 'wikipedia_handle',  label: 'Wikipedia',  placeholder: 'Artist_Name' },
  { key: 'soundcloud_handle', label: 'SoundCloud', placeholder: 'username' },
  { key: 'bandcamp_handle',   label: 'Bandcamp',   placeholder: 'artist.bandcamp.com' },
];

export default function EditSummonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [summon, setSummon] = useState<Summon | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [fanName, setFanName] = useState('');
  const [fanNamePlural, setFanNamePlural] = useState('');
  const [handles, setHandles] = useState<Record<string, string>>({
    youtube_handle: '', twitter_handle: '', tiktok_handle: '', instagram_handle: '',
    domain: '', wikipedia_handle: '', soundcloud_handle: '', bandcamp_handle: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    summonsApi.get(Number(id))
      .then((res) => {
        const s = res.data;
        if (!s.can_edit) {
          setAccessError("You don't have edit access to this profile.");
          setLoading(false);
          return;
        }
        setSummon(s);
        setDisplayName(s.display_name ?? '');
        setDescription(s.description ?? '');
        setProfilePicture(s.profile_picture ?? '');
        setFanName(s.fan_name ?? '');
        setFanNamePlural(s.fan_name_plural ?? '');
        setHandles({
          youtube_handle:    s.youtube_handle    ?? '',
          twitter_handle:    s.twitter_handle    ?? '',
          tiktok_handle:     s.tiktok_handle     ?? '',
          instagram_handle:  s.instagram_handle  ?? '',
          domain:            s.domain            ?? '',
          wikipedia_handle:  s.wikipedia_handle  ?? '',
          soundcloud_handle: s.soundcloud_handle ?? '',
          bandcamp_handle:   s.bandcamp_handle   ?? '',
        });
        setLoading(false);
      })
      .catch(() => {
        setAccessError('Failed to load summon.');
        setLoading(false);
      });
  }, [id, user, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summon) return;
    setSaving(true);
    setSaveError('');

    // Build payload — only include non-empty handles, pass null to clear
    const handlePayload: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(handles)) {
      handlePayload[key] = val.trim() || null;
    }

    try {
      await summonsApi.update(summon.id, {
        display_name:    displayName.trim() || undefined,
        description:     description.trim() || null,
        profile_picture: profilePicture.trim() || null,
        fan_name:        fanName.trim() || undefined,
        fan_name_plural: fanNamePlural.trim() || undefined,
        ...handlePayload,
      } as Partial<Summon>);
      router.push(`/summons/${id}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setSaveError(e.message ?? 'Failed to save changes.');
      setSaving(false);
    }
  };

  // ── Loading states ────────────────────────────────────────────────────────
  if (authLoading || (loading && !accessError)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-96 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <div className="bg-surface border border-border rounded-xl p-8">
          <p className="text-red-400 mb-4">{accessError}</p>
          <Link href={`/summons/${id}`} className="text-creator hover:underline text-sm">
            ← Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const isClaimed = !!summon?.claimed_at;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'artypot_profiles';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/summons/${id}`} className="text-muted hover:text-foreground transition-colors text-sm">
          ← {summon?.display_name}
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-xl font-bold text-foreground">Edit Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Profile picture ─────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Profile Picture
          </h2>
          <div className="flex items-center gap-5">
            {/* Preview */}
            <div className="shrink-0">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border border-border"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border border-border"
                  style={{ background: '#47DFD3', color: '#0a0a0a' }}
                >
                  {(displayName || summon?.display_name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1">
              {cloudName ? (
                <CldUploadWidget
                  uploadPreset={uploadPreset}
                  options={{ sources: ['local', 'url', 'camera'], cropping: true, croppingAspectRatio: 1, folder: 'artypot/profiles' }}
                  onSuccess={(result: CloudinaryUploadWidgetResults) => {
                    const info = result?.info;
                    if (info && typeof info === 'object' && 'secure_url' in info) {
                      setProfilePicture(info.secure_url as string);
                    }
                  }}
                >
                  {({ open }) => (
                    <button
                      type="button"
                      onClick={() => open()}
                      className="bg-surface-2 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-creator/50 transition-colors"
                    >
                      {profilePicture ? 'Change photo' : 'Upload photo'}
                    </button>
                  )}
                </CldUploadWidget>
              ) : (
                <div>
                  <p className="text-xs text-red-400 mb-2">
                    Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.
                  </p>
                  <input
                    type="url"
                    value={profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    placeholder="https://... (direct image URL)"
                    className="w-full bg-surface-2 border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-creator/50 placeholder:text-muted"
                  />
                </div>
              )}

              {profilePicture && (
                <button
                  type="button"
                  onClick={() => setProfilePicture('')}
                  className="mt-2 text-xs text-muted hover:text-red-400 transition-colors"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Basic info ──────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Basic Info</h2>

          <div>
            <label className="block text-xs text-muted mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={255}
              required
              className="w-full bg-surface-2 border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-creator/50 placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Who is this creator? What kind of work do they make?"
              className="w-full bg-surface-2 border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-creator/50 placeholder:text-muted resize-y"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Fan Name (singular)</label>
              <input
                type="text"
                value={fanName}
                onChange={(e) => setFanName(e.target.value)}
                maxLength={100}
                placeholder="fan"
                className="w-full bg-surface-2 border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-creator/50 placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Fan Name (plural)</label>
              <input
                type="text"
                value={fanNamePlural}
                onChange={(e) => setFanNamePlural(e.target.value)}
                maxLength={100}
                placeholder="fans"
                className="w-full bg-surface-2 border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-creator/50 placeholder:text-muted"
              />
            </div>
          </div>
        </div>

        {/* ── Social handles ──────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Social Handles & Links
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {HANDLE_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-muted mb-1">{label}</label>
                <input
                  type="text"
                  value={handles[key as string] ?? ''}
                  onChange={(e) =>
                    setHandles((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  maxLength={255}
                  className="w-full bg-surface-2 border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-creator/50 placeholder:text-muted"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="bg-creator text-black font-semibold text-sm px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href={`/summons/${id}`}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>

        {saveError && (
          <p className="text-red-400 text-sm">{saveError}</p>
        )}
      </form>
    </div>
  );
}
