'use client';

import { useState } from 'react';
import { auth } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

interface Props {
  email: string;
}

export default function EmailVerificationBanner({ email }: Props) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
          We sent a verification link to <span className="font-mono">{email}</span>. Some features may be limited until you verify.
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
