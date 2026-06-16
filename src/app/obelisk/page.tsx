'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const NAV_ITEMS = [
  {
    href: '/obelisk/council',
    icon: '⚖️',
    title: 'Council',
    desc: 'Grant or revoke Council permissions by email address.',
  },
  {
    href: '/obelisk/logs',
    icon: '📜',
    title: 'Logs',
    desc: 'Browse, filter, and prune application log entries.',
  },
  {
    href: '/obelisk/email-logs',
    icon: '✉️',
    title: 'Email Log',
    desc: 'Every outbound email — recipient, address, and subject.',
  },
  {
    href: '/obelisk/metrics',
    icon: '📊',
    title: 'Metrics',
    desc: 'Platform-wide stats on users, bounties, and backings.',
  },
  {
    href: '/obelisk/treasury',
    icon: '💰',
    title: 'Treasury',
    desc: 'The Float — Stripe balance vs. ledger, and who the money belongs to.',
  },
  {
    href: '/obelisk/system',
    icon: '⚙️',
    title: 'System',
    desc: 'Scheduled tasks, queue depth, and failed jobs.',
  },
  {
    href: '/obelisk/integrity',
    icon: '🧮',
    title: 'Data Integrity',
    desc: 'Reconciliation sweeps — ledger drift, orphaned rows, stuck states.',
  },
] as const;

export default function OverlordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
  }, [user, authLoading, router]);

  if (authLoading || (!user?.is_overlord && !authLoading)) {
    return null; // redirect in useEffect
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">👁️</span>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome to your Obelisk, overlord</h1>
        </div>
        <p className="text-sm text-muted">
          Choose a control surface below.
        </p>
      </div>

      {/* Navigation menu */}
      <div className="space-y-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 bg-surface border border-border rounded-xl p-5 transition-colors hover:border-[#8A2BE2]/60"
          >
            <span className="text-2xl shrink-0">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <h2
                className="text-base font-semibold text-foreground transition-colors group-hover:text-[#8A2BE2]"
              >
                {item.title}
              </h2>
              <p className="text-sm text-muted">{item.desc}</p>
            </div>
            <span className="shrink-0 text-muted transition-colors group-hover:text-[#8A2BE2]">→</span>
          </Link>
        ))}
      </div>

    </div>
  );
}
