'use client';

import { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';

interface Props {
  email: string | null;
}

// How often we re-check whether the email got verified (e.g. the user clicked
// the link in another tab/device). Once verified, the parent stops rendering
// this banner — it's gated on !user.email_verified_at — which unmounts the
// component and clears the timer.
const VERIFY_POLL_INTERVAL = 60 * 1000; // 60s

export default function EmailVerificationBanner({ email }: Props) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Poll so the banner clears itself without a manual reload. refreshUser's
  // identity can change across renders, so call it through a ref to keep a
  // single stable 60s interval.
  const refreshRef = useRef(refreshUser);
  refreshRef.current = refreshUser;
  useEffect(() => {
    const id = setInterval(() => { refreshRef.current(); }, VERIFY_POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const handleResend = async () => {
    setSending(true);
    try {
      await auth.resendVerification();
      setSent(true);
      toast('Verification email sent! Check your inbox.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to send verification email.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3.5 mb-6">
      <span className="text-yellow-400 text-lg shrink-0 mt-0.5">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-yellow-300 text-sm font-medium">Please verify your email address</p>
        <p className="text-yellow-500/80 text-xs mt-0.5 leading-relaxed">
          We sent a verification link to <span className="font-mono">{email ?? 'your email address'}</span>. Some features may be limited until you verify.
        </p>
      </div>
      <button
        onClick={handleResend}
        disabled={sending || sent}
        className="shrink-0 text-xs font-semibold text-yellow-400 border border-yellow-700/50 rounded-lg px-3 py-1.5 hover:bg-yellow-900/30 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Resend email'}
      </button>
    </div>
  );
}
