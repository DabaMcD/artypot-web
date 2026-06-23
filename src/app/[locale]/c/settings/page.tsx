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
import { Input, FieldLabel, Textarea } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import CreatorSlugSection from '@/components/CreatorSlugSection';
import { MiniToggle } from '@/components/settings/MiniToggle';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { SettingEditModal } from '@/components/settings/SettingEditModal';

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

type EditTarget = 'name' | 'bio' | 'fanName' | 'tax' | null;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreatorSettingsPage() {
  const t = useTranslations('CreatorSettings');
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [editing, setEditing] = useState<EditTarget>(null);

  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  // Tax residence is edited in a single modal with two steps: 'edit' (the
  // country/state selects) → 'confirm' (the compliance-gate review). We never
  // stack a second modal on top.
  const [taxStep, setTaxStep] = useState<'edit' | 'confirm'>('edit');
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

  const handleSaveName = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !nameInput.trim()) return;
    setNameSaving(true);
    try {
      await usersApi.update(user.id, { display_name: nameInput.trim() });
      await refreshUser();
      toast(t('displayName.toastSaved'), 'success');
      setEditing(null);
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

  const handleSaveBio = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return;
    setBioSaving(true);
    try {
      await usersApi.update(user.id, { bio: bioInput.trim() || null });
      await refreshUser();
      toast(t('bio.toastSaved'), 'success');
      setEditing(null);
    } catch { toast(t('bio.toastError'), 'error'); }
    finally { setBioSaving(false); }
  };

  const handleSaveFanName = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return;
    setFanNameSaving(true);
    try {
      await usersApi.update(user.id, {
        fan_name: fanName.trim() || null,
        fan_name_plural: fanNamePlural.trim() || null,
      });
      await refreshUser();
      toast(t('fanName.toastSaved'), 'success');
      setEditing(null);
    } catch { toast(t('fanName.toastError'), 'error'); }
    finally { setFanNameSaving(false); }
  };

  // Confirmation gate. Tax residence is a compliance-sensitive field — country
  // changes (especially US ↔ non-US) can trigger Stripe Connect re-verification
  // and re-collection of W-9 / W-8BEN. We require an explicit "yes I mean it"
  // before persisting so creators don't casually click through.
  const handleRequestSaveLocation = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !countryCode) return;
    if (locationSaving) return;
    const noChange =
      (user.country_code ?? '') === countryCode &&
      (user.state_code ?? '') === (subdivisions(countryCode) ? stateCode : '');
    if (noChange) return;
    setTaxStep('confirm');
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
      setEditing(null);
      setTaxStep('edit');
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

  // Saved tax-residence summary for its row.
  const taxDisplay = (() => {
    if (!user.country_code) return t('common.notSet');
    const c = COUNTRIES.find((x) => x.code === user.country_code)?.name ?? user.country_code;
    const s = (user.state_code && subdivisions(user.country_code))
      ? subdivisions(user.country_code)!.find((x) => x.code === user.state_code)?.name ?? user.state_code
      : null;
    return s ? `${c} — ${s}` : c;
  })();

  // Tax modal: whether the 'edit' step's Save is blocked (also guards Enter).
  const taxEditInvalid =
    !countryCode ||
    (!!subdivisions(countryCode) && !stateCode) ||
    ((user.country_code ?? '') === countryCode &&
      (user.state_code ?? '') === (subdivisions(countryCode) ? stateCode : ''));

  return (
    <>
      {/* ── Edit dialogs ───────────────────────────────────────────────────── */}

      {/* Display name */}
      {editing === 'name' && (
        <SettingEditModal
          title={t('displayName.sectionLabel')}
          onClose={() => setEditing(null)}
          onSubmit={() => handleSaveName()}
          busy={nameSaving}
          submitLabel={t('displayName.save')}
          savingLabel={t('displayName.saving')}
          cancelLabel={t('common.cancel')}
          submitDisabled={!nameInput.trim() || nameInput.trim() === user.display_name}
        >
          <FieldLabel>{t('displayName.sectionLabel')}</FieldLabel>
          <Input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
        </SettingEditModal>
      )}

      {/* Bio */}
      {editing === 'bio' && (
        <SettingEditModal
          title={t('bio.sectionLabel')}
          onClose={() => setEditing(null)}
          onSubmit={() => handleSaveBio()}
          busy={bioSaving}
          submitLabel={t('bio.save')}
          savingLabel={t('bio.saving')}
          cancelLabel={t('common.cancel')}
          submitDisabled={(bioInput ?? '') === (user.bio ?? '')}
        >
          <p className="text-sm text-muted mb-3">{t('bio.description')}</p>
          <Textarea
            value={bioInput}
            onChange={(e) => setBioInput(e.target.value)}
            rows={4}
            placeholder={t('bio.placeholder')}
            className="resize-y"
          />
        </SettingEditModal>
      )}

      {/* Fan name */}
      {editing === 'fanName' && (
        <SettingEditModal
          title={t('fanName.sectionLabel')}
          onClose={() => setEditing(null)}
          onSubmit={() => handleSaveFanName()}
          busy={fanNameSaving}
          submitLabel={t('fanName.save')}
          savingLabel={t('fanName.saving')}
          cancelLabel={t('common.cancel')}
          submitDisabled={
            (fanName ?? '') === (user.fan_name ?? '') &&
            (fanNamePlural ?? '') === (user.fan_name_plural ?? '')
          }
        >
          <p className="text-sm text-muted mb-3">
            {t.rich('fanName.description', {
              example: fanNamePlural || fanName || t('fanName.exampleFallback'),
              emphasis: (chunks) => <span className="text-foreground">{chunks}</span>,
            })}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>{t('fanName.singularLabel')}</FieldLabel>
              <Input type="text" value={fanName} onChange={(e) => setFanName(e.target.value)} maxLength={100} placeholder={t('fanName.singularPlaceholder')} />
            </div>
            <div>
              <FieldLabel>{t('fanName.pluralLabel')}</FieldLabel>
              <Input type="text" value={fanNamePlural} onChange={(e) => setFanNamePlural(e.target.value)} maxLength={100} placeholder={t('fanName.pluralPlaceholder')} />
            </div>
          </div>
        </SettingEditModal>
      )}

      {/* Tax residence — single modal, edit step → compliance confirm step. */}
      {editing === 'tax' && (() => {
        const oldCountry = user.country_code
          ? COUNTRIES.find((c) => c.code === user.country_code)?.name ?? user.country_code
          : '—';
        const newCountry = COUNTRIES.find((c) => c.code === countryCode)?.name ?? countryCode;
        const oldState = (user.country_code && user.state_code && subdivisions(user.country_code))
          ? subdivisions(user.country_code)!.find((s) => s.code === user.state_code)?.name ?? user.state_code
          : null;
        const newState = (countryCode && stateCode && subdivisions(countryCode))
          ? subdivisions(countryCode)!.find((s) => s.code === stateCode)?.name ?? stateCode
          : null;
        const oldDisplay = oldState ? `${oldCountry} — ${oldState}` : oldCountry;
        const newDisplay = newState ? `${newCountry} — ${newState}` : newCountry;
        const crossingCountry = (user.country_code ?? '') !== countryCode;

        return (
          <SettingEditModal
            title={taxStep === 'confirm' ? t('location.confirm.title') : t('location.sectionLabel')}
            // Escape/backdrop/✕ on the confirm step steps back to the edit form
            // (matching the explicit Cancel) rather than discarding the whole edit.
            onClose={() => { if (taxStep === 'confirm') setTaxStep('edit'); else setEditing(null); }}
            busy={locationSaving}
            cancelLabel={t('location.confirm.cancel')}
            onSubmit={taxStep === 'edit' ? () => handleRequestSaveLocation() : undefined}
            submitDisabled={taxStep === 'edit' ? taxEditInvalid : false}
            footer={taxStep === 'edit' ? (
              <>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={locationSaving}>{t('location.confirm.cancel')}</Button>
                <Button type="submit" variant="primary" disabled={taxEditInvalid || locationSaving}>{t('location.save')}</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={() => setTaxStep('edit')} disabled={locationSaving}>{t('location.confirm.cancel')}</Button>
                <Button type="button" variant="primary" onClick={handleConfirmSaveLocation} disabled={locationSaving}>
                  {locationSaving ? t('location.confirm.saving') : t('location.confirm.submit')}
                </Button>
              </>
            )}
          >
            {taxStep === 'edit' ? (
              <>
                <p className="text-sm text-muted mb-4">{t('location.description')}</p>
                <div className="space-y-3">
                  <div>
                    <FieldLabel>{t('location.countryLabel')}</FieldLabel>
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
                      <FieldLabel>{subdivisionLabel(countryCode)}</FieldLabel>
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
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </SettingEditModal>
        );
      })()}

      <div className="space-y-5 pt-2 max-w-[680px]">
        <div>
          <SectionLabel>{t('header.breadcrumbCreator')} · {t('header.breadcrumbProfile')}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('header.title')}</h1>
        </div>

        {/* ── Public profile ───────────────────────────────────────────────── */}
        <SettingsSection title={t('sections.profile')}>
          {/* Profile picture */}
          <div id="picture">
            <SettingRow
              label={t('picture.sectionLabel')}
              value={
                <span className="inline-flex items-center gap-2">
                  <span className="relative w-8 h-8 rounded-full overflow-hidden bg-surface-2 border border-border shrink-0 inline-block align-middle">
                    {user.profile_picture ? (
                      <Image src={user.profile_picture} alt={t('picture.alt')} fill className="object-cover" unoptimized />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-sm text-muted select-none font-bold">
                        {user.display_name?.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted">{t('picture.uploadAnySize')}</span>
                </span>
              }
              action={cloudName ? (
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
                <span className="text-xs text-bad">{t('picture.unavailable')}</span>
              )}
            />
          </div>

          {/* Display name */}
          <div id="display-name">
            <SettingRow
              label={t('displayName.sectionLabel')}
              value={user.display_name}
              editLabel={t('common.edit')}
              onEdit={() => { setNameInput(user.display_name ?? ''); setEditing('name'); }}
            />
          </div>

          {/* Bio */}
          <div id="bio">
            <SettingRow
              label={t('bio.sectionLabel')}
              value={user.bio ? user.bio : t('common.notSet')}
              editLabel={t('common.edit')}
              onEdit={() => { setBioInput(user.bio ?? ''); setEditing('bio'); }}
            />
          </div>

          {/* Fan name */}
          <div id="fan-name">
            <SettingRow
              label={t('fanName.sectionLabel')}
              value={(user.fan_name || user.fan_name_plural)
                ? `${user.fan_name ?? '—'} / ${user.fan_name_plural ?? '—'}`
                : t('common.notSet')}
              editLabel={t('common.edit')}
              onEdit={() => { setFanName(user.fan_name ?? ''); setFanNamePlural(user.fan_name_plural ?? ''); setEditing('fanName'); }}
            />
          </div>
        </SettingsSection>

        {/* Creator slug — self-contained card (own cooldown state machine). */}
        <CreatorSlugSection />

        {/* ── Presence ─────────────────────────────────────────────────────── */}
        <SettingsSection title={t('sections.presence')}>
          <SettingRow
            label={t('handles.sectionLabel')}
            description={t('handles.description')}
            action={<Link href="/c/handles"><Button variant="default" size="sm">{t('handles.manage')}</Button></Link>}
          />
        </SettingsSection>

        {/* ── Tax & compliance ─────────────────────────────────────────────── */}
        <SettingsSection title={t('sections.tax')} description={t('location.description')}>
          <SettingRow
            id="location"
            label={t('location.sectionLabel')}
            value={taxDisplay}
            editLabel={t('common.edit')}
            onEdit={() => {
              setCountryCode(user.country_code ?? '');
              setStateCode(user.state_code ?? '');
              setTaxStep('edit');
              setEditing('tax');
            }}
          />
        </SettingsSection>

        {/* ── Notifications ────────────────────────────────────────────────── */}
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
    </>
  );
}
