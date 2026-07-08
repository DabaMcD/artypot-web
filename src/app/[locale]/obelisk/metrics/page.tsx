'use client';

import { formatUsd as fmt$, formatCount as fmtN } from '@/lib/format';

import { useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { metrics as metricsApi, type RefundMetricSegment } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

type MetricsData = {
  total_bounties:              number;
  avg_bounty_amount:           number;
  stddev_bounty_amount:        number;
  total_backed_amount:        number;
  total_hard_backings:          number;
  avg_hard_backing_amount:      number;
  total_soft_backings:          number;
  avg_soft_backing_amount:      number;
  total_users:                 number;
  total_creators:              number;
  total_paid_by_fans:          number;
  total_paid_out_to_creators:  number;
  total_unpaid_to_creators:    number;
  total_comments:              number;
  reply_percentage:            number;
  refunds: {
    overall:  RefundMetricSegment;
    admin:    RefundMetricSegment;
    creator:  RefundMetricSegment;
    pending_count:        number;
    failed_count:         number;
    mtd_count:            number;
    mtd_refunded_to_fans: number;
    refund_rate_pct:      number;
  };
};

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Tint the value red — used to draw the eye to non-zero failure counts. */
  alert?: boolean;
}

function StatCard({ label, value, sub, alert }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold">{label}</p>
      <p className={`text-2xl font-display font-bold ${alert ? 'text-red-400' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

/**
 * Side-by-side admin vs creator vs total breakdown. Refunds split cleanly by
 * who initiated them, and the money columns mean different things per source
 * (admin claws back net, creator claws back gross), so a comparison grid is far
 * more legible than a wall of flat stat cards.
 */
function RefundCompareTable({
  admin, creator, overall,
}: {
  admin:   RefundMetricSegment;
  creator: RefundMetricSegment;
  overall: RefundMetricSegment;
}) {
  const rows: { label: string; sub: string; pick: (s: RefundMetricSegment) => string }[] = [
    { label: 'Refunds',           sub: 'succeeded',              pick: (s) => fmtN(s.count) },
    { label: 'Refunded to fans',  sub: 'gross returned',         pick: (s) => fmt$(s.refunded_to_fans) },
    { label: 'Clawed back',       sub: 'debited from creators',  pick: (s) => fmt$(s.clawed_back) },
    { label: 'Platform absorbed', sub: 'fees not clawed back',   pick: (s) => fmt$(s.platform_absorbed) },
  ];

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] text-xs">
        {/* Header row */}
        <div className="px-4 py-2.5 bg-surface-2 font-semibold uppercase tracking-wider text-muted">Metric</div>
        <div className="px-4 py-2.5 bg-surface-2 font-semibold uppercase tracking-wider text-muted text-right">Admin</div>
        <div className="px-4 py-2.5 bg-surface-2 font-semibold uppercase tracking-wider text-muted text-right">Creator</div>
        <div className="px-4 py-2.5 bg-surface-2 font-semibold uppercase tracking-wider text-right" style={{ color: '#8A2BE2' }}>Total</div>

        {rows.map((r, i) => (
          <div key={r.label} className="contents">
            <div className={`px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <p className="text-foreground font-medium">{r.label}</p>
              <p className="text-[11px] text-muted">{r.sub}</p>
            </div>
            <div className={`px-4 py-3 text-right tabular-nums text-foreground self-center ${i > 0 ? 'border-t border-border' : ''}`}>{r.pick(admin)}</div>
            <div className={`px-4 py-3 text-right tabular-nums text-foreground self-center ${i > 0 ? 'border-t border-border' : ''}`}>{r.pick(creator)}</div>
            <div className={`px-4 py-3 text-right tabular-nums font-semibold self-center ${i > 0 ? 'border-t border-border' : ''}`} style={{ color: '#8A2BE2' }}>{r.pick(overall)}</div>
          </div>
        ))}
      </div>
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
          <Link href="/obelisk" className="hover:underline text-muted">← Obelisk</Link>
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
              label="Total backed"
              value={fmt$(data.total_backed_amount)}
              sub="across all bounties"
            />
            <StatCard
              label="Average backing"
              value={fmt$(data.avg_bounty_amount)}
              sub={`σ = ${fmt$(data.stddev_bounty_amount)}`}
            />
          </Section>

          <Section title="Backings">
            <StatCard
              label="Hard backings"
              value={fmtN(data.total_hard_backings)}
              sub="backer has a valid card"
            />
            <StatCard
              label="Avg hard backing"
              value={fmt$(data.avg_hard_backing_amount)}
            />
            <StatCard
              label="Soft backings"
              value={fmtN(data.total_soft_backings)}
              sub="no card or frozen market"
            />
            <StatCard
              label="Avg soft backing"
              value={fmt$(data.avg_soft_backing_amount)}
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

          {/* Refunds — headline health stats, then the admin/creator split. */}
          <Section title="Refunds">
            <StatCard
              label="Total refunds"
              value={fmtN(data.refunds.overall.count)}
              sub={`${fmt$(data.refunds.overall.refunded_to_fans)} to fans`}
            />
            <StatCard
              label="Refund rate"
              value={`${data.refunds.refund_rate_pct}%`}
              sub="of fan $ handed back"
            />
            <StatCard
              label="This month"
              value={fmtN(data.refunds.mtd_count)}
              sub={`${fmt$(data.refunds.mtd_refunded_to_fans)} refunded`}
            />
            <StatCard
              label="Platform absorbed"
              value={fmt$(data.refunds.overall.platform_absorbed)}
              sub="fees Artypot ate"
            />
            <StatCard
              label="Pending"
              value={fmtN(data.refunds.pending_count)}
              sub="awaiting Stripe settlement"
              alert={data.refunds.pending_count > 0}
            />
            <StatCard
              label="Failed"
              value={fmtN(data.refunds.failed_count)}
              sub="needs attention"
              alert={data.refunds.failed_count > 0}
            />
          </Section>

          {/* By initiator — admin vs creator comparison. */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8A2BE2' }}>
              Refunds by initiator
            </h2>
            <RefundCompareTable
              admin={data.refunds.admin}
              creator={data.refunds.creator}
              overall={data.refunds.overall}
            />
            <p className="text-[11px] text-muted mt-2 leading-relaxed">
              Admin refunds claw back the creator&apos;s <strong>net</strong> (Artypot returns its platform fee);
              creator refunds claw back the full <strong>gross</strong> (Artypot keeps its fee to cover Stripe&apos;s
              non-refundable cost). The gap is &ldquo;platform absorbed.&rdquo;
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">No data available.</p>
      )}

    </div>
  );
}
