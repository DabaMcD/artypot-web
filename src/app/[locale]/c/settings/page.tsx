'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import Image from 'next/image';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary';
import { normalizeAvatarUrl, AVATAR_UPLOAD_OPTIONS } from '@/lib/cloudinary';
import { users as usersApi, notificationSettings as notifApi } from '@/lib/api';
import { COUNTRIES, subdivisions, subdivisionLabel } from '@/lib/countries';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { SMS_ENABLED } from '@/lib/features';
import type { NotificationSettings } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import { Modal } from '@/components/ui/Modal';
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
        disabled ? 'opacity-40' : dimmed ? 'opacity-50' : ''
      } ${
        checked ? 'bg-[var(--color-role)]' : 'bg-surface-2 border border-border'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

type ChannelRule = 'toggle' | 'mandatory_on';

const CREATOR_NOTIF_ROWS: {
  labelKey: string;
  descKey: string;
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
    labelKey: 'notifications.rows.newBounty.label',
    descKey: 'notifications.rows.newBounty.desc',
    emailKey: 'creator_new_bounty',         emailRule: 'toggle',
    smsKey:   'sms_creator_new_bounty',     smsRule:   'toggle',
    bellKey:  'in_app_creator_new_bounty',  bellRule:  'toggle',
  },
  {
    labelKey: 'notifications.rows.bountyVerified.label',
    descKey: 'notifications.rows.bountyVerified.desc',
    emailKey: 'creator_bounty_verified',         emailRule: 'toggle',
    smsKey:   'sms_creator_bounty_verified',     smsRule:   'toggle',
    bellKey:  'in_app_creator_bounty_verified',  bellRule:  'toggle',
  },
  {
    labelKey: 'notifications.rows.bountyRejected.label',
    descKey: 'notifications.rows.bountyRejected.desc',
    emailKey: null, emailRule: 'mandatory_on',
    smsKey:   null, smsRule:   'mandatory_on',
    bellKey:  null, bellRule:  'mandatory_on',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreatorSettingsPage() {
  const t = useTranslations('CreatorSettings');
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const [fanName, setFanName] = useState('');
  const [fanNamePlural, setFanNamePlural] = useState('');
  const [fanNameSaving, setFanNameSaving] = useState(false);
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
    setBioInput(user.bio ?? '');
    setFanName(user.fan_name ?? '');
    setFanNamePlural(user.fan_name_plural ?? '');
    notifApi.get().then(setNotifSettings).catch(() => {});
  }, [user, authLoading, router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nameInput.trim()) return;
    setNameSaving(true);
    try {
      await usersApi.update(user.id, { display_name: nameInput.trim() });
      await refreshUser();
      toast(t('displayName.toastSaved'), 'success');
    } catch { toast(t('displayName.toastError'), 'error'); }
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
      toast(t('picture.toastSaved'), 'success');
    } catch { toast(t('picture.toastError'), 'error'); }
    finally { setPicSaving(false); }
  };

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBioSaving(true);
    try {
      await usersApi.update(user.id, { bio: bioInput.trim() || null });
      await refreshUser();
      toast(t('bio.toastSaved'), 'success');
    } catch { toast(t('bio.toastError'), 'error'); }
    finally { setBioSaving(false); }
  };

  const handleSaveFanName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFanNameSaving(true);
    try {
      await usersApi.update(user.id, {
        fan_name: fanName.trim() || null,
        fan_name_plural: fanNamePlural.trim() || null,
      });
      await refreshUser();
      toast(t('fanName.toastSaved'), 'success');
    } catch { toast(t('fanName.toastError'), 'error'); }
    finally { setFanNameSaving(false); }
  };

  // Confirmation gate. Tax residence is a compliance-sensitive field — country
  // changes (especially US ↔ non-US) can trigger Stripe Connect re-verification
  // and re-collection of W-9 / W-8BEN. We require an explicit "yes I mean it"
  // before persisting so creators don't casually click through.
  const handleRequestSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !countryCode) return;
    if (locationSaving) return;
    const noChange =
      (user.country_code ?? '') === countryCode &&
      (user.state_code ?? '') === (subdivisions(countryCode) ? stateCode : '');
    if (noChange) return;
    setShowLocationConfirm(true);
  };

  const handleConfirmSaveLocation = async () => {
    if (!user || !countryCode) return;
    setLocationSaving(true);
    try {
      await usersApi.update(user.id, {
        country_code: countryCode || null,
        state_code: (countryCode && subdivisions(countryCode)) ? (stateCode || null) : null,
      });
      await refreshUser();
      toast(t('location.toastSaved'), 'success');
      setShowLocationConfirm(false);
    } catch { toast(t('location.toastError'), 'error'); }
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
      toast(t('notifications.toastSaved'), 'success');
    } catch {
      setNotifSettings({ ...notifSettings, [key]: !value });
      toast(t('notifications.toastError'), 'error');
    } finally {
      setNotifSaving((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleNotifReset = async () => {
    setNotifResetting(true);
    try {
      const updated = await notifApi.reset();
      setNotifSettings(updated);
      toast(t('notifications.toastReset'), 'success');
    } catch {
      toast(t('notifications.toastResetError'), 'error');
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
        <SectionLabel>{t('header.breadcrumbCreator')} · {t('header.breadcrumbProfile')}</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('header.title')}</h1>
      </div>

      {/* Profile picture */}
      <div id="picture">
      <Card>
        <SectionLabel className="mb-4">{t('picture.sectionLabel')}</SectionLabel>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-2 border border-border shrink-0">
            {user.profile_picture ? (
              <Image src={user.profile_picture} alt={t('picture.alt')} fill className="object-cover" unoptimized />
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
                    {picSaving ? t('picture.saving') : user.profile_picture ? t('picture.changePhoto') : t('picture.uploadPhoto')}
                  </Button>
                )}
              </CldUploadWidget>
            ) : (
              <p className="text-xs text-bad">
                {t('picture.unavailable')}
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              {t('picture.uploadAnySize')}
            </p>
          </div>
        </div>
      </Card>
      </div>

      {/* Display name */}
      <div id="display-name">
      <Card>
        <SectionLabel className="mb-3">{t('displayName.sectionLabel')}</SectionLabel>
        <form onSubmit={handleSaveName} className="flex gap-2">
          <Input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1" />
          <Button type="submit" variant="default" disabled={nameSaving || !nameInput.trim() || nameInput.trim() === user.display_name}>
            {nameSaving ? t('displayName.saving') : t('displayName.save')}
          </Button>
        </form>
      </Card>
      </div>

      {/* Creator slug */}
      <CreatorSlugSection />

      {/* Bio */}
      <div id="bio">
      <Card>
        <SectionLabel className="mb-3">{t('bio.sectionLabel')}</SectionLabel>
        <p className="text-sm text-muted mb-3">
          {t('bio.description')}
        </p>
        <form onSubmit={handleSaveBio} className="space-y-3">
          <textarea
            value={bioInput}
            onChange={(e) => setBioInput(e.target.value)}
            rows={4}
            placeholder={t('bio.placeholder')}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors resize-y placeholder:text-muted"
          />
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={bioSaving || (bioInput ?? '') === (user.bio ?? '')}
          >
            {bioSaving ? t('bio.saving') : t('bio.save')}
          </Button>
        </form>
      </Card>
      </div>

      {/* Fan name */}
      <div id="fan-name">
      <Card>
        <SectionLabel className="mb-3">{t('fanName.sectionLabel')}</SectionLabel>
        <p className="text-sm text-muted mb-3">
          {t.rich('fanName.description', {
            example: fanNamePlural || fanName || t('fanName.exampleFallback'),
            emphasis: (chunks) => <span className="text-foreground">{chunks}</span>,
          })}
        </p>
        <form onSubmit={handleSaveFanName} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">{t('fanName.singularLabel')}</label>
            <Input
              type="text"
              value={fanName}
              onChange={(e) => setFanName(e.target.value)}
              maxLength={100}
              placeholder={t('fanName.singularPlaceholder')}
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">{t('fanName.pluralLabel')}</label>
            <Input
              type="text"
              value={fanNamePlural}
              onChange={(e) => setFanNamePlural(e.target.value)}
              maxLength={100}
              placeholder={t('fanName.pluralPlaceholder')}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={
                fanNameSaving ||
                ((fanName ?? '') === (user.fan_name ?? '') &&
                 (fanNamePlural ?? '') === (user.fan_name_plural ?? ''))
              }
            >
              {fanNameSaving ? t('fanName.saving') : t('fanName.save')}
            </Button>
          </div>
        </form>
      </Card>
      </div>

      {/* Handles */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel className="mb-1">{t('handles.sectionLabel')}</SectionLabel>
            <p className="text-sm text-muted">{t('handles.description')}</p>
          </div>
          <Link href="/c/handles"><Button variant="default" size="sm">{t('handles.manage')}</Button></Link>
        </div>
      </Card>

      {/* Tax residence */}
      <div id="location">
      <Card>
        <SectionLabel className="mb-3">{t('location.sectionLabel')}</SectionLabel>
        <p className="text-sm text-muted mb-4">
          {t('location.description')}
        </p>
        <form onSubmit={handleRequestSaveLocation} className="space-y-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">{t('location.countryLabel')}</label>
            <select
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); }}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
            >
              <option value="">{t('location.selectCountry')}</option>
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
                <option value="">{t('location.selectSubdivision', { label: subdivisionLabel(countryCode).toLowerCase() })}</option>
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
            disabled={
              locationSaving ||
              !countryCode ||
              (!!subdivisions(countryCode) && !stateCode) ||
              ((user?.country_code ?? '') === countryCode &&
                (user?.state_code ?? '') === (subdivisions(countryCode) ? stateCode : ''))
            }
          >
            {locationSaving ? t('location.saving') : t('location.save')}
          </Button>
        </form>
      </Card>
      </div>

      {/* Tax residence confirm */}
      {showLocationConfirm && (() => {
        const oldCountry = user?.country_code
          ? COUNTRIES.find((c) => c.code === user.country_code)?.name ?? user.country_code
          : '—';
        const newCountry = COUNTRIES.find((c) => c.code === countryCode)?.name ?? countryCode;
        const oldState = (user?.country_code && user.state_code && subdivisions(user.country_code))
          ? subdivisions(user.country_code)!.find((s) => s.code === user.state_code)?.name ?? user.state_code
          : null;
        const newState = (countryCode && stateCode && subdivisions(countryCode))
          ? subdivisions(countryCode)!.find((s) => s.code === stateCode)?.name ?? stateCode
          : null;
        const oldDisplay = oldState ? `${oldCountry} — ${oldState}` : oldCountry;
        const newDisplay = newState ? `${newCountry} — ${newState}` : newCountry;
        const crossingCountry = (user?.country_code ?? '') !== countryCode;
        return (
          <Modal
            title={t('location.confirm.title')}
            onClose={() => !locationSaving && setShowLocationConfirm(false)}
            actions={
              <>
                <Button variant="ghost" onClick={() => setShowLocationConfirm(false)} disabled={locationSaving}>
                  {t('location.confirm.cancel')}
                </Button>
                <Button variant="primary" onClick={handleConfirmSaveLocation} disabled={locationSaving}>
                  {locationSaving ? t('location.confirm.saving') : t('location.confirm.submit')}
                </Button>
              </>
            }
          >
            <p className="text-sm text-muted leading-relaxed mb-3">
              {t.rich('location.confirm.changeLine', {
                from: oldDisplay,
                to: newDisplay,
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </p>
            <p className="text-sm text-muted leading-relaxed mb-3">
              {t('location.confirm.reportingLine')}
              <strong className="text-foreground">
                {crossingCountry
                  ? t('location.confirm.crossingCountry')
                  : t('location.confirm.sameCountry')}
              </strong>
            </p>
            <p className="text-sm text-muted leading-relaxed">
              {t('location.confirm.loggedLine')}
            </p>
          </Modal>
        );
      })()}

      {/* Creator notifications */}
      <div id="notifications">
      <Card>
        <SectionLabel className="mb-4">{t('notifications.sectionLabel')}</SectionLabel>
        <p className="text-sm text-muted mb-4">{t('notifications.description')}</p>

        {/* SMS unavailable banner — hidden while SMS is disabled platform-wide (see lib/features.ts). */}
        {SMS_ENABLED && !phoneVerified && (
          <Banner tone="warn" className="mb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span>
                {user.phone_number
                  ? t('notifications.smsBanner.verify')
                  : t('notifications.smsBanner.addAndVerify')}
              </span>
              <Link href="/settings#phone">
                <Button variant="default" size="sm">{t('notifications.smsBanner.addPhone')}</Button>
              </Link>
            </div>
          </Banner>
        )}

        {/* Column headers. SMS column hidden while SMS is disabled (see lib/features.ts). */}
        <div className="grid gap-x-4 items-center mb-2" style={{ gridTemplateColumns: SMS_ENABLED ? '1fr auto auto auto' : '1fr auto auto' }}>
          <span />
          {(['email', 'sms', 'bell'] as const).filter((ch) => SMS_ENABLED || ch !== 'sms').map((ch) => (
            <span key={ch} className={`font-mono text-[9px] uppercase w-9 text-center ${
              (ch === 'email' && !emailChannelAvailable) || (ch === 'sms' && !phoneVerified)
                ? 'text-muted/40' : 'text-muted'
            }`}>{t(`notifications.channels.${ch}`)}</span>
          ))}
        </div>

        {!notifSettings ? (
          <div className="py-4 text-center font-mono text-xs text-muted">{t('notifications.loading')}</div>
        ) : (
          <>
            {CREATOR_NOTIF_ROWS.map(({ labelKey, descKey, emailKey, emailRule, smsKey, smsRule, bellKey, bellRule }) => {
              const label = t(labelKey);
              return (
              <div key={labelKey} className="grid gap-x-4 items-center py-2.5 border-b border-border last:border-0" style={{ gridTemplateColumns: SMS_ENABLED ? '1fr auto auto auto' : '1fr auto auto' }}>
                <div>
                  <p className="text-sm text-foreground">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{t(descKey)}</p>
                </div>

                {/* Email */}
                {emailRule === 'mandatory_on' ? (
                  <MiniToggle checked={true} onChange={() => {}} saving={false} label={t('notifications.toggleAria.emailAlwaysOn', { label })} disabled={true} />
                ) : (
                  <MiniToggle
                    checked={!!(emailKey && notifSettings[emailKey])}
                    onChange={(val) => emailKey && handleNotifToggle(emailKey, val)}
                    saving={!!emailKey && notifSaving.has(emailKey)}
                    label={t('notifications.toggleAria.email', { label })}
                    disabled={!emailChannelAvailable}
                    dimmed={emailChannelAvailable && !notifSettings.email_master}
                  />
                )}

                {/* SMS — hidden while SMS is disabled platform-wide (see lib/features.ts). */}
                {SMS_ENABLED && (
                  smsRule === 'mandatory_on' ? (
                    <MiniToggle checked={true} onChange={() => {}} saving={false} label={t('notifications.toggleAria.smsAlwaysOn', { label })} disabled={true} />
                  ) : (
                    <MiniToggle
                      checked={!!(smsKey && notifSettings[smsKey])}
                      onChange={(val) => smsKey && handleNotifToggle(smsKey, val)}
                      saving={!!smsKey && notifSaving.has(smsKey)}
                      label={t('notifications.toggleAria.sms', { label })}
                      disabled={!phoneVerified}
                      dimmed={phoneVerified && !notifSettings.sms_master}
                    />
                  )
                )}

                {/* Bell */}
                {bellRule === 'mandatory_on' ? (
                  <MiniToggle checked={true} onChange={() => {}} saving={false} label={t('notifications.toggleAria.bellAlwaysOn', { label })} disabled={true} />
                ) : (
                  <MiniToggle
                    checked={!!(bellKey && notifSettings[bellKey])}
                    onChange={(val) => bellKey && handleNotifToggle(bellKey, val)}
                    saving={!!bellKey && notifSaving.has(bellKey)}
                    label={t('notifications.toggleAria.bell', { label })}
                    disabled={false}
                    dimmed={!notifSettings.in_app_master}
                  />
                )}
              </div>
              );
            })}

            {/* Cross-link + reset */}
            <div className="mt-4 pt-3 border-border flex items-center justify-between gap-4">
              <Link href="/settings#notifications" className="text-xs font-mono text-muted hover:text-foreground transition-colors">
                {t('notifications.goToFan')}
              </Link>
              <button
                type="button"
                onClick={handleNotifReset}
                disabled={notifResetting}
                className="text-xs font-mono text-muted hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
              >
                {notifResetting ? t('notifications.resetting') : t('notifications.reset')}
              </button>
            </div>
          </>
        )}
      </Card>
      </div>

      {/* Fan settings cross-link */}
      <Card dashed>
        <p className="text-sm text-muted">
          {t.rich('fanSettingsLink.text', {
            link: (chunks) => (
              <Link href="/settings#email" className="text-foreground hover:underline underline-offset-2 font-medium">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </Card>
    </div>
  );
}
