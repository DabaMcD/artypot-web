'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary';
import { normalizeAvatarUrl, AVATAR_UPLOAD_OPTIONS } from '@/lib/cloudinary';
import { users as usersApi, notificationSettings as notifApi } from '@/lib/api';
import { COUNTRIES, subdivisions, subdivisionLabel } from '@/lib/countries';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { NotificationSettings } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import CreatorSlugSection from '@/components/CreatorSlugSection';

// ── Inline toggle (same as fan settings) ─────────────────────────────────────

function MiniToggle({
  checked, onChange, saving, label, disabled = false, dimmed = false,
}: {
  checked: boolean; onChange: (val: boolean) => void; saving: boolean;
  label: string; disabled?: boolean; dimmed?: boolean;
}) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={label}
      disabled={saving || disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors focus:outline-none cursor-pointer ${
        disabled ? 'opacity-30' : dimmed ? 'opacity-50' : ''
      } ${
        checked && !disabled ? 'bg-[var(--color-role)]' : 'bg-surface-2 border border-border'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

type ChannelRule = 'toggle' | 'mandatory_on';

const CREATOR_NOTIF_ROWS: {
  label: string;
  desc: string;
  emailKey: keyof NotificationSettings | null;
  emailRule: ChannelRule;
  smsKey: keyof NotificationSettings | null;
  smsRule: ChannelRule;
  bellKey: keyof NotificationSettings | null;
  bellRule: ChannelRule;
}[] = [
  // IMPORTANT: Keep mandatory rules in sync with MANDATORY_ON in
  // artypot-api/app/Models/NotificationSettings.php — update both together.
  {
    label: 'new bounty',
    desc: 'a fan opened a new bounty for you.',
    emailKey: 'creator_new_bounty',         emailRule: 'toggle',
    smsKey:   'sms_creator_new_bounty',     smsRule:   'toggle',
    bellKey:  'in_app_creator_new_bounty',  bellRule:  'toggle',
  },
  {
    label: 'bounty verified',
    desc: 'council verified a bounty you submitted as completed.',
    emailKey: 'creator_bounty_verified',         emailRule: 'toggle',
    smsKey:   'sms_creator_bounty_verified',     smsRule:   'toggle',
    bellKey:  'in_app_creator_bounty_verified',  bellRule:  'toggle',
  },
  {
    label: 'bounty rejected',
    desc: 'council rejected your bounty completion submission.',
    emailKey: null, emailRule: 'mandatory_on',
    smsKey:   null, smsRule:   'mandatory_on',
    bellKey:  null, bellRule:  'mandatory_on',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreatorSettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState<Set<string>>(new Set());
  const [notifResetting, setNotifResetting] = useState(false);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'artypot_profiles';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    setNameInput(user.display_name ?? '');
    setCountryCode(user.country_code ?? '');
    setStateCode(user.state_code ?? '');
    notifApi.get().then(setNotifSettings).catch(() => {});
  }, [user, authLoading, router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nameInput.trim()) return;
    setNameSaving(true);
    try {
      await usersApi.update(user.id, { display_name: nameInput.trim() });
      await refreshUser();
      toast('Name updated!', 'success');
    } catch { toast('Failed to save name.', 'error'); }
    finally { setNameSaving(false); }
  };

  const handlePicUploaded = async (secureUrl: string) => {
    if (!user) return;
    const normalized = normalizeAvatarUrl(secureUrl);
    if (!normalized) return;
    setPicSaving(true);
    try {
      await usersApi.update(user.id, { profile_picture: normalized });
      await refreshUser();
      toast('Profile picture updated!', 'success');
    } catch { toast('Failed to save picture.', 'error'); }
    finally { setPicSaving(false); }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !countryCode) return;
    setLocationSaving(true);
    try {
      await usersApi.update(user.id, {
        country_code: countryCode || null,
        state_code: (countryCode && subdivisions(countryCode)) ? (stateCode || null) : null,
      });
      await refreshUser();
      toast('Location saved.', 'success');
    } catch { toast('Failed to save location.', 'error'); }
    finally { setLocationSaving(false); }
  };

  const handleNotifToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!notifSettings) return;

    const creatorEmailKeys: Array<keyof NotificationSettings> = [
      'creator_new_bounty', 'creator_bounty_verified',
    ];
    const creatorSmsKeys: Array<keyof NotificationSettings> = [
      'sms_creator_new_bounty', 'sms_creator_bounty_verified',
    ];
    const creatorBellKeys: Array<keyof NotificationSettings> = [
      'in_app_creator_new_bounty', 'in_app_creator_bounty_verified',
    ];

    let masterKey: keyof NotificationSettings | null = null;
    if (value) {
      if (creatorEmailKeys.includes(key) && !notifSettings.email_master) masterKey = 'email_master';
      else if (creatorSmsKeys.includes(key) && !notifSettings.sms_master) masterKey = 'sms_master';
      else if (creatorBellKeys.includes(key) && !notifSettings.in_app_master) masterKey = 'in_app_master';
    }

    const optimistic = { ...notifSettings, [key]: value };
    if (masterKey) optimistic[masterKey] = true as never;
    setNotifSettings(optimistic);

    setNotifSaving((prev) => new Set(prev).add(key));
    try {
      const payload: Partial<NotificationSettings> = { [key]: value };
      if (masterKey) payload[masterKey] = true as never;
      const updated = await notifApi.update(payload);
      setNotifSettings(updated);
      toast('Settings saved.', 'success');
    } catch {
      setNotifSettings({ ...notifSettings, [key]: !value });
      toast('Failed to save. Please try again.', 'error');
    } finally {
      setNotifSaving((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleNotifReset = async () => {
    setNotifResetting(true);
    try {
      const updated = await notifApi.reset();
      setNotifSettings(updated);
      toast('Notification settings reset to defaults.', 'success');
    } catch {
      toast('Failed to reset. Please try again.', 'error');
    } finally {
      setNotifResetting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="space-y-4 pt-2">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="h-64 bg-surface animate-pulse rounded" />
      </div>
    );
  }

  const phoneVerified = !!user.phone_verified_at;
  const hasEmail = !!user.email;
  const emailVerified = !!user.email_verified_at;
  const emailChannelAvailable = hasEmail && emailVerified;

  return (
    <div className="space-y-7 pt-2 max-w-[680px]">
      <div>
        <SectionLabel>creator · admin</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">settings</h1>
      </div>

      {/* Profile picture */}
      <div id="picture">
      <Card>
        <SectionLabel className="mb-4">profile picture</SectionLabel>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-2 border border-border shrink-0">
            {user.profile_picture ? (
              <Image src={user.profile_picture} alt="Profile picture" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-muted select-none font-bold">
                {user.display_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {cloudName ? (
              <CldUploadWidget
                uploadPreset={uploadPreset}
                options={{ sources: ['local', 'url', 'camera'], cropping: true, croppingAspectRatio: 1, multiple: false, folder: 'artypot/profiles', ...AVATAR_UPLOAD_OPTIONS }}
                onSuccess={(result: CloudinaryUploadWidgetResults) => {
                  const info = result?.info;
                  if (info && typeof info === 'object' && 'secure_url' in info) {
                    void handlePicUploaded(info.secure_url as string);
                  }
                }}
              >
                {({ open }) => (
                  <Button variant="default" size="sm" disabled={picSaving} onClick={() => open()}>
                    {picSaving ? 'saving…' : user.profile_picture ? 'change photo…' : 'upload photo…'}
                  </Button>
                )}
              </CldUploadWidget>
            ) : (
              <p className="text-xs text-bad">
                Image uploads are unavailable — NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set.
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              Cropped to a square and optimized automatically — any size is fine.
            </p>
          </div>
        </div>
      </Card>
      </div>

      {/* Display name */}
      <div id="display-name">
      <Card>
        <SectionLabel className="mb-3">display name</SectionLabel>
        <form onSubmit={handleSaveName} className="flex gap-2">
          <Input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1" />
          <Button type="submit" variant="default" disabled={nameSaving || !nameInput.trim() || nameInput.trim() === user.display_name}>
            {nameSaving ? 'Saving…' : 'Save Name'}
          </Button>
        </form>
      </Card>
      </div>

      {/* Creator slug */}
      <CreatorSlugSection />

      {/* Handles */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel className="mb-1">handles</SectionLabel>
            <p className="text-sm text-muted">Manage your verified social accounts.</p>
          </div>
          <Link href="/creator/handles"><Button variant="default" size="sm">Manage Handles →</Button></Link>
        </div>
      </Card>

      {/* Location of residence */}
      <div id="location">
      <Card>
        <SectionLabel className="mb-3">location of residence</SectionLabel>
        <p className="text-sm text-muted mb-4">Required for tax and earnings reporting.</p>
        <form onSubmit={handleSaveLocation} className="space-y-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">country</label>
            <select
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); }}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
            >
              <option value="">— select country —</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          {countryCode && subdivisions(countryCode) && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">
                {subdivisionLabel(countryCode)}
              </label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
                required
              >
                <option value="">— select {subdivisionLabel(countryCode).toLowerCase()} —</option>
                {subdivisions(countryCode)!.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={locationSaving || !countryCode || (!!subdivisions(countryCode) && !stateCode)}
          >
            {locationSaving ? 'Saving…' : 'Save Location'}
          </Button>
        </form>
      </Card>
      </div>

      {/* Creator notifications */}
      <div id="notifications">
      <Card>
        <SectionLabel className="mb-4">notifications</SectionLabel>
        <p className="text-sm text-muted mb-4">Creator-specific notification preferences.</p>

        {/* SMS unavailable banner */}
        {!phoneVerified && (
          <Banner tone="warn" className="mb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span>
                {user.phone_number
                  ? 'Verify your phone number to enable SMS notifications.'
                  : 'Add and verify your phone number to enable SMS notifications.'}
              </span>
              <Link href="/settings#phone">
                <Button variant="default" size="sm">Add phone number →</Button>
              </Link>
            </div>
          </Banner>
        )}

        {/* Column headers */}
        <div className="grid gap-x-4 items-center mb-2" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
          <span />
          {(['email', 'sms', 'bell'] as const).map((ch) => (
            <span key={ch} className={`font-mono text-[9px] uppercase w-9 text-center ${
              (ch === 'email' && !emailChannelAvailable) || (ch === 'sms' && !phoneVerified)
                ? 'text-muted/40' : 'text-muted'
            }`}>{ch}</span>
          ))}
        </div>

        {!notifSettings ? (
          <div className="py-4 text-center font-mono text-xs text-muted">loading…</div>
        ) : (
          <>
            {CREATOR_NOTIF_ROWS.map(({ label, desc, emailKey, emailRule, smsKey, smsRule, bellKey, bellRule }) => (
              <div key={label} className="grid gap-x-4 items-center py-2.5 border-b border-border last:border-0" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                <div>
                  <p className="text-sm text-foreground">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{desc}</p>
                </div>

                {/* Email */}
                {emailRule === 'mandatory_on' ? (
                  <MiniToggle checked={true} onChange={() => {}} saving={false} label={`email: ${label} (always on)`} disabled={true} />
                ) : (
                  <MiniToggle
                    checked={!!(emailKey && notifSettings[emailKey])}
                    onChange={(val) => emailKey && handleNotifToggle(emailKey, val)}
                    saving={!!emailKey && notifSaving.has(emailKey)}
                    label={`email: ${label}`}
                    disabled={!emailChannelAvailable}
                    dimmed={emailChannelAvailable && !notifSettings.email_master}
                  />
                )}

                {/* SMS */}
                {smsRule === 'mandatory_on' ? (
                  <MiniToggle checked={true} onChange={() => {}} saving={false} label={`sms: ${label} (always on)`} disabled={true} />
                ) : (
                  <MiniToggle
                    checked={!!(smsKey && notifSettings[smsKey])}
                    onChange={(val) => smsKey && handleNotifToggle(smsKey, val)}
                    saving={!!smsKey && notifSaving.has(smsKey)}
                    label={`sms: ${label}`}
                    disabled={!phoneVerified}
                    dimmed={phoneVerified && !notifSettings.sms_master}
                  />
                )}

                {/* Bell */}
                {bellRule === 'mandatory_on' ? (
                  <MiniToggle checked={true} onChange={() => {}} saving={false} label={`bell: ${label} (always on)`} disabled={true} />
                ) : (
                  <MiniToggle
                    checked={!!(bellKey && notifSettings[bellKey])}
                    onChange={(val) => bellKey && handleNotifToggle(bellKey, val)}
                    saving={!!bellKey && notifSaving.has(bellKey)}
                    label={`bell: ${label}`}
                    disabled={false}
                    dimmed={!notifSettings.in_app_master}
                  />
                )}
              </div>
            ))}

            {/* Cross-link + reset */}
            <div className="mt-4 pt-3 border-border flex items-center justify-between gap-4">
              <Link href="/settings#notifications" className="text-xs font-mono text-muted hover:text-foreground transition-colors">
                ← go to fan notifications
              </Link>
              <button
                type="button"
                onClick={handleNotifReset}
                disabled={notifResetting}
                className="text-xs font-mono text-muted hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
              >
                {notifResetting ? 'resetting…' : 'reset to defaults'}
              </button>
            </div>
          </>
        )}
      </Card>
      </div>

      {/* Fan settings cross-link */}
      <Card dashed>
        <p className="text-sm text-muted">
          To edit your email, phone number, password, or other account options,{' '}
          <Link href="/settings#email" className="text-foreground hover:underline underline-offset-2 font-medium">
            go to fan settings →
          </Link>
        </p>
      </Card>
    </div>
  );
}
