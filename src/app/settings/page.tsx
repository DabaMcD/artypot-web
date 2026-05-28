'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary';
import { normalizeAvatarUrl, AVATAR_UPLOAD_OPTIONS } from '@/lib/cloudinary';
import { users as usersApi, auth as authApi, notificationSettings as notifApi, phone as phoneApi, pledges as pledgesApi } from '@/lib/api';
import { COUNTRIES, subdivisions, subdivisionLabel } from '@/lib/countries';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import PhoneNumberInput, { isValidPhoneNumber, type E164Number } from '@/components/PhoneNumberInput';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import type { NotificationSettings } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, FieldLabel } from '@/components/ui/Input';
import { Toggle as ToggleUI } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';

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
  label: string;
  desc: string;
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
    label: 'creator verified',
    desc: 'a creator you left a bounty for joins Artypot.',
    emailKey: 'creator_verified',         emailRule: 'toggle',
    smsKey:   'sms_creator_verified',     smsRule:   'toggle',
    bellKey:  'in_app_creator_verified',  bellRule:  'toggle',
  },
  {
    label: 'bounty pending review',
    desc: 'a creator submits completion for your bounty.',
    emailKey: 'bounty_pending_review',         emailRule: 'toggle',
    smsKey:   'sms_bounty_pending_review',     smsRule:   'toggle',
    bellKey:  'in_app_bounty_pending_review',  bellRule:  'toggle',
  },
  {
    label: 'bounty confirmed',
    desc: 'council approves a bounty and payment is queued.',
    emailKey: 'bounty_confirmed',         emailRule: 'toggle',
    smsKey:   'sms_bounty_confirmed',     smsRule:   'toggle',
    bellKey:  'in_app_bounty_confirmed',  bellRule:  'toggle',
  },
  {
    label: 'backing confirmed',
    desc: 'you backed a bounty.',
    emailKey: 'backing_confirmed',     emailRule: 'toggle',
    smsKey:   'sms_backing_confirmed', smsRule:   'toggle',
    bellKey:  null,                    bellRule:  'mandatory_off',
  },
  {
    label: 'backing expired',
    desc: 'your backing on a bounty reached its expiry and was removed.',
    emailKey: 'backing_expired',         emailRule: 'toggle',
    smsKey:   'sms_backing_expired',     smsRule:   'toggle',
    bellKey:  'in_app_backing_expired',  bellRule:  'toggle',
  },
  {
    label: 'billing preview',
    desc: 'heads-up before your payment method is charged.',
    emailKey: 'billing_preview',     emailRule: 'toggle',
    smsKey:   'sms_billing_preview', smsRule:   'toggle',
    bellKey:  null,                  bellRule:  'mandatory_off',
  },
  {
    label: 'billing receipt',
    desc: 'breakdown after your monthly payment is processed.',
    emailKey: 'billing_receipt',         emailRule: 'toggle',
    smsKey:   'sms_billing_receipt',     smsRule:   'toggle',
    bellKey:  'in_app_billing_receipt',  bellRule:  'toggle',
  },
  {
    label: 'bounty activity',
    desc: "a comment or update on a bounty you're following.",
    emailKey: 'bounty_activity',         emailRule: 'toggle',
    smsKey:   'sms_bounty_activity',     smsRule:   'toggle',
    bellKey:  'in_app_bounty_activity',  bellRule:  'toggle',
  },
  {
    label: 'creator activity',
    desc: 'a creator you follow posts something or submits a bounty.',
    emailKey: 'creator_activity',         emailRule: 'toggle',
    smsKey:   'sms_creator_activity',     smsRule:   'toggle',
    bellKey:  'in_app_creator_activity',  bellRule:  'toggle',
  },
  {
    label: 'comment reply',
    desc: 'someone replied to a comment thread you participated in.',
    emailKey: 'comment_reply',         emailRule: 'toggle',
    smsKey:   'sms_comment_reply',     smsRule:   'toggle',
    bellKey:  'in_app_comment_reply',  bellRule:  'toggle',
  },
  {
    label: 'account management',
    desc: 'required actions, admin messages, handle verification results.',
    emailKey: null, emailRule: 'mandatory_on',
    smsKey:   null, smsRule:   'mandatory_on',
    bellKey:  null, bellRule:  'mandatory_on',
  },
];

export default function SettingsPage() {
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
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [expiryValue, setExpiryValue] = useState('39');
  const [expiryUnit, setExpiryUnit] = useState('month');
  const [expirySaving, setExpirySaving] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'artypot_profiles';
  const [showBrokeConfirm, setShowBrokeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerMsg, setDangerMsg] = useState('');
  const [pledgeTotalAmount, setPledgeTotalAmount] = useState<number | null>(null);

  // Location
  const [countryCode, setCountryCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    setIsAnonymous(user.is_anonymous ?? false);
    setNameInput(user.display_name ?? '');
    setExpiryValue(String(user.default_expiry_value ?? 39));
    setExpiryUnit(user.default_expiry_unit ?? 'month');
    setCountryCode(user.country_code ?? '');
    setStateCode(user.state_code ?? '');
    notifApi.get().then(setNotifSettings).catch(() => {});
    pledgesApi.list().then((res) => setPledgeTotalAmount(res.total_active_amount)).catch(() => {});
  }, [user, authLoading, router]);

  const handleNotifToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!notifSettings) return;

    // If turning ON while master is off, also re-enable the master
    let masterKey: keyof NotificationSettings | null = null;
    const emailKeys: Array<keyof NotificationSettings> = [
      'creator_verified','bounty_pending_review','bounty_confirmed',
      'backing_confirmed','backing_expired','billing_preview',
      'billing_receipt','bounty_activity','creator_activity','comment_reply',
      'creator_new_bounty','creator_bounty_verified',
    ];
    const smsKeys: Array<keyof NotificationSettings> = [
      'sms_creator_verified','sms_bounty_pending_review','sms_bounty_confirmed',
      'sms_backing_confirmed','sms_backing_expired','sms_billing_preview',
      'sms_billing_receipt','sms_bounty_activity','sms_creator_activity','sms_comment_reply',
      'sms_creator_new_bounty','sms_creator_bounty_verified',
    ];
    const bellKeys: Array<keyof NotificationSettings> = [
      'in_app_creator_verified','in_app_bounty_pending_review','in_app_bounty_confirmed',
      'in_app_backing_expired','in_app_billing_receipt','in_app_bounty_activity','in_app_creator_activity',
      'in_app_comment_reply','in_app_creator_new_bounty','in_app_creator_bounty_verified',
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

  const handleToggle = async (field: 'is_anonymous', value: boolean) => {
    if (!user) return;
    setSaving(true);
    if (field === 'is_anonymous') setIsAnonymous(value);
    try {
      await usersApi.update(user.id, { [field]: value });
      await refreshUser();
      toast('Settings saved.', 'success');
    } catch {
      if (field === 'is_anonymous') setIsAnonymous(!value);
      toast('Failed to save. Please try again.', 'error');
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
      toast('Name updated!', 'success');
    } catch { toast('Failed to save name.', 'error'); }
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
      toast('Default expiry saved.', 'success');
    } catch { toast('Failed to save expiry.', 'error'); }
    finally { setExpirySaving(false); }
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
      toast('Tax residence saved.', 'success');
    } catch { toast('Failed to save tax residence.', 'error'); }
    finally { setLocationSaving(false); }
  };

  const handleSendCode = async () => {
    if (!phoneInput || !isValidPhoneNumber(phoneInput)) return;
    setPhoneSaving(true);
    try {
      await phoneApi.sendCode(phoneInput);
      setPhoneStep('awaiting_code');
      setCodeInput('');
      toast('Verification code sent!', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to send code.', 'error');
    } finally { setPhoneSaving(false); }
  };

  const handleVerifyCode = async () => {
    if (!codeInput.trim()) return;
    setPhoneSaving(true);
    try {
      await phoneApi.verifyCode(codeInput.trim());
      await refreshUser();
      setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput('');
      toast('Phone number verified!', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Invalid or expired code.', 'error');
    } finally { setPhoneSaving(false); }
  };

  const handleRemovePhone = async () => {
    setPhoneSaving(true);
    try {
      await phoneApi.remove();
      await refreshUser();
      setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput('');
      toast('Phone number removed.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to remove phone number.', 'error');
    } finally { setPhoneSaving(false); }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailChangeInput.trim()) return;
    setEmailChangeLoading(true);
    try {
      await authApi.requestEmailChange(emailChangeInput.trim());
      setEmailChangeSent(emailChangeInput.trim());
      setEmailChangeInput('');
      toast('Confirmation email sent!', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to send confirmation email.', 'error');
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
      toast('Profile picture updated!', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to save picture.', 'error');
    } finally {
      setPicSaving(false);
    }
  };

  const handleBroke = async () => {
    setDangerLoading(true); setDangerMsg('');
    try {
      const res = await authApi.broke();
      setShowBrokeConfirm(false);
      setDangerMsg(`done — ${res.data.revoked_count} ${res.data.revoked_count === 1 ? 'commitment' : 'commitments'} cancelled.`);
    } catch { setDangerMsg('something went wrong. please try again.'); }
    finally { setDangerLoading(false); }
  };

  const handleDeleteAccount = async () => {
    setDangerLoading(true);
    try {
      await authApi.deleteAccount();
      await logout();
      router.replace('/');
    } catch {
      setDangerMsg('something went wrong. please try again.');
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
          title="Back Out of Everything"
          onClose={() => setShowBrokeConfirm(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setShowBrokeConfirm(false)} disabled={dangerLoading}>Cancel</Button>
              <Button variant="danger" onClick={handleBroke} disabled={dangerLoading}>
                {dangerLoading ? 'Working…' : 'Yes, Back Out of Everything'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed mb-2">
            This will immediately <strong className="text-foreground">cancel all your active commitments</strong> and remove your backing from every project.
          </p>
          {pledgeTotalAmount != null && pledgeTotalAmount > 0 && (
            <p className="font-mono text-sm text-bad mb-2">${pledgeTotalAmount.toFixed(2)} in active commitments will be cancelled.</p>
          )}
          <p className="text-sm text-muted">This cannot easily be undone. You would need to back each project individually again.</p>
        </Modal>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <Modal
          title="Delete My Account"
          onClose={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }}
          actions={
            <>
              <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }} disabled={dangerLoading}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={dangerLoading || deleteConfirmName !== user.display_name}>
                {dangerLoading ? 'Deleting…' : 'Yes, Delete My Account'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed mb-2">
            This will <strong className="text-foreground">permanently delete your account</strong>, cancel all your active commitments, and log you out immediately.
          </p>
          <p className="text-sm text-muted mb-3">Your account cannot be recovered. You may re-register with the same email address.</p>
          <p className="text-sm text-muted mb-2">
            Type <strong className="text-foreground font-mono">{user.display_name}</strong> to confirm:
          </p>
          <Input
            type="text"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder={user.display_name ?? ''}
            autoFocus
          />
        </Modal>
      )}

      <div className="space-y-7 pt-2 max-w-[680px]">
        <div>
          <SectionLabel>fan · settings</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">settings</h1>
        </div>

        {/* Email */}
        <div id="email">
        {!hasEmail ? (
          <Card>
            <SectionLabel className="mb-3">email address</SectionLabel>
            <p className="text-sm text-muted mb-4">Add an email address to enable email notifications and password-based login.</p>
            {emailChangeSent ? (
              <Banner tone="good">Confirmation email sent to <strong>{emailChangeSent}</strong>. Click the link to complete.</Banner>
            ) : (
              <form onSubmit={handleRequestEmailChange} className="flex gap-2">
                <Input type="email" required placeholder="your@email.com" value={emailChangeInput} onChange={(e) => setEmailChangeInput(e.target.value)} className="flex-1" />
                <Button type="submit" variant="default" disabled={emailChangeLoading || !emailChangeInput.trim()}>
                  {emailChangeLoading ? 'Sending…' : 'Add Email'}
                </Button>
              </form>
            )}
          </Card>
        ) : !emailVerified ? (
          <EmailVerificationBanner email={user.email} />
        ) : (
          <Card>
            <SectionLabel className="mb-3">email address</SectionLabel>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-foreground">{user.email}</span>
              <span className="font-mono text-[10px] uppercase text-good">✓ verified</span>
            </div>
            {user.pending_email && !emailChangeSent && (
              <Banner tone="warn" className="mb-3">Pending change to <strong>{user.pending_email}</strong> — check that inbox.</Banner>
            )}
            {emailChangeSent ? (
              <Banner tone="good">Confirmation sent to <strong>{emailChangeSent}</strong>. Click the link to complete.</Banner>
            ) : (
              <form onSubmit={handleRequestEmailChange} className="flex gap-2">
                <Input type="email" required placeholder="new email address" value={emailChangeInput} onChange={(e) => setEmailChangeInput(e.target.value)} className="flex-1" />
                <Button type="submit" variant="default" disabled={emailChangeLoading || !emailChangeInput.trim()}>
                  {emailChangeLoading ? 'Sending…' : 'Change Email'}
                </Button>
              </form>
            )}
          </Card>
        )}
        </div>

        {/* Profile picture — moved to creator settings for creators */}
        {user.role === 'creator' ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel className="mb-1">profile picture</SectionLabel>
                <p className="text-sm text-muted">Manage your creator profile picture.</p>
              </div>
              <Link href="/c/settings#picture"><Button variant="default" size="sm">Creator Settings →</Button></Link>
            </div>
          </Card>
        ) : (
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
        )}

        {/* Display name — moved to creator settings for creators */}
        {user.role === 'creator' ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel className="mb-1">display name</SectionLabel>
                <p className="text-sm text-muted">Update your public name in creator settings.</p>
              </div>
              <Link href="/c/settings#display-name"><Button variant="default" size="sm">Creator Settings →</Button></Link>
            </div>
          </Card>
        ) : (
          <Card>
            <SectionLabel className="mb-3">display name</SectionLabel>
            <form onSubmit={handleSaveName} className="flex gap-2">
              <Input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1" />
              <Button type="submit" variant="default" disabled={nameSaving || !nameInput.trim() || nameInput.trim() === user.display_name}>
                {nameSaving ? 'Saving…' : 'Save Name'}
              </Button>
            </form>
          </Card>
        )}

        {/* Default pledge expiry */}
        <Card>
          <SectionLabel className="mb-1">default pledge expiry</SectionLabel>
          <p className="text-sm text-muted mb-4">
            How long your pledge stays active when you back a new bounty. You can always override this per bounty.
          </p>
          <form onSubmit={handleSaveExpiry} className="flex gap-2 items-end">
            <div className="flex-1">
              <FieldLabel>length</FieldLabel>
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
              <FieldLabel>unit</FieldLabel>
              <select
                value={expiryUnit}
                onChange={(e) => setExpiryUnit(e.target.value)}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
              >
                <option value="day">day(s)</option>
                <option value="week">week(s)</option>
                <option value="month">month(s)</option>
                <option value="year">year(s)</option>
              </select>
            </div>
            <Button
              type="submit"
              variant="default"
              disabled={expirySaving || !expiryValue || parseInt(expiryValue, 10) < 1}
            >
              {expirySaving ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </Card>

        {/* Privacy */}
        <Card>
          <SectionLabel className="mb-4">privacy</SectionLabel>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground mb-0.5">Anonymous mode <span className="font-mono text-[9px] uppercase text-muted">(beta)</span></div>
              <p className="text-xs text-muted">Hide your backing from your public profile. Your name appears as [anonymous] on supporter lists.</p>
            </div>
            <ToggleUI on={isAnonymous} onChange={(val) => handleToggle('is_anonymous', val)} label="" />
          </div>
        </Card>

        {/* Billing */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel className="mb-1">billing</SectionLabel>
              <p className="text-sm text-muted">Manage saved payment methods and see what you&apos;ve backed.</p>
            </div>
            <Link href="/billing"><Button variant="default" size="sm">Go to Billing →</Button></Link>
          </div>
        </Card>

        {/* Creator profile link */}
        {user.role === 'creator' && user.creator && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel className="mb-1">creator profile</SectionLabel>
                <p className="text-sm text-muted">Edit your public creator page — display name, bio, handles.</p>
              </div>
              <Link href="/c/settings"><Button variant="default" size="sm">Edit Profile →</Button></Link>
            </div>
          </Card>
        )}

        {/* Phone number */}
        <div id="phone">
        <Card>
          <SectionLabel className="mb-2">phone number</SectionLabel>
          <p className="text-sm text-muted mb-4">Add a verified phone number to receive SMS notifications.</p>
          {phoneVerified ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground">{user.phone_number}</span>
              <span className="font-mono text-[10px] uppercase text-good">✓ verified</span>
              <button type="button" onClick={handleRemovePhone} disabled={phoneSaving} className="font-mono text-[10px] uppercase text-muted hover:text-bad transition-colors disabled:opacity-40 ml-auto cursor-pointer">
                {phoneSaving ? 'removing…' : 'remove'}
              </button>
            </div>
          ) : phoneStep === 'awaiting_code' ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">A 6-digit code was sent to <span className="text-foreground font-medium">{phoneInput}</span>.</p>
              <div className="flex gap-2">
                <Input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))} className="flex-1 tracking-widest" />
                <Button variant="primary" disabled={phoneSaving || codeInput.length !== 6} onClick={handleVerifyCode}>
                  {phoneSaving ? 'Verifying…' : 'Verify'}
                </Button>
              </div>
              <button type="button" onClick={() => { setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput(''); }} className="ap-inline-link text-xs">
                ← Use a Different Number
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <PhoneNumberInput value={phoneInput} onChange={setPhoneInput} disabled={phoneSaving} />
              <Button variant="primary" disabled={phoneSaving || !phoneInput || !isValidPhoneNumber(phoneInput!)} onClick={handleSendCode}>
                {phoneSaving ? 'Sending…' : 'Send Code'}
              </Button>
            </div>
          )}
        </Card>
        </div>

        {/* Notifications */}
        <div id="notifications">
        <Card>
          <SectionLabel className="mb-4">notifications</SectionLabel>
          {!hasEmail && <Banner tone="warn" className="mb-3">Add an email address above to enable email notifications.</Banner>}
          {hasEmail && !emailVerified && <Banner tone="warn" className="mb-3">Verify your email to enable email notifications.</Banner>}
          {!phoneVerified && (
            <Banner tone="warn" className="mb-3">
              {user.phone_number ? 'Verify your phone number to enable SMS notifications.' : 'Add and verify your phone number to enable SMS notifications.'}
            </Banner>
          )}
          {!notifSettings ? (
            <div className="py-6 text-center font-mono text-xs text-muted">loading…</div>
          ) : (
            <>
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

              {/* Notification rows */}
              {NOTIF_ROWS.map(({ label, desc, emailKey, emailRule, smsKey, smsRule, bellKey, bellRule }) => (
                <div key={label} className="grid gap-x-4 items-center py-2.5 border-b border-border last:border-0" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                  <div>
                    <p className="text-sm text-foreground">{label}</p>
                    <p className="text-xs text-muted mt-0.5">{desc}</p>
                  </div>

                  {/* Email cell */}
                  {emailRule === 'mandatory_on' ? (
                    <MiniToggle checked={true} onChange={() => {}} saving={false} label={`email: ${label} (always on)`} disabled={true} />
                  ) : emailRule === 'mandatory_off' ? (
                    <span title="Not available" className="w-9 flex justify-center text-muted text-xs font-mono">—</span>
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

                  {/* SMS cell */}
                  {smsRule === 'mandatory_on' ? (
                    <MiniToggle checked={true} onChange={() => {}} saving={false} label={`sms: ${label} (always on)`} disabled={true} />
                  ) : smsRule === 'mandatory_off' ? (
                    <span title="Not available" className="w-9 flex justify-center text-muted text-xs font-mono">—</span>
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

                  {/* Bell cell */}
                  {bellRule === 'mandatory_on' ? (
                    <MiniToggle checked={true} onChange={() => {}} saving={false} label={`bell: ${label} (always on)`} disabled={true} />
                  ) : bellRule === 'mandatory_off' ? (
                    <span title="Not available" className="w-9 flex justify-center text-muted text-xs font-mono">—</span>
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

              {/* Reset to defaults + creator cross-link */}
              <div className="mt-4 pt-3 border-border flex items-center justify-between gap-4">
                {user.role === 'creator' ? (
                  <Link href="/c/settings#notifications" className="text-xs font-mono text-muted hover:text-foreground transition-colors">
                    go to creator-related notifications →
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
                  {notifResetting ? 'resetting…' : 'reset to defaults'}
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
                <SectionLabel className="mb-1">password</SectionLabel>
                <p className="text-sm text-muted">Update your login password.</p>
              </div>
              <Link href="/settings/password"><Button variant="default" size="sm">Change Password →</Button></Link>
            </div>
          </Card>
        )}

        {/* Tax residence — moved to creator settings for creators */}
        {user.role === 'creator' ? (
          <div id="location">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel className="mb-1">tax residence</SectionLabel>
                  <p className="text-sm text-muted">Where you pay tax on your Artypot earnings.</p>
                </div>
                <Link href="/c/settings#location"><Button variant="default" size="sm">Creator Settings →</Button></Link>
              </div>
            </Card>
          </div>
        ) : (
          <div id="location">
          <Card>
            <SectionLabel className="mb-3">tax residence</SectionLabel>
            <p className="text-sm text-muted mb-4">
              The country (and state, where applicable) where you&apos;ll pay tax on Artypot earnings.
              Not required as a fan, but you&apos;ll need this set before you can become a creator.
            </p>
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
                {locationSaving ? 'Saving…' : 'Save Tax Residence'}
              </Button>
            </form>
          </Card>
          </div>
        )}

        {/* Handles — moved to /c/handles for creators */}
        {user.role === 'creator' && (
          <div id="handles">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel className="mb-1">handles</SectionLabel>
                  <p className="text-sm text-muted">Manage your verified social handles.</p>
                </div>
                <Link href="/c/handles"><Button variant="default" size="sm">Manage Handles →</Button></Link>
              </div>
            </Card>
          </div>
        )}

        {/* Danger zone */}
        <Card className="border-bad/30">
          <SectionLabel className="mb-4 text-bad">danger zone</SectionLabel>

          <div className="flex items-start justify-between gap-6 py-4 border-b border-border">
            <div className="flex-1">
              <p className="font-bold text-foreground mb-0.5">💸 Click This If You&apos;re Broke!!</p>
              <p className="text-sm text-muted">Do not give away cash you don&apos;t have. Instantly backs out of everything you&apos;ve committed to.</p>
            </div>
            <Button variant="danger" onClick={() => { setDangerMsg(''); setShowBrokeConfirm(true); }}>I&apos;m Broke</Button>
          </div>

          <div className="flex items-start justify-between gap-6 pt-4">
            <div className="flex-1">
              <p className="font-bold text-foreground mb-0.5">Delete My Account</p>
              <p className="text-sm text-muted">Permanently deletes your account and cancels all your commitments. Your email can be reused.</p>
            </div>
            <Button variant="danger" onClick={() => { setDangerMsg(''); setShowDeleteConfirm(true); }}>Delete Account</Button>
          </div>

          {dangerMsg && <p className="text-sm text-bad mt-3">{dangerMsg}</p>}
        </Card>
      </div>
    </>
  );
}
