'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, SectionLabel } from '@/components/ui/Card';

const ADMIN_SECTIONS = [
  { title: 'completion review',    description: 'approve or reject submitted work before payout.',     href: '/admin/completions' },
  { title: 'handle verification',  description: 'review and approve creator identity claims.',          href: '/admin/claims' },
  { title: 'billing runs',         description: 'monitor and trigger monthly billing cycles.',          href: '/admin/billing' },
  { title: 'council members',      description: 'manage admin access and council permissions.',         href: '/admin/council' },
  { title: 'featured pots',        description: 'choose the 3 pots shown on the landing page.',        href: '/admin/featured-pots' },
  { title: 'users',                description: 'search and inspect user accounts.',                    href: '/admin/users' },
  { title: 'creators',             description: 'browse creator profiles with claimed and W-9 status.', href: '/admin/creators' },
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
    <div className="space-y-7 pt-2">
      <div>
        <SectionLabel>council</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">admin panel</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {ADMIN_SECTIONS.map(({ title, description, href }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-[var(--color-role)] transition-colors cursor-pointer h-full">
              <h2 className="font-display font-bold text-foreground mb-1">{title}</h2>
              <p className="font-display text-sm text-muted">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
