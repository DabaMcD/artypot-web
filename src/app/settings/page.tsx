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
import HandlesSection from '@/components/HandlesSection';
import CreatorSlugSection from '@/components/CreatorSlugSection';
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
  checked, onChange, saving, label, disabled = false,
}: {
  checked: boolean; onChange: (val: boolean) => void; saving: boolean; label: string; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={label}
      disabled={saving || disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors focus:outline-none disabled:opacity-30 cursor-pointer ${
        checked && !disabled ? 'bg-[var(--color-role)]' : 'bg-surface-2 border border-border'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

const NOTIF_ROWS: {
  label: string;
  desc: string;
  emailKey: keyof NotificationSettings;
  smsKey: keyof NotificationSettings;
  inAppKey: keyof NotificationSettings;
}[] = [
  { label: 'creator verified',       desc: 'a creator joins Artypot and your backing activates.',              emailKey: 'creator_answered',          smsKey: 'sms_creator_answered',          inAppKey: 'in_app_creator_answered' },
  { label: 'bounty pending review',  desc: 'a creator submits a bounty for council review.',                  emailKey: 'bounty_pending_completion',    smsKey: 'sms_bounty_pending_completion',    inAppKey: 'in_app_bounty_pending_completion' },
  { label: 'bounty confirmed',       desc: 'council approves a bounty and payment is queued.',               emailKey: 'bounty_confirmed_completed',   smsKey: 'sms_bounty_confirmed_completed',   inAppKey: 'in_app_bounty_confirmed_completed' },
  { label: 'backing confirmed',      desc: 'you backed a bounty.',                                           emailKey: 'pledge_confirmation',        smsKey: 'sms_pledge_confirmation',        inAppKey: 'in_app_pledge_confirmation' },
  { label: 'backing expired',        desc: 'your backing on a bounty reached its expiry and was removed.',   emailKey: 'pledge_expired',             smsKey: 'sms_pledge_expired',             inAppKey: 'in_app_pledge_expired' },
  { label: 'bounty updated',         desc: 'an initiator changes the title or description of a bounty you back.', emailKey: 'bounty_updated',           smsKey: 'sms_bounty_updated',                inAppKey: 'in_app_bounty_updated' },
  { label: 'billing preview',        desc: 'heads-up before your payment method is charged.',                emailKey: 'monthly_pledge_preview',    smsKey: 'sms_monthly_pledge_preview',    inAppKey: 'in_app_monthly_pledge_preview' },
  { label: 'monthly receipt',        desc: 'breakdown after your monthly payment is processed.',             emailKey: 'monthly_pledge_receipt',    smsKey: 'sms_monthly_pledge_receipt',    inAppKey: 'in_app_monthly_pledge_receipt' },
  { label: 'herald status lost',     desc: 'another fan outbids you and edits a profile you were heralding.', emailKey: 'herald_status_lost',       smsKey: 'sms_herald_status_lost',        inAppKey: 'in_app_herald_status_lost' },
  { label: 'payment authentication', desc: 'your bank needs you to confirm a charge (3D Secure).',           emailKey: 'payment_action_required',   smsKey: 'sms_payment_action_required',   inAppKey: 'in_app_payment_action_required' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState<Set<string>>(new Set());
  const [phoneInput, setPhoneInput] = useState<E164Number | undefined>(undefined);
  const [codeInput, setCodeInput] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'awaiting_code'>('idle');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [emailChangeInput, setEmailChangeInput] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeSent, setEmailChangeSent] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'artypot_profiles';
  const [showBrokeConfirm, setShowBrokeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    setCountryCode(user.country_code ?? '');
    setStateCode(user.state_code ?? '');
    notifApi.get().then(setNotifSettings).catch(() => {});
    pledgesApi.list().then((res) => setPledgeTotalAmount(res.total_active_amount)).catch(() => {});
  }, [user, authLoading, router]);

  const handleNotifToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!notifSettings) return;
    setNotifSettings({ ...notifSettings, [key]: value });
    setNotifSaving((prev) => new Set(prev).add(key));
    try {
      const updated = await notifApi.update({ [key]: value });
      setNotifSettings(updated);
      toast('Settings saved.', 'success');
    } catch {
      setNotifSettings({ ...notifSettings, [key]: !value });
      toast('Failed to save. Please try again.', 'error');
    } finally {
      setNotifSaving((prev) => { const s = new Set(prev); s.delete(key); return s; });
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
          onClose={() => setShowDeleteConfirm(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={dangerLoading}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={dangerLoading}>
                {dangerLoading ? 'Deleting…' : 'Yes, Delete My Account'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed mb-2">
            This will <strong className="text-foreground">permanently delete your account</strong>, cancel all your active commitments, and log you out immediately.
          </p>
          <p className="text-sm text-muted">Your account cannot be recovered. You may re-register with the same email address.</p>
        </Modal>
      )}

      <div className="space-y-7 pt-2 max-w-[680px]">
        <div>
          <SectionLabel>fan · settings</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">settings</h1>
        </div>

        {/* Email */}
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

        {/* Profile picture */}
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

        {/* Display name */}
        <Card>
          <SectionLabel className="mb-3">display name</SectionLabel>
          <form onSubmit={handleSaveName} className="flex gap-2">
            <Input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1" />
            <Button type="submit" variant="default" disabled={nameSaving || !nameInput.trim() || nameInput.trim() === user.display_name}>
              {nameSaving ? 'Saving…' : 'Save Name'}
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
              <Link href={`/${user.slug}/edit`}><Button variant="default" size="sm">Edit Profile →</Button></Link>
            </div>
          </Card>
        )}

        {/* Phone number */}
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

        {/* Notifications */}
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
              <div className="grid gap-x-4 items-center mb-2 px-1" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                <span />
                <span className="font-mono text-[9px] uppercase text-muted text-center w-9">email</span>
                <span className="font-mono text-[9px] uppercase text-muted text-center w-9">sms</span>
                <span className="font-mono text-[9px] uppercase text-muted text-center w-9">bell</span>
              </div>
              {NOTIF_ROWS.map(({ label, desc, emailKey, smsKey, inAppKey }) => (
                <div key={emailKey} className="grid gap-x-4 items-center py-2.5 border-b border-border last:border-0" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                  <div>
                    <p className="text-sm text-foreground">{label}</p>
                    <p className="text-xs text-muted mt-0.5">{desc}</p>
                  </div>
                  <MiniToggle checked={notifSettings[emailKey] as boolean} onChange={(val) => handleNotifToggle(emailKey, val)} saving={notifSaving.has(emailKey)} label={`email: ${label}`} disabled={!emailChannelAvailable} />
                  <MiniToggle checked={notifSettings[smsKey] as boolean} onChange={(val) => handleNotifToggle(smsKey, val)} saving={notifSaving.has(smsKey)} label={`sms: ${label}`} disabled={!phoneVerified} />
                  <MiniToggle checked={notifSettings[inAppKey] as boolean} onChange={(val) => handleNotifToggle(inAppKey, val)} saving={notifSaving.has(inAppKey)} label={`in-app: ${label}`} />
                </div>
              ))}
            </>
          )}
        </Card>

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

        {/* Location of residence */}
        <div id="location">
        <Card>
          <SectionLabel className="mb-3">location of residence</SectionLabel>
          <p className="text-sm text-muted mb-4">
            Used for earnings reporting if you enable creator mode. Required to become a creator.
          </p>
          <form onSubmit={handleSaveLocation} className="space-y-3">
            {/* Country */}
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

            {/* State / province (conditional) */}
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

        {/* Creator slug (creators only) */}
        <CreatorSlugSection />

        {/* Handles */}
        <HandlesSection />

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
