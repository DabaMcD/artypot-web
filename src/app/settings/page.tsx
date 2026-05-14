'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { users as usersApi, auth as authApi, notificationSettings as notifApi, phone as phoneApi, votives as votivesApi, handles as handlesApi } from '@/lib/api';
import { COUNTRIES, subdivisions, subdivisionLabel } from '@/lib/countries';
import type { HandleClaim, HandlePlatform } from '@/lib/types';
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
  { label: 'creator answered',       desc: 'a creator claims their profile and your backing activates.',       emailKey: 'creator_answered',          smsKey: 'sms_creator_answered',          inAppKey: 'in_app_creator_answered' },
  { label: 'bounty pending review',  desc: 'a creator submits a bounty for council review.',                  emailKey: 'pot_pending_completion',    smsKey: 'sms_pot_pending_completion',    inAppKey: 'in_app_pot_pending_completion' },
  { label: 'bounty confirmed',       desc: 'council approves a bounty and payment is queued.',               emailKey: 'pot_confirmed_completed',   smsKey: 'sms_pot_confirmed_completed',   inAppKey: 'in_app_pot_confirmed_completed' },
  { label: 'backing confirmed',      desc: 'you backed a bounty.',                                           emailKey: 'votive_confirmation',        smsKey: 'sms_votive_confirmation',        inAppKey: 'in_app_votive_confirmation' },
  { label: 'backing expired',        desc: 'your backing on a bounty reached its expiry and was removed.',   emailKey: 'votive_expired',             smsKey: 'sms_votive_expired',             inAppKey: 'in_app_votive_expired' },
  { label: 'bounty updated',         desc: 'an initiator changes the title or description of a bounty you back.', emailKey: 'pot_updated',           smsKey: 'sms_pot_updated',                inAppKey: 'in_app_pot_updated' },
  { label: 'billing preview',        desc: 'heads-up before your payment method is charged.',                emailKey: 'monthly_votive_preview',    smsKey: 'sms_monthly_votive_preview',    inAppKey: 'in_app_monthly_votive_preview' },
  { label: 'monthly receipt',        desc: 'breakdown after your monthly payment is processed.',             emailKey: 'monthly_votive_receipt',    smsKey: 'sms_monthly_votive_receipt',    inAppKey: 'in_app_monthly_votive_receipt' },
  { label: 'herald status lost',     desc: 'another fan outbids you and edits a profile you were heralding.', emailKey: 'herald_status_lost',       smsKey: 'sms_herald_status_lost',        inAppKey: 'in_app_herald_status_lost' },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const [picFile, setPicFile] = useState<File | null>(null);
  const [picUploading, setPicUploading] = useState(false);
  const [showBrokeConfirm, setShowBrokeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerMsg, setDangerMsg] = useState('');
  const [votiveTotalAmount, setVotiveTotalAmount] = useState<number | null>(null);

  // Location
  const [countryCode, setCountryCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);

  // Handles
  const [myHandles, setMyHandles] = useState<HandleClaim[]>([]);
  const [handlePlatform, setHandlePlatform] = useState<HandlePlatform>('twitter');
  const [handleUsername, setHandleUsername] = useState('');
  const [handleSubmitting, setHandleSubmitting] = useState(false);
  const [pendingCode, setPendingCode] = useState<{ handleId: number; code: string; platform: string; username: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    setIsAnonymous(user.is_anonymous ?? false);
    setNameInput(user.display_name ?? '');
    setCountryCode(user.country_code ?? '');
    setStateCode(user.state_code ?? '');
    notifApi.get().then(setNotifSettings).catch(() => {});
    votivesApi.list().then((res) => setVotiveTotalAmount(res.total_active_amount)).catch(() => {});
    authApi.myHandles().then((res) => setMyHandles(res.data)).catch(() => {});
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

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleUsername.trim()) return;
    setHandleSubmitting(true);
    setPendingCode(null);
    try {
      const { data: claim } = await handlesApi.store(handlePlatform, handleUsername.trim());
      const { verification_code } = await handlesApi.requestVerification(claim.handle.id);
      const handle = { id: claim.claim_id };
      setPendingCode({ handleId: handle.id, code: verification_code, platform: handlePlatform, username: handleUsername.trim() });
      setHandleUsername('');
      // Refresh handle list
      authApi.myHandles().then((res) => setMyHandles(res.data)).catch(() => {});
      toast('Verification request submitted! Post the code in your profile/bio.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to request verification.', 'error');
    } finally { setHandleSubmitting(false); }
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

  const handlePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicFile(file);
    setPicPreview(URL.createObjectURL(file));
  };

  const handlePicUpload = async () => {
    if (!user || !picFile) return;
    setPicUploading(true);
    try {
      await usersApi.uploadProfilePicture(user.id, picFile);
      await refreshUser();
      setPicFile(null); setPicPreview(null);
      toast('Profile picture updated!', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to upload picture.', 'error');
    } finally {
      setPicUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          title="back out of everything"
          onClose={() => setShowBrokeConfirm(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setShowBrokeConfirm(false)} disabled={dangerLoading}>cancel</Button>
              <Button variant="danger" onClick={handleBroke} disabled={dangerLoading}>
                {dangerLoading ? 'working…' : 'yes, back out of everything'}
              </Button>
            </>
          }
        >
          <p className="font-display text-sm text-muted leading-relaxed mb-2">
            this will immediately <strong className="text-foreground">cancel all your active commitments</strong> and remove your backing from every project.
          </p>
          {votiveTotalAmount != null && votiveTotalAmount > 0 && (
            <p className="font-mono text-sm text-bad mb-2">${votiveTotalAmount.toFixed(2)} in active commitments will be cancelled.</p>
          )}
          <p className="font-display text-sm text-muted">this cannot easily be undone. you would need to back each project individually again.</p>
        </Modal>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <Modal
          title="delete my account"
          onClose={() => setShowDeleteConfirm(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={dangerLoading}>cancel</Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={dangerLoading}>
                {dangerLoading ? 'deleting…' : 'yes, delete my account'}
              </Button>
            </>
          }
        >
          <p className="font-display text-sm text-muted leading-relaxed mb-2">
            this will <strong className="text-foreground">permanently delete your account</strong>, cancel all your active commitments, and log you out immediately.
          </p>
          <p className="font-display text-sm text-muted">your account cannot be recovered. you may re-register with the same email address.</p>
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
            <p className="font-display text-sm text-muted mb-4">add an email address to enable email notifications and password-based login.</p>
            {emailChangeSent ? (
              <Banner tone="good">confirmation email sent to <strong>{emailChangeSent}</strong>. click the link to complete.</Banner>
            ) : (
              <form onSubmit={handleRequestEmailChange} className="flex gap-2">
                <Input type="email" required placeholder="your@email.com" value={emailChangeInput} onChange={(e) => setEmailChangeInput(e.target.value)} className="flex-1" />
                <Button type="submit" variant="default" disabled={emailChangeLoading || !emailChangeInput.trim()}>
                  {emailChangeLoading ? 'sending…' : 'add email'}
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
              <span className="font-display text-sm text-foreground">{user.email}</span>
              <span className="font-mono text-[10px] uppercase text-good">✓ verified</span>
            </div>
            {user.pending_email && !emailChangeSent && (
              <Banner tone="warn" className="mb-3">pending change to <strong>{user.pending_email}</strong> — check that inbox.</Banner>
            )}
            {emailChangeSent ? (
              <Banner tone="good">confirmation sent to <strong>{emailChangeSent}</strong>. click the link to complete.</Banner>
            ) : (
              <form onSubmit={handleRequestEmailChange} className="flex gap-2">
                <Input type="email" required placeholder="new email address" value={emailChangeInput} onChange={(e) => setEmailChangeInput(e.target.value)} className="flex-1" />
                <Button type="submit" variant="default" disabled={emailChangeLoading || !emailChangeInput.trim()}>
                  {emailChangeLoading ? 'sending…' : 'change email'}
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
              {(picPreview || user.profile_picture) ? (
                <Image src={picPreview ?? user.profile_picture!} alt="Profile picture" fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-muted select-none font-display font-bold">
                  {user.display_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handlePicChange} />
              <div className="flex flex-wrap gap-2">
                <Button variant="default" size="sm" disabled={picUploading} onClick={() => fileInputRef.current?.click()}>
                  {picFile ? 'choose different…' : 'choose photo…'}
                </Button>
                {picFile && (
                  <Button variant="primary" size="sm" disabled={picUploading} onClick={handlePicUpload}>
                    {picUploading ? 'uploading…' : 'upload'}
                  </Button>
                )}
              </div>
              <p className="font-display text-xs text-muted mt-2">JPEG, PNG, GIF or WebP — max 2 MB.</p>
            </div>
          </div>
        </Card>

        {/* Display name */}
        <Card>
          <SectionLabel className="mb-3">display name</SectionLabel>
          <form onSubmit={handleSaveName} className="flex gap-2">
            <Input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1" />
            <Button type="submit" variant="default" disabled={nameSaving || !nameInput.trim() || nameInput.trim() === user.display_name}>
              {nameSaving ? 'saving…' : 'save name'}
            </Button>
          </form>
        </Card>

        {/* Privacy */}
        <Card>
          <SectionLabel className="mb-4">privacy</SectionLabel>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="font-display text-sm font-medium text-foreground mb-0.5">anonymous mode <span className="font-mono text-[9px] uppercase text-muted">(beta)</span></div>
              <p className="font-display text-xs text-muted">hide your backing from your public profile. your name appears as [anonymous] on supporter lists.</p>
            </div>
            <ToggleUI on={isAnonymous} onChange={(val) => handleToggle('is_anonymous', val)} label="" />
          </div>
        </Card>

        {/* Billing */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel className="mb-1">billing</SectionLabel>
              <p className="font-display text-sm text-muted">manage saved payment methods and see what you&apos;ve backed.</p>
            </div>
            <Link href="/billing"><Button variant="default" size="sm">go to billing →</Button></Link>
          </div>
        </Card>

        {/* Creator profile link */}
        {user.role === 'creator' && user.creator && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel className="mb-1">creator profile</SectionLabel>
                <p className="font-display text-sm text-muted">edit your public creator page — display name, bio, handles.</p>
              </div>
              <Link href={`/creators/${user.creator.id}/edit`}><Button variant="default" size="sm">edit profile →</Button></Link>
            </div>
          </Card>
        )}

        {/* Phone number */}
        <Card>
          <SectionLabel className="mb-2">phone number</SectionLabel>
          <p className="font-display text-sm text-muted mb-4">add a verified phone number to receive SMS notifications.</p>
          {phoneVerified ? (
            <div className="flex items-center gap-3">
              <span className="font-display text-sm text-foreground">{user.phone_number}</span>
              <span className="font-mono text-[10px] uppercase text-good">✓ verified</span>
              <button type="button" onClick={handleRemovePhone} disabled={phoneSaving} className="font-mono text-[10px] uppercase text-muted hover:text-bad transition-colors disabled:opacity-40 ml-auto cursor-pointer">
                {phoneSaving ? 'removing…' : 'remove'}
              </button>
            </div>
          ) : phoneStep === 'awaiting_code' ? (
            <div className="space-y-3">
              <p className="font-display text-xs text-muted">a 6-digit code was sent to <span className="text-foreground font-medium">{phoneInput}</span>.</p>
              <div className="flex gap-2">
                <Input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))} className="flex-1 tracking-widest" />
                <Button variant="primary" disabled={phoneSaving || codeInput.length !== 6} onClick={handleVerifyCode}>
                  {phoneSaving ? 'verifying…' : 'verify'}
                </Button>
              </div>
              <button type="button" onClick={() => { setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput(''); }} className="ap-inline-link font-display text-xs">
                ← use a different number
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <PhoneNumberInput value={phoneInput} onChange={setPhoneInput} disabled={phoneSaving} />
              <Button variant="primary" disabled={phoneSaving || !phoneInput || !isValidPhoneNumber(phoneInput!)} onClick={handleSendCode}>
                {phoneSaving ? 'sending…' : 'send code'}
              </Button>
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card>
          <SectionLabel className="mb-4">notifications</SectionLabel>
          {!hasEmail && <Banner tone="warn" className="mb-3">add an email address above to enable email notifications.</Banner>}
          {hasEmail && !emailVerified && <Banner tone="warn" className="mb-3">verify your email to enable email notifications.</Banner>}
          {!phoneVerified && (
            <Banner tone="warn" className="mb-3">
              {user.phone_number ? 'verify your phone number to enable SMS notifications.' : 'add and verify your phone number to enable SMS notifications.'}
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
                    <p className="font-display text-sm text-foreground">{label}</p>
                    <p className="font-display text-xs text-muted mt-0.5">{desc}</p>
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
                <p className="font-display text-sm text-muted">update your login password.</p>
              </div>
              <Link href="/settings/password"><Button variant="default" size="sm">change password →</Button></Link>
            </div>
          </Card>
        )}

        {/* Location of residence */}
        <div id="location">
        <Card>
          <SectionLabel className="mb-3">location of residence</SectionLabel>
          <p className="font-display text-sm text-muted mb-4">
            used for earnings reporting if you enable creator mode. required to become a creator.
          </p>
          <form onSubmit={handleSaveLocation} className="space-y-3">
            {/* Country */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">country</label>
              <select
                value={countryCode}
                onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); }}
                className="w-full bg-surface border border-border rounded px-3 py-2 font-display text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
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
                  className="w-full bg-surface border border-border rounded px-3 py-2 font-display text-sm text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
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
              {locationSaving ? 'saving…' : 'save location'}
            </Button>
          </form>
        </Card>
        </div>

        {/* Handles */}
        <div id="handles">
        <Card>
          <SectionLabel className="mb-3">handles</SectionLabel>
          <p className="font-display text-sm text-muted mb-4">
            link a social account so fans know you&apos;re the real deal. council reviews your ownership claim and verifies it.
          </p>

          {/* Existing handle requests */}
          {myHandles.length > 0 && (
            <div className="divide-y divide-border -mx-5 mb-4 border-y border-border">
              {myHandles.map((h) => (
                <div key={h.claim_id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-foreground">
                      <span className="text-muted">{h.handle.platform}/</span>{h.handle.username}
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-widest ${
                    h.status === 'verified' ? 'text-good' : 'text-warn'
                  }`}>{h.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Show pending code after a new request */}
          {pendingCode && (
            <div className="mb-4 p-3 border border-warn/40 rounded bg-warn/5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-warn mb-1">verification code</p>
              <p className="font-display text-sm text-foreground mb-1">
                post this code somewhere visible on your <span className="font-bold">{pendingCode.platform}/{pendingCode.username}</span> profile or bio:
              </p>
              <p className="font-mono text-base font-bold text-foreground tracking-widest select-all bg-surface-2 px-3 py-2 rounded">
                {pendingCode.code}
              </p>
              <p className="font-display text-xs text-muted mt-2">once it&apos;s there, council will verify ownership and update your status.</p>
            </div>
          )}

          {/* Request form */}
          <form onSubmit={handleRequestVerification} className="space-y-3">
            <div className="flex gap-2">
              <select
                value={handlePlatform}
                onChange={(e) => setHandlePlatform(e.target.value as HandlePlatform)}
                className="bg-surface border border-border rounded px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-[var(--color-role)] transition-colors"
              >
                <option value="twitter">twitter / x</option>
                <option value="youtube">youtube</option>
                <option value="instagram">instagram</option>
                <option value="tiktok">tiktok</option>
                <option value="twitch">twitch</option>
              </select>
              <input
                type="text"
                value={handleUsername}
                onChange={(e) => setHandleUsername(e.target.value)}
                placeholder="username"
                className="flex-1 bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--color-role)] transition-colors"
              />
            </div>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={handleSubmitting || !handleUsername.trim()}
            >
              {handleSubmitting ? 'requesting…' : 'request verification →'}
            </Button>
          </form>
        </Card>
        </div>

        {/* Danger zone */}
        <Card className="border-bad/30">
          <SectionLabel className="mb-4 text-bad">danger zone</SectionLabel>

          <div className="flex items-start justify-between gap-6 py-4 border-b border-border">
            <div className="flex-1">
              <p className="font-display font-bold text-foreground mb-0.5">💸 click this if you&apos;re broke!!</p>
              <p className="font-display text-sm text-muted">do not give away cash you don&apos;t have. instantly backs out of everything you&apos;ve committed to.</p>
            </div>
            <Button variant="danger" onClick={() => { setDangerMsg(''); setShowBrokeConfirm(true); }}>i&apos;m broke</Button>
          </div>

          <div className="flex items-start justify-between gap-6 pt-4">
            <div className="flex-1">
              <p className="font-display font-bold text-foreground mb-0.5">delete my account</p>
              <p className="font-display text-sm text-muted">permanently deletes your account and cancels all your commitments. your email can be reused.</p>
            </div>
            <Button variant="danger" onClick={() => { setDangerMsg(''); setShowDeleteConfirm(true); }}>delete account</Button>
          </div>

          {dangerMsg && <p className="font-display text-sm text-bad mt-3">{dangerMsg}</p>}
        </Card>
      </div>
    </>
  );
}
