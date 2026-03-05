'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { users as usersApi } from '@/lib/api';
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

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

    // Optimistically update UI
    if (field === 'is_anonymous') setIsAnonymous(value);
    if (field === 'cover_processing_fees') setCoverFees(value);

    try {
      await usersApi.update(user.id, { [field]: value });
      if (refreshUser) await refreshUser();
      setSuccessMsg('Settings saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      // Revert on error
      if (field === 'is_anonymous') setIsAnonymous(!value);
      if (field === 'cover_processing_fees') setCoverFees(!value);
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
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
          description="Automatically add the Stripe processing fee (~2.9% + $0.30) to your pledge so creators receive your full stated amount."
          checked={coverFees}
          onChange={(val) => handleToggle('cover_processing_fees', val)}
          saving={saving}
        />
      </div>

      {/* Billing link */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Billing</h2>
        <p className="text-sm text-muted mb-3">Manage your saved payment methods and view your pledge history.</p>
        <Link
          href="/billing"
          className="inline-block bg-surface-2 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-creator/50 transition-colors"
        >
          Go to Billing →
        </Link>
      </div>

      {/* Status messages */}
      {successMsg && (
        <p className="mt-4 text-sm text-green-400">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="mt-4 text-sm text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
