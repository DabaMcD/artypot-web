'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { users as usersApi, auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

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

// ── Main page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Danger zone dialogs
  const [showBrokeConfirm, setShowBrokeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerMsg, setDangerMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    setIsAnonymous(user.is_anonymous ?? false);
    setCoverFees(user.cover_processing_fees ?? false);
  }, [user, authLoading, router]);

  const handleToggle = async (field: 'is_anonymous' | 'cover_processing_fees', value: boolean) => {
    if (!user) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (field === 'is_anonymous') setIsAnonymous(value);
    if (field === 'cover_processing_fees') setCoverFees(value);

    try {
      await usersApi.update(user.id, { [field]: value });
      await refreshUser();
      setSuccessMsg('Settings saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      if (field === 'is_anonymous') setIsAnonymous(!value);
      if (field === 'cover_processing_fees') setCoverFees(!value);
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
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

  return (
    <>
      {/* BROKE confirmation */}
      {showBrokeConfirm && (
        <ConfirmDialog
          title="Cancel All Pledges"
          body={
            <>
              <p className="mb-2">This will immediately cancel <strong className="text-foreground">all your active pledges</strong> and remove your funding from every project.</p>
              <p>This cannot easily be undone. You would need to re-pledge individually to each project.</p>
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

        {/* Privacy */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">Privacy</h2>
          <Toggle
            id="anonymous-mode"
            label="Anonymous Mode"
            description="Hide your pledges from your public profile. Your name will appear as [anonymous] on project backer lists."
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
                DO NOT GIVE AWAY CASH YOU DON&apos;T HAVE. Instantly cancels all your active pledges.
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

        {/* Status messages */}
        {successMsg && <p className="mt-4 text-sm text-green-400">{successMsg}</p>}
        {errorMsg && <p className="mt-4 text-sm text-red-400">{errorMsg}</p>}
      </div>
    </>
  );
}
