'use client';

import { useEffect } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { SectionLabel } from '@/components/ui/Card';

interface AdminSection {
  label: string;
  icon: string;
  href: string;
  desc: string;
}

/** Mirrors the council sidebar grouping (Sidebar.tsx councilItems). */
const GROUPS: Array<{ title: string; items: AdminSection[] }> = [
  {
    title: 'queues',
    items: [
      { label: 'Completion review',   icon: '✓', href: '/admin/completions',       desc: 'Review submitted bounty completions' },
      { label: 'Handle verification', icon: '@', href: '/admin/handles',           desc: 'Verify creator handle claims' },
      { label: 'Compliance',          icon: '⚖', href: '/admin/compliance',        desc: 'Sanctions, content rules & tax' },
      { label: 'Reports',             icon: '⚑', href: '/admin/reports',           desc: 'Content policy reports' },
    ],
  },
  {
    title: 'catalog',
    items: [
      { label: 'Users',               icon: '◍', href: '/admin/users',             desc: 'Browse and manage accounts' },
      { label: 'Creators',            icon: '◐', href: '/admin/creators',          desc: 'Creator roster and status' },
      { label: 'Handle registry',     icon: '⊙', href: '/admin/handle-registry',   desc: 'Investigate handles, claims & rejected claimants' },
      { label: 'Featured bounties',   icon: '★', href: '/admin/featured-bounties', desc: 'Curate the featured shelf' },
    ],
  },
  {
    title: 'operations',
    items: [
      { label: 'Billing runs',        icon: '$', href: '/admin/billing',           desc: 'Charge cycles and invoices' },
      { label: 'Refunds',             icon: '↩', href: '/admin/refunds',           desc: 'Issue and track refunds' },
      { label: 'External payouts',    icon: '↗', href: '/admin/external-payouts',  desc: 'Manual creator payouts' },
      { label: 'Council members',     icon: '◇', href: '/admin/council',           desc: 'Manage council membership' },
      { label: 'Country tiers',       icon: '◉', href: '/admin/tiers',             desc: 'Per-country payout eligibility' },
      { label: 'Markets',             icon: '◎', href: '/admin/markets',           desc: 'Market configuration' },
      { label: 'Audit log',           icon: '◫', href: '/admin/logs',              desc: 'Admin action history' },
    ],
  },
];

export default function AdminHubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Header */}
      <div>
        <SectionLabel>council</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">admin</h1>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Council tools for review queues, the user &amp; creator catalog, and platform operations.
        </p>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title}>
          <SectionLabel className="mb-2">{group.title}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 border border-border rounded-md bg-surface-2 hover:bg-surface px-3 py-2.5 transition-colors"
              >
                <span className="w-7 h-7 flex items-center justify-center text-xl text-muted/60 shrink-0">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted mt-0.5">{item.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
