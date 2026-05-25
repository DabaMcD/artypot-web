'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      toast('New passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirm,
      });
      toast('Password changed successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      // Brief delay so the toast is visible before navigating away
      setTimeout(() => router.push('/settings'), 900);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to change password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (!user.email_verified_at) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-muted text-sm mb-4">You need a verified email to change your password.</p>
        <Link href="/settings" className="text-fan hover:underline text-sm">
          ← Back to settings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="mb-6">
        <Link
          href="/settings"
          className="text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4"
        >
          ← Back to settings
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Change Password</h1>
        <p className="text-sm text-muted mt-1">Choose a strong, unique password.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-fan transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-fan transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-fan transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !newPasswordConfirm}
            className="w-full bg-fan text-black font-semibold py-2.5 text-sm rounded-lg hover:bg-fan-dim disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
