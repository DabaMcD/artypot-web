'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useMoney } from '@/lib/format';
import Image from 'next/image';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary';
import { normalizeAvatarUrl, AVATAR_UPLOAD_OPTIONS } from '@/lib/cloudinary';
import { users as usersApi, auth as authApi, notificationSettings as notifApi, phone as phoneApi, backings as backingsApi } from '@/lib/api';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import PhoneNumberInput, { isValidPhoneNumber, type E164Number } from '@/components/PhoneNumberInput';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { StepUpField, buildStepUp, stepUpRequired } from '@/components/StepUpField';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SMS_ENABLED } from '@/lib/features';
import type { NotificationSettings } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, FieldLabel } from '@/components/ui/Input';
import { DEFAULT_BACKING_AMOUNT_FALLBACK } from '@/lib/config';
import { Toggle as ToggleUI } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';
import { TwoFactorCard, SessionsCard } from '@/components/settings/SecuritySettingsCards';

// Inline toggle for notification table rows
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

type ChannelRule = 'toggle' | 'mandatory_on' | 'mandatory_off';

const NOTIF_ROWS: {
  // `id` is a stable identifier: React key, aria-label seed, and i18n key under
  // notifications.rows.<id>.{label,desc}. Display text is resolved via t() at
  // render time — these are NOT user-facing strings.
  id: string;
  emailKey: keyof NotificationSettings | null;
  emailRule: ChannelRule;
  smsKey: keyof NotificationSettings | null;
  smsRule: ChannelRule;
  bellKey: keyof NotificationSettings | null;
  bellRule: ChannelRule;
}[] = [
  // IMPORTANT: Keep mandatory rules in sync with MANDATORY_ON / MANDATORY_OFF_BELL
  // in artypot-api/app/Models/NotificationSettings.php — update both together.
  {
    id: 'creatorVerified',
    emailKey: 'creator_verified',         emailRule: 'toggle',
    smsKey:   'sms_creator_verified',     smsRule:   'toggle',
    bellKey:  'in_app_creator_verified',  bellRule:  'toggle',
  },
  {
    id: 'bountyPendingReview',
    emailKey: 'bounty_pending_review',         emailRule: 'toggle',
    smsKey:   'sms_bounty_pending_review',     smsRule:   'toggle',
    bellKey:  'in_app_bounty_pending_review',  bellRule:  'toggle',
  },
  {
    id: 'bountyConfirmed',
    emailKey: 'bounty_confirmed',         emailRule: 'toggle',
    smsKey:   'sms_bounty_confirmed',     smsRule:   'toggle',
    bellKey:  'in_app_bounty_confirmed',  bellRule:  'toggle',
  },
  {
    id: 'backingConfirmed',
    emailKey: 'backing_confirmed',     emailRule: 'toggle',
    smsKey:   'sms_backing_confirmed', smsRule:   'toggle',
    bellKey:  null,                    bellRule:  'mandatory_off',
  },
  {
    id: 'backingExpired',
    emailKey: 'backing_expired',         emailRule: 'toggle',
    smsKey:   'sms_backing_expired',     smsRule:   'toggle',
    bellKey:  'in_app_backing_expired',  bellRule:  'toggle',
  },
  {
    id: 'billingPreview',
    emailKey: 'billing_preview',     emailRule: 'toggle',
    smsKey:   'sms_billing_preview', smsRule:   'toggle',
    bellKey:  null,                  bellRule:  'mandatory_off',
  },
  {
    id: 'billingReceipt',
    emailKey: 'billing_receipt',         emailRule: 'toggle',
    smsKey:   'sms_billing_receipt',     smsRule:   'toggle',
    bellKey:  'in_app_billing_receipt',  bellRule:  'toggle',
  },
  {
    id: 'bountyActivity',
    emailKey: 'bounty_activity',         emailRule: 'toggle',
    smsKey:   'sms_bounty_activity',     smsRule:   'toggle',
    bellKey:  'in_app_bounty_activity',  bellRule:  'toggle',
  },
  {
    id: 'creatorActivity',
    emailKey: 'creator_activity',         emailRule: 'toggle',
    smsKey:   'sms_creator_activity',     smsRule:   'toggle',
    bellKey:  'in_app_creator_activity',  bellRule:  'toggle',
  },
  {
    id: 'commentReply',
    emailKey: 'comment_reply',         emailRule: 'toggle',
    smsKey:   'sms_comment_reply',     smsRule:   'toggle',
    bellKey:  'in_app_comment_reply',  bellRule:  'toggle',
  },
  {
    id: 'regionAvailable',
    emailKey: 'market_available',         emailRule: 'toggle',
    smsKey:   'sms_market_available',     smsRule:   'toggle',
    bellKey:  'in_app_market_available',  bellRule:  'toggle',
  },
  {
    id: 'accountManagement',
    emailKey: null, emailRule: 'mandatory_on',
    smsKey:   null, smsRule:   'mandatory_on',
    bellKey:  null, bellRule:  'mandatory_on',
  },
];

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const money = useMoney();
  const router = useRouter();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState<Set<string>>(new Set());
  const [notifResetting, setNotifResetting] = useState(false);
  const [phoneInput, setPhoneInput] = useState<E164Number | undefined>(undefined);
  const [codeInput, setCodeInput] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'awaiting_code'>('idle');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [emailChangeInput, setEmailChangeInput] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeSent, setEmailChangeSent] = useState<string | null>(null);
  // Step-up factor (TOTP/recovery code or password) for the takeover-grade
  // actions below — change-email and delete-account.
  const [emailStepUp, setEmailStepUp] = useState('');
  const [deleteStepUp, setDeleteStepUp] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [expiryValue, setExpiryValue] = useState('39');
  const [expiryUnit, setExpiryUnit] = useState('month');
  const [expirySaving, setExpirySaving] = useState(false);
  const [backingAmountInput, setBackingAmountInput] = useState('5');
  const [backingAmountSaving, setBackingAmountSaving] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'artypot_profiles';
  const [showBrokeConfirm, setShowBrokeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerMsg, setDangerMsg] = useState('');
  const [backingTotalAmount, setBackingTotalAmount] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    setIsAnonymous(user.is_anonymous ?? false);
    setNameInput(user.display_name ?? '');
    setExpiryValue(String(user.default_expiry_value ?? 39));
    setExpiryUnit(user.default_expiry_unit ?? 'month');
    setBackingAmountInput(String(user.default_backing_amount ?? DEFAULT_BACKING_AMOUNT_FALLBACK));
    notifApi.get().then(setNotifSettings).catch(() => {});
    backingsApi.list().then((res) => setBackingTotalAmount(res.total_active_amount)).catch(() => {});
  }, [user, authLoading, router]);

  const handleNotifToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!notifSettings) return;

    // If turning ON while master is off, also re-enable the master
    let masterKey: keyof NotificationSettings | null = null;
    const emailKeys: Array<keyof NotificationSettings> = [
      'creator_verified','bounty_pending_review','bounty_confirmed',
      'backing_confirmed','backing_expired','billing_preview',
      'billing_receipt','bounty_activity','creator_activity','comment_reply',
      'creator_new_bounty','creator_bounty_verified','market_available',
    ];
    const smsKeys: Array<keyof NotificationSettings> = [
      'sms_creator_verified','sms_bounty_pending_review','sms_bounty_confirmed',
      'sms_backing_confirmed','sms_backing_expired','sms_billing_preview',
      'sms_billing_receipt','sms_bounty_activity','sms_creator_activity','sms_comment_reply',
      'sms_creator_new_bounty','sms_creator_bounty_verified','sms_market_available',
    ];
    const bellKeys: Array<keyof NotificationSettings> = [
      'in_app_creator_verified','in_app_bounty_pending_review','in_app_bounty_confirmed',
      'in_app_backing_expired','in_app_billing_receipt','in_app_bounty_activity','in_app_creator_activity',
      'in_app_comment_reply','in_app_creator_new_bounty','in_app_creator_bounty_verified','in_app_market_available',
    ];

    if (value) {
      if (emailKeys.includes(key) && !notifSettings.email_master) masterKey = 'email_master';
      else if (smsKeys.includes(key) && !notifSettings.sms_master) masterKey = 'sms_master';
      else if (bellKeys.includes(key) && !notifSettings.in_app_master) masterKey = 'in_app_master';
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
      toast(t('toasts.settingsSaved'), 'success');
    } catch {
      setNotifSettings({ ...notifSettings, [key]: !value });
      toast(t('toasts.saveFailed'), 'error');
    } finally {
      setNotifSaving((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleNotifReset = async () => {
    setNotifResetting(true);
    try {
      const updated = await notifApi.reset();
      setNotifSettings(updated);
      toast(t('toasts.notifReset'), 'success');
    } catch {
      toast(t('toasts.resetFailed'), 'error');
    } finally {
      setNotifResetting(false);
    }
  };

  const handleToggle = async (field: 'is_anonymous', value: boolean) => {
    if (!user) return;
    setSaving(true);
    if (field === 'is_anonymous') setIsAnonymous(value);
    try {
      await usersApi.update(user.id, { [field]: value });
      await refreshUser();
      toast(t('toasts.settingsSaved'), 'success');
    } catch {
      if (field === 'is_anonymous') setIsAnonymous(!value);
      toast(t('toasts.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nameInput.trim()) return;
    setNameSaving(true);
    try {
      await usersApi.update(user.id, { display_name: nameInput.trim() });
      await refreshUser();
      toast(t('toasts.nameUpdated'), 'success');
    } catch { toast(t('toasts.nameFailed'), 'error'); }
    finally { setNameSaving(false); }
  };

  const handleSaveExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const val = parseInt(expiryValue, 10);
    if (isNaN(val) || val < 1 || val > 999) return;
    setExpirySaving(true);
    try {
      await usersApi.update(user.id, { default_expiry_value: val, default_expiry_unit: expiryUnit });
      await refreshUser();
      toast(t('toasts.expirySaved'), 'success');
    } catch { toast(t('toasts.expiryFailed'), 'error'); }
    finally { setExpirySaving(false); }
  };

  const handleSaveBackingAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const val = parseFloat(backingAmountInput);
    if (isNaN(val) || val < 1 || val > 9999.99) return;
    setBackingAmountSaving(true);
    try {
      await usersApi.update(user.id, { default_backing_amount: val });
      await refreshUser();
      toast(t('toasts.backingAmountSaved'), 'success');
    } catch { toast(t('toasts.backingAmountFailed'), 'error'); }
    finally { setBackingAmountSaving(false); }
  };

  const handleSendCode = async () => {
    if (!phoneInput || !isValidPhoneNumber(phoneInput)) return;
    setPhoneSaving(true);
    try {
      await phoneApi.sendCode(phoneInput);
      setPhoneStep('awaiting_code');
      setCodeInput('');
      toast(t('toasts.codeSent'), 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toasts.codeSendFailed'), 'error');
    } finally { setPhoneSaving(false); }
  };

  const handleVerifyCode = async () => {
    if (!codeInput.trim()) return;
    setPhoneSaving(true);
    try {
      await phoneApi.verifyCode(codeInput.trim());
      await refreshUser();
      setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput('');
      toast(t('toasts.phoneVerified'), 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toasts.codeInvalid'), 'error');
    } finally { setPhoneSaving(false); }
  };

  const handleRemovePhone = async () => {
    setPhoneSaving(true);
    try {
      await phoneApi.remove();
      await refreshUser();
      setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput('');
      toast(t('toasts.phoneRemoved'), 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toasts.phoneRemoveFailed'), 'error');
    } finally { setPhoneSaving(false); }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailChangeInput.trim()) return;
    if (stepUpRequired(user) && !emailStepUp.trim()) return;
    setEmailChangeLoading(true);
    try {
      await authApi.requestEmailChange(emailChangeInput.trim(), buildStepUp(user, emailStepUp.trim()));
      setEmailChangeSent(emailChangeInput.trim());
      setEmailChangeInput('');
      setEmailStepUp('');
      toast(t('toasts.confirmEmailSent'), 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setEmailStepUp('');
      toast(e.message ?? t('toasts.confirmEmailFailed'), 'error');
    } finally { setEmailChangeLoading(false); }
  };

  // Profile pictures upload straight to Cloudinary (unsigned preset) via
  // CldUploadWidget. We persist a *normalized* delivery URL (512² q_auto
  // f_auto) so nobody ever downloads a 5 MB original.
  const handlePicUploaded = async (secureUrl: string) => {
    if (!user) return;
    const normalized = normalizeAvatarUrl(secureUrl);
    if (!normalized) return;
    setPicSaving(true);
    try {
      await usersApi.update(user.id, { profile_picture: normalized });
      await refreshUser();
      toast(t('toasts.pictureUpdated'), 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('toasts.pictureFailed'), 'error');
    } finally {
      setPicSaving(false);
    }
  };

  const handleBroke = async () => {
    setDangerLoading(true); setDangerMsg('');
    try {
      const res = await authApi.broke();
      setShowBrokeConfirm(false);
      setDangerMsg(t('danger.brokeDone', { count: res.data.revoked_count }));
    } catch { setDangerMsg(t('danger.genericError')); }
    finally { setDangerLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (stepUpRequired(user) && !deleteStepUp.trim()) return;
    setDangerLoading(true);
    try {
      await authApi.deleteAccount(buildStepUp(user, deleteStepUp.trim()));
      await logout();
      router.replace('/');
    } catch {
      setDeleteStepUp('');
      setDangerMsg(t('danger.genericError'));
      setDangerLoading(false);
      setShowDeleteConfirm(false);
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

  const hasEmail = user.email !== null;
  const emailVerified = !!user.email_verified_at;
  const emailChannelAvailable = hasEmail && emailVerified;
  const phoneVerified = !!user.phone_verified_at;

  return (
    <>
      {/* Broke confirm */}
      {showBrokeConfirm && (
        <Modal
          title={t('brokeModal.title')}
          onClose={() => setShowBrokeConfirm(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setShowBrokeConfirm(false)} disabled={dangerLoading}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={handleBroke} disabled={dangerLoading}>
                {dangerLoading ? t('brokeModal.working') : t('brokeModal.confirm')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed mb-2">
            {t.rich('brokeModal.body', { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
          </p>
          {backingTotalAmount != null && backingTotalAmount > 0 && (
            <p className="font-mono text-sm text-bad mb-2">{t('brokeModal.amountWarning', { amount: money(backingTotalAmount) })}</p>
          )}
          <p className="text-sm text-muted">{t('brokeModal.undoNote')}</p>
        </Modal>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <Modal
          title={t('deleteModal.title')}
          onClose={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); setDeleteStepUp(''); }}
          actions={
            <>
              <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); setDeleteStepUp(''); }} disabled={dangerLoading}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={dangerLoading || deleteConfirmName !== user.display_name || (stepUpRequired(user) && !deleteStepUp.trim())}>
                {dangerLoading ? t('deleteModal.deleting') : t('deleteModal.confirm')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed mb-2">
            {t.rich('deleteModal.body', { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
          </p>
          <p className="text-sm text-muted mb-3">{t('deleteModal.recoverNote')}</p>
          <p className="text-sm text-muted mb-2">
            {t.rich('deleteModal.typePrompt', { name: user.display_name, strong: (chunks) => <strong className="text-foreground font-mono">{chunks}</strong> })}
          </p>
          <Input
            type="text"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder={user.display_name ?? ''}
            autoFocus
          />
          <StepUpField user={user} value={deleteStepUp} onChange={setDeleteStepUp} className="mt-4" />
        </Modal>
      )}

      <div className="space-y-7 pt-2 max-w-[680px]">
        <div>
          <SectionLabel>{t('breadcrumb.fan')} · {t('breadcrumb.settings')}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('hero.title')}</h1>
        </div>

        {/* Email */}
        <div id="email">
        {!hasEmail ? (
          <Card>
            <SectionLabel className="mb-3">{t('email.label')}</SectionLabel>
            <p className="text-sm text-muted mb-4">{t('email.addBlurb')}</p>
            {emailChangeSent ? (
              <Banner tone="good">{t.rich('email.sentBanner', { email: emailChangeSent, strong: (chunks) => <strong>{chunks}</strong> })}</Banner>
            ) : (
              <form onSubmit={handleRequestEmailChange} className="space-y-3">
                <div className="flex gap-2">
                  <Input type="email" required placeholder={t('email.placeholderExample')} value={emailChangeInput} onChange={(e) => setEmailChangeInput(e.target.value)} className="flex-1" />
                  <Button type="submit" variant="default" disabled={emailChangeLoading || !emailChangeInput.trim() || (stepUpRequired(user) && !emailStepUp.trim())}>
                    {emailChangeLoading ? t('email.sending') : t('email.addButton')}
                  </Button>
                </div>
                <StepUpField user={user} value={emailStepUp} onChange={setEmailStepUp} />
              </form>
            )}
          </Card>
        ) : !emailVerified ? (
          <EmailVerificationBanner email={user.email} />
        ) : (
          <Card>
            <SectionLabel className="mb-3">{t('email.label')}</SectionLabel>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-foreground">{user.email}</span>
              <span className="font-mono text-[10px] uppercase text-good">{t('email.verifiedBadge')}</span>
            </div>
            {user.pending_email && !emailChangeSent && (
              <Banner tone="warn" className="mb-3">{t.rich('email.pendingBanner', { email: user.pending_email, strong: (chunks) => <strong>{chunks}</strong> })}</Banner>
            )}
            {emailChangeSent ? (
              <Banner tone="good">{t.rich('email.sentBannerShort', { email: emailChangeSent, strong: (chunks) => <strong>{chunks}</strong> })}</Banner>
            ) : (
              <form onSubmit={handleRequestEmailChange} className="space-y-3">
                <div className="flex gap-2">
                  <Input type="email" required placeholder={t('email.placeholderNew')} value={emailChangeInput} onChange={(e) => setEmailChangeInput(e.target.value)} className="flex-1" />
                  <Button type="submit" variant="default" disabled={emailChangeLoading || !emailChangeInput.trim() || (stepUpRequired(user) && !emailStepUp.trim())}>
                    {emailChangeLoading ? t('email.sending') : t('email.changeButton')}
                  </Button>
                </div>
                <StepUpField user={user} value={emailStepUp} onChange={setEmailStepUp} />
              </form>
            )}
          </Card>
        )}
        </div>

        {/* Profile picture, display name and bio are edited here for fans. For
            creators these are owned by /c/settings (the public-profile editor);
            the "creator profile" card below is their single doorway there, so we
            don't render empty redirect stubs for each field. */}
        {user.role !== 'creator' && (
          <Card>
            <SectionLabel className="mb-4">{t('profilePicture.label')}</SectionLabel>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-2 border border-border shrink-0">
                {user.profile_picture ? (
                  <Image src={user.profile_picture} alt={t('profilePicture.alt')} fill className="object-cover" unoptimized />
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
                        {picSaving ? t('profilePicture.saving') : user.profile_picture ? t('profilePicture.change') : t('profilePicture.upload')}
                      </Button>
                    )}
                  </CldUploadWidget>
                ) : (
                  <p className="text-xs text-bad">
                    {t('profilePicture.unavailable')}
                  </p>
                )}
                <p className="text-xs text-muted mt-2">
                  {t('profilePicture.anySize')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Display name — fans edit here; creators edit on /c/settings */}
        {user.role !== 'creator' && (
          <Card>
            <SectionLabel className="mb-3">{t('displayName.label')}</SectionLabel>
            <form onSubmit={handleSaveName} className="flex gap-2">
              <Input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1" />
              <Button type="submit" variant="default" disabled={nameSaving || !nameInput.trim() || nameInput.trim() === user.display_name}>
                {nameSaving ? t('common.saving') : t('displayName.saveButton')}
              </Button>
            </form>
          </Card>
        )}

        {/* Default backing expiry */}
        <Card>
          <SectionLabel className="mb-1">{t('expiry.label')}</SectionLabel>
          <p className="text-sm text-muted mb-4">
            {t('expiry.blurb')}
          </p>
          <form onSubmit={handleSaveExpiry} className="flex gap-2 items-end">
            <div className="flex-1">
              <FieldLabel>{t('expiry.lengthLabel')}</FieldLabel>
              <Input
                type="number"
                required
                min={1}
                max={999}
                value={expiryValue}
                onChange={(e) => setExpiryValue(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <FieldLabel>{t('expiry.unitLabel')}</FieldLabel>
              <select
                value={expiryUnit}
                onChange={(e) => setExpiryUnit(e.target.value)}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
              >
                <option value="day">{t('expiry.unitDay')}</option>
                <option value="week">{t('expiry.unitWeek')}</option>
                <option value="month">{t('expiry.unitMonth')}</option>
                <option value="year">{t('expiry.unitYear')}</option>
              </select>
            </div>
            <Button
              type="submit"
              variant="default"
              disabled={expirySaving || !expiryValue || parseInt(expiryValue, 10) < 1}
            >
              {expirySaving ? t('common.saving') : t('common.save')}
            </Button>
          </form>
        </Card>

        {/* Default backing amount */}
        <Card>
          <SectionLabel className="mb-1">{t('backingAmount.label')}</SectionLabel>
          <p className="text-sm text-muted mb-4">
            {t('backingAmount.blurb')}
          </p>
          <form onSubmit={handleSaveBackingAmount} className="flex gap-2 items-end">
            <div className="flex-1">
              <FieldLabel>{t('backingAmount.amountLabel')}</FieldLabel>
              <Input
                type="number"
                required
                min={1}
                max={9999.99}
                step={0.01}
                value={backingAmountInput}
                onChange={(e) => setBackingAmountInput(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="default"
              disabled={backingAmountSaving || !backingAmountInput || parseFloat(backingAmountInput) < 1}
            >
              {backingAmountSaving ? t('common.saving') : t('common.save')}
            </Button>
          </form>
        </Card>

        {/* Privacy */}
        <Card>
          <SectionLabel className="mb-4">{t('privacy.label')}</SectionLabel>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground mb-0.5">{t('privacy.anonTitle')} <span className="font-mono text-[9px] uppercase text-muted">{t('privacy.beta')}</span></div>
              <p className="text-xs text-muted">{t('privacy.anonDesc')}</p>
            </div>
            <ToggleUI on={isAnonymous} onChange={(val) => handleToggle('is_anonymous', val)} label="" disabled={saving} />
          </div>
        </Card>

        {/* Billing */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel className="mb-1">{t('billing.label')}</SectionLabel>
              <p className="text-sm text-muted">{t('billing.blurb')}</p>
            </div>
            <Link href="/billing"><Button variant="default" size="sm">{t('billing.cta')}</Button></Link>
          </div>
        </Card>

        {/* Creator profile link — this is the single doorway to the creator
            profile editors (which is why the per-field stubs were removed). Gate
            on role only: the inverse cards above hide for `role === 'creator'`,
            so a creator must always have this card or they'd have no profile
            editing affordance at all. */}
        {user.role === 'creator' && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel className="mb-1">{t('creatorProfile.label')}</SectionLabel>
                <p className="text-sm text-muted">{t('creatorProfile.blurb')}</p>
              </div>
              <Link href="/c/settings"><Button variant="default" size="sm">{t('creatorProfile.cta')}</Button></Link>
            </div>
          </Card>
        )}

        {/* Language — switcher persists the choice to the user's account.
            (Section header + blurb are translated wholesale in the settings
            string-migration pass; the switcher's own labels are localized.) */}
        <div id="language">
        <Card>
          <SectionLabel className="mb-2">{t('language.title')}</SectionLabel>
          <p className="text-sm text-muted mb-4">{t('language.blurb')}</p>
          <LanguageSwitcher variant="settings" />
        </Card>
        </div>

        {/* Phone number — hidden while SMS is disabled platform-wide (see lib/features.ts). */}
        {SMS_ENABLED && (
        <div id="phone">
        <Card>
          <SectionLabel className="mb-2">{t('phone.label')}</SectionLabel>
          <p className="text-sm text-muted mb-4">{t('phone.blurb')}</p>
          {phoneVerified ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground">{user.phone_number}</span>
              <span className="font-mono text-[10px] uppercase text-good">{t('phone.verifiedBadge')}</span>
              <button type="button" onClick={handleRemovePhone} disabled={phoneSaving} className="font-mono text-[10px] uppercase text-muted hover:text-bad transition-colors disabled:opacity-40 ml-auto cursor-pointer">
                {phoneSaving ? t('phone.removing') : t('phone.remove')}
              </button>
            </div>
          ) : phoneStep === 'awaiting_code' ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">{t.rich('phone.codeSentTo', { phone: String(phoneInput ?? ''), strong: (chunks) => <span className="text-foreground font-medium">{chunks}</span> })}</p>
              <div className="flex gap-2">
                <Input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))} className="flex-1 tracking-widest" />
                <Button variant="primary" disabled={phoneSaving || codeInput.length !== 6} onClick={handleVerifyCode}>
                  {phoneSaving ? t('phone.verifying') : t('phone.verify')}
                </Button>
              </div>
              <button type="button" onClick={() => { setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput(''); }} className="ap-inline-link text-xs">
                {t('phone.useDifferent')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <PhoneNumberInput value={phoneInput} onChange={setPhoneInput} disabled={phoneSaving} />
              <Button variant="primary" disabled={phoneSaving || !phoneInput || !isValidPhoneNumber(phoneInput!)} onClick={handleSendCode}>
                {phoneSaving ? t('phone.sending') : t('phone.sendCode')}
              </Button>
            </div>
          )}
        </Card>
        </div>
        )}

        {/* Notifications */}
        <div id="notifications">
        <Card>
          <SectionLabel className="mb-4">{t('notifications.label')}</SectionLabel>
          {!hasEmail && <Banner tone="warn" className="mb-3">{t('notifications.addEmailWarn')}</Banner>}
          {hasEmail && !emailVerified && <Banner tone="warn" className="mb-3">{t('notifications.verifyEmailWarn')}</Banner>}
          {/* SMS disabled platform-wide (see lib/features.ts) — no phone prompt. */}
          {SMS_ENABLED && !phoneVerified && (
            <Banner tone="warn" className="mb-3">
              {user.phone_number ? t('notifications.verifyPhoneWarn') : t('notifications.addPhoneWarn')}
            </Banner>
          )}
          {!notifSettings ? (
            <div className="py-6 text-center font-mono text-xs text-muted">{t('notifications.loading')}</div>
          ) : (
            <>
              {/* Column headers. SMS column is hidden while SMS is disabled
                  platform-wide (see lib/features.ts). */}
              <div className="grid gap-x-4 items-center mb-2" style={{ gridTemplateColumns: SMS_ENABLED ? '1fr auto auto auto' : '1fr auto auto' }}>
                <span />
                {(['email', 'sms', 'bell'] as const).filter((ch) => SMS_ENABLED || ch !== 'sms').map((ch) => (
                  <span key={ch} className={`font-mono text-[9px] uppercase w-9 text-center ${
                    (ch === 'email' && !emailChannelAvailable) || (ch === 'sms' && !phoneVerified)
                      ? 'text-muted/40' : 'text-muted'
                  }`}>{t(`notifications.channels.${ch}`)}</span>
                ))}
              </div>

              {/* Notification rows */}
              {NOTIF_ROWS.map(({ id, emailKey, emailRule, smsKey, smsRule, bellKey, bellRule }) => {
                const rowLabel = t(`notifications.rows.${id}.label`);
                return (
                <div key={id} className="grid gap-x-4 items-center py-2.5 border-b border-border last:border-0" style={{ gridTemplateColumns: SMS_ENABLED ? '1fr auto auto auto' : '1fr auto auto' }}>
                  <div>
                    <p className="text-sm text-foreground">{rowLabel}</p>
                    <p className="text-xs text-muted mt-0.5">{t(`notifications.rows.${id}.desc`)}</p>
                  </div>

                  {/* Email cell */}
                  {emailRule === 'mandatory_on' ? (
                    <MiniToggle checked={true} onChange={() => {}} saving={false} label={t('notifications.aria.emailAlwaysOn', { row: rowLabel })} disabled={true} />
                  ) : emailRule === 'mandatory_off' ? (
                    <span title={t('notifications.notAvailable')} className="w-9 flex justify-center text-muted text-xs font-mono">—</span>
                  ) : (
                    <MiniToggle
                      checked={!!(emailKey && notifSettings[emailKey])}
                      onChange={(val) => emailKey && handleNotifToggle(emailKey, val)}
                      saving={!!emailKey && notifSaving.has(emailKey)}
                      label={t('notifications.aria.email', { row: rowLabel })}
                      disabled={!emailChannelAvailable}
                      dimmed={emailChannelAvailable && !notifSettings.email_master}
                    />
                  )}

                  {/* SMS cell — hidden while SMS is disabled platform-wide (see lib/features.ts). */}
                  {SMS_ENABLED && (
                    smsRule === 'mandatory_on' ? (
                      <MiniToggle checked={true} onChange={() => {}} saving={false} label={t('notifications.aria.smsAlwaysOn', { row: rowLabel })} disabled={true} />
                    ) : smsRule === 'mandatory_off' ? (
                      <span title={t('notifications.notAvailable')} className="w-9 flex justify-center text-muted text-xs font-mono">—</span>
                    ) : (
                      <MiniToggle
                        checked={!!(smsKey && notifSettings[smsKey])}
                        onChange={(val) => smsKey && handleNotifToggle(smsKey, val)}
                        saving={!!smsKey && notifSaving.has(smsKey)}
                        label={t('notifications.aria.sms', { row: rowLabel })}
                        disabled={!phoneVerified}
                        dimmed={phoneVerified && !notifSettings.sms_master}
                      />
                    )
                  )}

                  {/* Bell cell */}
                  {bellRule === 'mandatory_on' ? (
                    <MiniToggle checked={true} onChange={() => {}} saving={false} label={t('notifications.aria.bellAlwaysOn', { row: rowLabel })} disabled={true} />
                  ) : bellRule === 'mandatory_off' ? (
                    <span title={t('notifications.notAvailable')} className="w-9 flex justify-center text-muted text-xs font-mono">—</span>
                  ) : (
                    <MiniToggle
                      checked={!!(bellKey && notifSettings[bellKey])}
                      onChange={(val) => bellKey && handleNotifToggle(bellKey, val)}
                      saving={!!bellKey && notifSaving.has(bellKey)}
                      label={t('notifications.aria.bell', { row: rowLabel })}
                      disabled={false}
                      dimmed={!notifSettings.in_app_master}
                    />
                  )}
                </div>
                );
              })}

              {/* Reset to defaults + creator cross-link */}
              <div className="mt-4 pt-3 border-border flex items-center justify-between gap-4">
                {user.role === 'creator' ? (
                  <Link href="/c/settings#notifications" className="text-xs font-mono text-muted hover:text-foreground transition-colors">
                    {t('notifications.creatorCrossLink')}
                  </Link>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleNotifReset}
                  disabled={notifResetting}
                  className="text-xs font-mono text-muted hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {notifResetting ? t('notifications.resetting') : t('notifications.resetToDefaults')}
                </button>
              </div>
            </>
          )}
        </Card>
        </div>

        {/* Password */}
        {hasEmail && emailVerified && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel className="mb-1">{t('password.label')}</SectionLabel>
                <p className="text-sm text-muted">{t('password.blurb')}</p>
              </div>
              <Link href="/settings/password"><Button variant="default" size="sm">{t('password.cta')}</Button></Link>
            </div>
          </Card>
        )}

        {/* Creator tax residence + handles are edited on /c/settings and
            /c/handles; the "creator profile" card above is the single doorway,
            so no empty redirect stubs are rendered here. */}

        {/* Security — two-factor + active sessions */}
        <TwoFactorCard />
        <SessionsCard />

        {/* Danger zone */}
        <Card className="border-bad/30">
          <SectionLabel className="mb-4 text-bad">{t('danger.label')}</SectionLabel>

          <div className="flex items-start justify-between gap-6 py-4 border-b border-border">
            <div className="flex-1">
              <p className="font-bold text-foreground mb-0.5">{t('danger.brokeTitle')}</p>
              <p className="text-sm text-muted">{t('danger.brokeDesc')}</p>
            </div>
            <Button variant="danger" onClick={() => { setDangerMsg(''); setShowBrokeConfirm(true); }}>{t('danger.brokeButton')}</Button>
          </div>

          <div className="flex items-start justify-between gap-6 pt-4">
            <div className="flex-1">
              <p className="font-bold text-foreground mb-0.5">{t('danger.deleteTitle')}</p>
              <p className="text-sm text-muted">{t('danger.deleteDesc')}</p>
            </div>
            <Button variant="danger" onClick={() => { setDangerMsg(''); setShowDeleteConfirm(true); }}>{t('danger.deleteButton')}</Button>
          </div>

          {dangerMsg && <p className="text-sm text-bad mt-3">{dangerMsg}</p>}
        </Card>
      </div>
    </>
  );
}
