'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { metrics as metricsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import Link from 'next/link';

type MetricsData = {
  total_bounties:              number;
  avg_bounty_amount:           number;
  stddev_bounty_amount:        number;
  total_pledged_amount:        number;
  total_hard_pledges:          number;
  avg_hard_pledge_amount:      number;
  total_soft_pledges:          number;
  avg_soft_pledge_amount:      number;
  total_users:                 number;
  total_creators:              number;
  total_paid_by_fans:          number;
  total_paid_out_to_creators:  number;
  total_unpaid_to_creators:    number;
  total_comments:              number;
  reply_percentage:            number;
};

function fmt$( n: number ) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtN( n: number ) {
  return new Intl.NumberFormat('en-US').format(n);
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8A2BE2' }}>
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData]       = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }

    metricsApi.get()
      .then((res) => setData(res.data))
      .catch(() => toast('Failed to load metrics.', 'error'))
      .finally(() => setLoading(false));
  }, [user, authLoading, router, toast]);

  if (authLoading || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(3)].map((__, j) => (
              <div key={j} className="h-20 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-display font-bold text-foreground">Sitewide Metrics</h1>
        </div>
        <p className="text-sm text-muted">
          Live aggregate stats across all users and bounties.
          {' · '}
          <Link href="/obelisk" className="hover:underline text-muted">← Overlord</Link>
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(3)].map((__, j) => (
                <div key={j} className="h-20 bg-surface border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          <Section title="Bounties">
            <StatCard
              label="Total bounties"
              value={fmtN(data.total_bounties)}
            />
            <StatCard
              label="Total pledged"
              value={fmt$(data.total_pledged_amount)}
              sub="across all bounties"
            />
            <StatCard
              label="Average pledge"
              value={fmt$(data.avg_bounty_amount)}
              sub={`σ = ${fmt$(data.stddev_bounty_amount)}`}
            />
          </Section>

          <Section title="Pledges">
            <StatCard
              label="Hard pledges"
              value={fmtN(data.total_hard_pledges)}
              sub="no expiry date"
            />
            <StatCard
              label="Avg hard pledge"
              value={fmt$(data.avg_hard_pledge_amount)}
            />
            <StatCard
              label="Soft pledges"
              value={fmtN(data.total_soft_pledges)}
              sub="expire in the future"
            />
            <StatCard
              label="Avg soft pledge"
              value={fmt$(data.avg_soft_pledge_amount)}
            />
          </Section>

          <Section title="People">
            <StatCard
              label="Total users"
              value={fmtN(data.total_users)}
            />
            <StatCard
              label="Total creators"
              value={fmtN(data.total_creators)}
              sub="enabled creator status"
            />
          </Section>

          <Section title="Comments">
            <StatCard
              label="Total comments"
              value={fmtN(data.total_comments)}
            />
            <StatCard
              label="Replies"
              value={`${data.reply_percentage}%`}
              sub="of all comments are replies"
            />
          </Section>

          <Section title="Money">
            <StatCard
              label="Paid by fans"
              value={fmt$(data.total_paid_by_fans)}
              sub="all-time settled payments"
            />
            <StatCard
              label="Paid out to creators"
              value={fmt$(data.total_paid_out_to_creators)}
              sub="all-time withdrawals"
            />
            <StatCard
              label="Unpaid to creators"
              value={fmt$(data.total_unpaid_to_creators)}
              sub="pending or ready to pay out"
            />
          </Section>
        </>
      ) : (
        <p className="text-sm text-muted">No data available.</p>
      )}

    </div>
  );
}
