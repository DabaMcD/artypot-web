'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const ADMIN_SECTIONS = [
  {
    title: 'Summon Claims',
    description: 'Review and approve creator identity claims.',
    href: '/admin/claims',
    color: 'border-creator/30 hover:border-creator/60',
    badge: 'creator',
  },
  {
    title: 'Pot Completions',
    description: 'Approve or reject submitted work before payout.',
    href: '/admin/completions',
    color: 'border-brand/30 hover:border-brand/60',
    badge: 'brand',
  },
  {
    title: 'Billing Runs',
    description: 'Monitor and trigger monthly billing cycles.',
    href: '/admin/billing',
    color: 'border-council/30 hover:border-council/60',
    badge: 'council',
  },
  {
    title: 'Council Members',
    description: 'Manage admin access and council permissions.',
    href: '/admin/council',
    color: 'border-council/30 hover:border-council/60',
    badge: 'council',
  },
  {
    title: 'Featured Pots',
    description: 'Choose the 3 pots shown on the landing page.',
    href: '/admin/featured-pots',
    color: 'border-brand/30 hover:border-brand/60',
    badge: 'brand',
  },
  {
    title: 'Users',
    description: 'Search and inspect user accounts.',
    href: '/admin/users',
    color: 'border-brand/30 hover:border-brand/60',
    badge: 'brand',
  },
  {
    title: 'Summons',
    description: 'Browse summon profiles with claimed and W-9 status.',
    href: '/admin/summons',
    color: 'border-creator/30 hover:border-creator/60',
    badge: 'creator',
  },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'council') return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-council/10 border border-council/30 text-council text-xs font-medium px-3 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-council" />
          The Council
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Admin Panel</h1>
        <p className="text-muted">Manage the Artypot platform.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {ADMIN_SECTIONS.map(({ title, description, href, color }) => (
          <Link
            key={href}
            href={href}
            className={`block bg-surface border rounded-xl p-6 transition-colors ${color}`}
          >
            <h2 className="font-semibold text-foreground mb-1">{title}</h2>
            <p className="text-sm text-muted">{description}</p>
          </Link>
        ))}
      </div>

    </div>
  );
}
