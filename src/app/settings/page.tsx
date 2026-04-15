'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { users as usersApi, auth as authApi, notificationSettings as notifApi, phone as phoneApi, votives as votivesApi } from '@/lib/api';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import PhoneNumberInput, { isValidPhoneNumber, type E164Number } from '@/components/PhoneNumberInput';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import type { NotificationSettings } from '@/lib/types';

interface ToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  saving: boolean;
}

function Toggle({ id, label, description, checked, onChange, saving }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-border last:border-0">
      <div className="flex-1">
        <label htmlFor={id} className="font-medium text-foreground cursor-pointer">
          {label}
        </label>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={saving}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-creator/50 disabled:opacity-50 ${
          checked ? 'bg-creator' : 'bg-surface-2 border border-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Small inline toggle pill for the compact notification table
function MiniToggle({
  checked,
  onChange,
  saving,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  saving: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={label}
      disabled={saving || disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors focus:outline-none disabled:opacity-30 ${
        checked && !disabled ? 'bg-creator' : 'bg-surface-2 border border-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Danger confirmation dialog ─────────────────────────────────────────────
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-surface border border-red-800/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-foreground mb-3">{title}</h2>
        <div className="text-sm text-muted leading-relaxed mb-6">{body}</div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-border text-foreground text-sm font-medium py-2.5 rounded-lg hover:border-foreground/30 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notification rows definition ───────────────────────────────────────────
const NOTIF_ROWS: {
  label: string;
  desc: string;
  emailKey: keyof NotificationSettings;
  smsKey: keyof NotificationSettings;
  inAppKey: keyof NotificationSettings;
}[] = [
  {
    label: 'Summon Answered',
    desc: 'A creator or entity claims their profile and your pledge activates.',
    emailKey: 'summon_answered',
    smsKey: 'sms_summon_answered',
    inAppKey: 'in_app_summon_answered',
  },
  {
    label: 'Bounty Pending Review',
    desc: 'A creator or entity submits a bounty for Council review.',
    emailKey: 'pot_pending_completion',
    smsKey: 'sms_pot_pending_completion',
    inAppKey: 'in_app_pot_pending_completion',
  },
  {
    label: 'Bounty Confirmed Complete',
    desc: 'Council approves a bounty and payment is queued.',
    emailKey: 'pot_confirmed_completed',
    smsKey: 'sms_pot_confirmed_completed',
    inAppKey: 'in_app_pot_confirmed_completed',
  },
  {
    label: 'Pledge Confirmation',
    desc: 'You placed a pledge.',
    emailKey: 'votive_confirmation',
    smsKey: 'sms_votive_confirmation',
    inAppKey: 'in_app_votive_confirmation',
  },
  {
    label: 'Pledge Expired',
    desc: 'A pledge of yours reached its expiry and was removed.',
    emailKey: 'votive_expired',
    smsKey: 'sms_votive_expired',
    inAppKey: 'in_app_votive_expired',
  },
  {
    label: 'Bounty Updated',
    desc: 'An initiator changes the title or description of a bounty you back.',
    emailKey: 'pot_updated',
    smsKey: 'sms_pot_updated',
    inAppKey: 'in_app_pot_updated',
  },
  {
    label: 'Monthly Billing Preview',
    desc: 'Heads-up before your payment method is charged.',
    emailKey: 'monthly_votive_preview',
    smsKey: 'sms_monthly_votive_preview',
    inAppKey: 'in_app_monthly_votive_preview',
  },
  {
    label: 'Monthly Receipt',
    desc: 'Breakdown after your monthly payment is processed.',
    emailKey: 'monthly_votive_receipt',
    smsKey: 'sms_monthly_votive_receipt',
    inAppKey: 'in_app_monthly_votive_receipt',
  },
  {
    label: 'Herald Status Lost',
    desc: 'Another fan outbids you and edits a profile you were heralding.',
    emailKey: 'herald_status_lost',
    smsKey: 'sms_herald_status_lost',
    inAppKey: 'in_app_herald_status_lost',
  },
];

// ── Main page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();

  const { toast } = useToast();

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification settings
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState<Set<string>>(new Set());

  // Phone management
  const [phoneInput, setPhoneInput] = useState<E164Number | undefined>(undefined);
  const [codeInput, setCodeInput] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'awaiting_code'>('idle');
  const [phoneSaving, setPhoneSaving] = useState(false);

  // Email change
  const [emailChangeInput, setEmailChangeInput] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeSent, setEmailChangeSent] = useState<string | null>(null);

  // Display name
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Profile picture
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const [picFile, setPicFile] = useState<File | null>(null);
  const [picUploading, setPicUploading] = useState(false);

  // Danger zone dialogs
  const [showBrokeConfirm, setShowBrokeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerMsg, setDangerMsg] = useState('');
  const [votiveTotalAmount, setVotiveTotalAmount] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    setIsAnonymous(user.is_anonymous ?? false);
    setCoverFees(user.cover_processing_fees ?? false);
    setNameInput(user.name ?? '');
    notifApi.get().then(setNotifSettings).catch(() => {});
    votivesApi.list().then((res) => setVotiveTotalAmount(res.total_active_amount)).catch(() => {});
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

  const handleToggle = async (field: 'is_anonymous' | 'cover_processing_fees', value: boolean) => {
    if (!user) return;
    setSaving(true);

    if (field === 'is_anonymous') setIsAnonymous(value);
    if (field === 'cover_processing_fees') setCoverFees(value);

    try {
      await usersApi.update(user.id, { [field]: value });
      await refreshUser();
      toast('Settings saved.', 'success');
    } catch {
      if (field === 'is_anonymous') setIsAnonymous(!value);
      if (field === 'cover_processing_fees') setCoverFees(!value);
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
      await usersApi.update(user.id, { name: nameInput.trim() });
      await refreshUser();
      toast('Name updated!', 'success');
    } catch {
      toast('Failed to save name.', 'error');
    } finally {
      setNameSaving(false);
    }
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
      toast(e.message ?? 'Failed to send code. Check the number and try again.', 'error');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!codeInput.trim()) return;
    setPhoneSaving(true);
    try {
      await phoneApi.verifyCode(codeInput.trim());
      await refreshUser();
      setPhoneStep('idle');
      setPhoneInput(undefined);
      setCodeInput('');
      toast('Phone number verified!', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Invalid or expired code. Please try again.', 'error');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleRemovePhone = async () => {
    setPhoneSaving(true);
    try {
      await phoneApi.remove();
      await refreshUser();
      setPhoneStep('idle');
      setPhoneInput(undefined);
      setCodeInput('');
      toast('Phone number removed.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to remove phone number.', 'error');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailChangeInput.trim()) return;
    setEmailChangeLoading(true);
    try {
      await authApi.requestEmailChange(emailChangeInput.trim());
      setEmailChangeSent(emailChangeInput.trim());
      setEmailChangeInput('');
      toast('Confirmation email sent! Check your new inbox.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to send confirmation email.', 'error');
    } finally {
      setEmailChangeLoading(false);
    }
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
      setPicFile(null);
      setPicPreview(null);
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
    setDangerLoading(true);
    setDangerMsg('');
    try {
      const res = await authApi.broke();
      setShowBrokeConfirm(false);
      setDangerMsg(`Done — ${res.data.revoked_count} pledge${res.data.revoked_count === 1 ? '' : 's'} cancelled.`);
    } catch {
      setDangerMsg('Something went wrong. Please try again.');
    } finally {
      setDangerLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDangerLoading(true);
    try {
      await authApi.deleteAccount();
      await logout();
      router.replace('/');
    } catch {
      setDangerMsg('Something went wrong. Please try again.');
      setDangerLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const emailVerified = !!user.email_verified_at;
  const phoneVerified = !!user.phone_verified_at;

  return (
    <>
      {/* BROKE confirmation */}
      {showBrokeConfirm && (
        <ConfirmDialog
          title="Cancel All Pledges"
          body={
            <>
              <p className="mb-2">This will immediately cancel <strong className="text-foreground">all your active pledges</strong> and remove your funding from every project.</p>
              {votiveTotalAmount != null && votiveTotalAmount > 0 && (
                <p className="mb-2 font-semibold text-foreground">${votiveTotalAmount.toFixed(2)} in active pledges will be cancelled.</p>
              )}
              <p>This cannot easily be undone. You would need to re-place your pledge individually on each project.</p>
            </>
          }
          confirmLabel="Yes, Cancel All Pledges"
          onConfirm={handleBroke}
          onCancel={() => setShowBrokeConfirm(false)}
          loading={dangerLoading}
        />
      )}

      {/* Delete account confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete My Account"
          body={
            <>
              <p className="mb-2">This will <strong className="text-foreground">permanently delete your account</strong>, cancel all your active pledges, and log you out immediately.</p>
              <p>Your account cannot be recovered. You may re-register with the same email address.</p>
            </>
          }
          confirmLabel="Yes, Delete My Account"
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={dangerLoading}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted mt-1">Manage your account preferences.</p>
        </div>

        {/* Email verification warning */}
        {!emailVerified && (
          <EmailVerificationBanner email={user.email} />
        )}

        {/* Email Address — change email (only for verified users) */}
        {emailVerified && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Email Address</h2>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-foreground font-medium">{user.email}</span>
              <span className="text-xs text-green-400 font-medium">✓ Verified</span>
            </div>

            {user.pending_email && !emailChangeSent && (
              <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2 mb-3 text-xs text-amber-300">
                <span>⏳</span>
                <span>Pending change to <strong>{user.pending_email}</strong> — check that inbox for the confirmation link.</span>
              </div>
            )}

            {emailChangeSent ? (
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2 text-xs text-green-300">
                <span>✉️</span>
                <span>Confirmation email sent to <strong>{emailChangeSent}</strong>. Click the link to complete the change.</span>
              </div>
            ) : (
              <form onSubmit={handleRequestEmailChange} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="New email address"
                  value={emailChangeInput}
                  onChange={(e) => setEmailChangeInput(e.target.value)}
                  className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
                />
                <button
                  type="submit"
                  disabled={emailChangeLoading || !emailChangeInput.trim()}
                  className="bg-surface-2 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-brand/50 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {emailChangeLoading ? 'Sending…' : 'Change email'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Profile Picture */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Profile Picture</h2>

          <div className="flex items-center gap-4">
            {/* Current / preview avatar */}
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-2 border border-border shrink-0">
              {(picPreview || user.profile_picture) ? (
                <Image
                  src={picPreview ?? user.profile_picture!}
                  alt="Profile picture"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-muted select-none">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handlePicChange}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={picUploading}
                  className="bg-surface-2 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-brand/50 transition-colors disabled:opacity-50"
                >
                  {picFile ? 'Choose different…' : 'Choose photo…'}
                </button>
                {picFile && (
                  <button
                    type="button"
                    onClick={handlePicUpload}
                    disabled={picUploading}
                    className="bg-brand text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dim transition-colors disabled:opacity-50"
                  >
                    {picUploading ? 'Uploading…' : 'Upload'}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted mt-2">JPEG, PNG, GIF or WebP — max 2 MB. Anonymity mode hides your picture from other users.</p>
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Display Name</h2>
          <form onSubmit={handleSaveName} className="flex gap-2">
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
            />
            <button
              type="submit"
              disabled={nameSaving || !nameInput.trim() || nameInput.trim() === user.name}
              className="bg-surface-2 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-brand/50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {nameSaving ? 'Saving…' : 'Save name'}
            </button>
          </form>
        </div>

        {/* Privacy */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">Privacy</h2>
          <Toggle
            id="anonymous-mode"
            label="Anonymous Mode"
            description="Hide your pledges from your public profile. Your name will appear as [anonymous] on project supporter lists."
            checked={isAnonymous}
            onChange={(val) => handleToggle('is_anonymous', val)}
            saving={saving}
          />
        </div>

        {/* Payments */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">Payments</h2>
          <Toggle
            id="cover-fees"
            label="Cover Payment Processing Fees"
            description="Automatically add the Stripe processing fee (~2.9% + $0.30) to your monthly payment so creators receive your full stated amount."
            checked={coverFees}
            onChange={(val) => handleToggle('cover_processing_fees', val)}
            saving={saving}
          />
        </div>

        {/* Billing link */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Billing</h2>
          <p className="text-sm text-muted mb-3">Manage your saved payment methods and view your pledge history.</p>
          <Link
            href="/billing"
            className="inline-block bg-surface-2 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-creator/50 transition-colors"
          >
            Go to Billing →
          </Link>
        </div>

        {/* Creator Profile */}
        {user.role === 'summoned' && user.summon && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Creator Profile</h2>
            <p className="text-sm text-muted mb-3">Edit your public creator page — display name, bio, social handles, and fan name.</p>
            <Link
              href={`/summons/${user.summon.id}/edit`}
              className="inline-block bg-surface-2 border border-border text-creator text-sm font-medium px-4 py-2 rounded-lg hover:border-creator/50 transition-colors"
            >
              Edit Creator Profile →
            </Link>
          </div>
        )}

        {/* Phone Number */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">Phone Number</h2>
          <p className="text-sm text-muted mb-4">Add a verified phone number to receive SMS notifications.</p>

          {phoneVerified ? (
            /* Verified state */
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-sm text-foreground font-medium">{user.phone_number}</span>
                <span className="ml-2 text-xs text-green-400 font-medium">✓ Verified</span>
              </div>
              <button
                type="button"
                onClick={handleRemovePhone}
                disabled={phoneSaving}
                className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
              >
                {phoneSaving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ) : phoneStep === 'awaiting_code' ? (
            /* Code sent — show verify step */
            <div className="space-y-3">
              <p className="text-xs text-muted">
                A 6-digit code was sent to <span className="text-foreground font-medium">{phoneInput}</span>.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground tracking-widest focus:outline-none focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={phoneSaving || codeInput.length !== 6}
                  className="bg-brand text-black font-semibold px-4 py-2 text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50 transition-colors"
                >
                  {phoneSaving ? 'Verifying…' : 'Verify'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setPhoneStep('idle'); setPhoneInput(undefined); setCodeInput(''); }}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                ← Use a different number
              </button>
            </div>
          ) : (
            /* Add / change phone */
            <div className="flex gap-2">
              <PhoneNumberInput
                value={phoneInput}
                onChange={setPhoneInput}
                disabled={phoneSaving}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={phoneSaving || !phoneInput || !isValidPhoneNumber(phoneInput)}
                className="bg-brand text-black font-semibold px-4 py-2 text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {phoneSaving ? 'Sending…' : 'Send code'}
              </button>
            </div>
          )}
        </div>

        {/* Notifications — compact triple-column table */}
        <div id="notifications" className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Notifications</h2>

          {/* Verification banners */}
          {!emailVerified && (
            <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2 mb-3 text-xs text-amber-300">
              <span>✉️</span>
              <span>Verify your email to enable email notifications.</span>
            </div>
          )}
          {!phoneVerified && (
            <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2 mb-3 text-xs text-amber-300">
              <span>📱</span>
              <span>
                {user.phone_number
                  ? 'Verify your phone number to enable SMS notifications.'
                  : 'Add and verify your phone number to enable SMS notifications.'}
              </span>
            </div>
          )}

          {!notifSettings ? (
            <div className="py-6 text-center text-sm text-muted">Loading…</div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center mb-2 px-1">
                <span />
                <span className="text-xs text-muted font-medium text-center w-9">Email</span>
                <span className="text-xs text-muted font-medium text-center w-9">SMS</span>
                <span className="text-xs text-muted font-medium text-center w-9">Bell</span>
              </div>
              {NOTIF_ROWS.map(({ label, desc, emailKey, smsKey, inAppKey }) => (
                <div
                  key={emailKey}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-2.5 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted mt-0.5">{desc}</p>
                  </div>
                  <MiniToggle
                    checked={notifSettings[emailKey] as boolean}
                    onChange={(val) => handleNotifToggle(emailKey, val)}
                    saving={notifSaving.has(emailKey)}
                    label={`Email: ${label}`}
                    disabled={!emailVerified}
                  />
                  <MiniToggle
                    checked={notifSettings[smsKey] as boolean}
                    onChange={(val) => handleNotifToggle(smsKey, val)}
                    saving={notifSaving.has(smsKey)}
                    label={`SMS: ${label}`}
                    disabled={!phoneVerified}
                  />
                  <MiniToggle
                    checked={notifSettings[inAppKey] as boolean}
                    onChange={(val) => handleNotifToggle(inAppKey, val)}
                    saving={notifSaving.has(inAppKey)}
                    label={`In-app: ${label}`}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Change Password link — only for verified users */}
        {emailVerified && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground text-sm">Password</p>
              <p className="text-xs text-muted mt-0.5">Update your login password.</p>
            </div>
            <Link
              href="/settings/password"
              className="shrink-0 bg-surface-2 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-brand/50 transition-colors"
            >
              Change password →
            </Link>
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-surface border border-red-900/40 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">Danger Zone</h2>

          {/* BROKE button */}
          <div className="flex items-start justify-between gap-6 py-4 border-b border-border">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                💸 CLICK THIS BUTTON IF YOU&apos;RE BROKE!!
              </p>
              <p className="text-sm text-muted mt-0.5">
                DO NOT GIVE AWAY CASH YOU DON&apos;T HAVE. Instantly cancels ALL your active pledges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setDangerMsg(''); setShowBrokeConfirm(true); }}
              className="shrink-0 bg-red-900/30 border border-red-700/50 text-red-400 text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-900/50 transition-colors"
            >
              I&apos;m Broke
            </button>
          </div>

          {/* Delete account */}
          <div className="flex items-start justify-between gap-6 py-4">
            <div className="flex-1">
              <p className="font-medium text-foreground">Delete My Account</p>
              <p className="text-sm text-muted mt-0.5">
                Permanently deletes your account and cancels all pledges. Your email can be reused to sign up again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setDangerMsg(''); setShowDeleteConfirm(true); }}
              className="shrink-0 bg-red-900/30 border border-red-700/50 text-red-400 text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-900/50 transition-colors"
            >
              Delete Account
            </button>
          </div>

          {dangerMsg && (
            <p className="mt-2 text-sm text-red-300">{dangerMsg}</p>
          )}
        </div>

      </div>
    </>
  );
}
