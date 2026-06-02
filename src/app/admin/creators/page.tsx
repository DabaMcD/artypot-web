'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AdminCreator, AdminCreatorDetail, CreatorW9Status, CreatorW8BENStatus } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

// ── Helpers ──────────────────────────────────────────────────────────────────

function W9Badge({ status }: { status: CreatorW9Status | null }) {
  if (!status) return <span className="font-mono text-[10px] uppercase tracking-widest text-muted">no W-9</span>;
  const tones: Record<CreatorW9Status, 'warn' | 'info' | 'good' | 'bad'> = {
    initiated:   'warn',
    completed:   'info',
    tin_matched: 'good',
    tin_failed:  'bad',
  };
  const labels: Record<CreatorW9Status, string> = {
    initiated:   'W-9 started',
    completed:   'W-9 done',
    tin_matched: 'TIN ✓',
    tin_failed:  'TIN failed',
  };
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

function W8BENBadge({ status }: { status: CreatorW8BENStatus | null }) {
  if (!status) return <span className="font-mono text-[10px] uppercase tracking-widest text-muted">no W-8BEN</span>;
  const tones: Record<CreatorW8BENStatus, 'warn' | 'good' | 'bad'> = {
    initiated: 'warn',
    completed: 'good',
    invalid:   'bad',
  };
  const labels: Record<CreatorW8BENStatus, string> = {
    initiated: 'W-8BEN started',
    completed: 'W-8BEN ✓',
    invalid:   'W-8BEN invalid',
  };
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

function PayoutCategoryBadge({ category }: { category: 1 | 2 | 3 | null }) {
  if (category === null) return null;
  const tones = { 1: 'good', 2: 'warn', 3: 'bad' } as const;
  const labels = { 1: 'Cat 1 · Stripe', 2: 'Cat 2 · Manual', 3: 'Cat 3 · Blocked' } as const;
  return <Badge tone={tones[category]}>{labels[category]}</Badge>;
}

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMoney(amount: number | null | undefined) {
  return `$${Number(amount ?? 0).toFixed(2)}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm min-h-[1.5rem]">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="font-mono tabular-nums text-foreground text-right break-all">{children}</dd>
    </div>
  );
}

// ── Creator detail modal ──────────────────────────────────────────────────────

type CreatorDetail = AdminCreatorDetail;

function CreatorModal({ creator, onClose }: { creator: CreatorDetail; onClose: () => void }) {
  const platformIcon: Record<string, string> = {
    youtube:   'YT',
    twitch:    'TW',
    twitter:   'X',
    instagram: 'IG',
    tiktok:    'TK',
    spotify:   'SP',
    other:     '↗',
  };

  return (
    <Modal title={creator.display_name} onClose={onClose} lg>
      {/* Avatar + email */}
      <div className="flex items-center gap-3 mb-3">
        {creator.profile_picture ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={creator.profile_picture}
            alt=""
            className="w-14 h-14 rounded-full object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-creator/20 flex items-center justify-center text-creator font-mono text-base font-bold shrink-0 border border-border">
            {creator.display_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{creator.email}</p>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        <W9Badge status={creator.w9_status} />
        <W8BENBadge status={creator.w8ben_status ?? null} />
        <PayoutCategoryBadge category={creator.payout_category ?? null} />
        {creator.payout_hold && <Badge tone="bad">payout hold</Badge>}
        {creator.stripe_connect_account_id && <Badge tone="info">Stripe Connect</Badge>}
      </div>

      {/* ── Identity ── */}
      <SectionLabel className="mb-2">Identity</SectionLabel>
      <Card accent className="mb-4">
        <dl className="space-y-2">
          <Row label="Creator ID">#{creator.id}</Row>
          <Row label="Slug">{creator.slug ?? '—'}</Row>
          <Row label="Email">{creator.email}</Row>
          <Row label="Email verified">{creator.email_verified_at ? fmt(creator.email_verified_at) : <span className="text-bad">unverified</span>}</Row>
          <Row label="Phone">{creator.phone_number ?? '—'}</Row>
          <Row label="Phone verified">{creator.phone_verified_at ? fmt(creator.phone_verified_at) : <span className="text-muted">unverified</span>}</Row>
          <Row label="Country">{creator.country_code ?? '—'}</Row>
          <Row label="State">{creator.state_code ?? '—'}</Row>
          <Row label="Joined">{fmt(creator.created_at)}</Row>
          <Row label="Last active">{creator.last_active_at ? fmt(creator.last_active_at) : '—'}</Row>
          {creator.bio && (
            <div className="pt-1">
              <p className="text-[11px] text-muted mb-0.5">Bio</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{creator.bio}</p>
            </div>
          )}
        </dl>
      </Card>

      {/* ── Creator Status ── */}
      <SectionLabel className="mb-2">Creator Status</SectionLabel>
      <Card accent className="mb-4">
        <dl className="space-y-2">
          <Row label="Creator enabled">{fmt(creator.creator_enabled_at)}</Row>
          <Row label="TOS accepted">{creator.creator_tos_accepted_at ? fmt(creator.creator_tos_accepted_at) : <span className="text-bad">not accepted</span>}</Row>
          <Row label="Tax form status">{creator.tax_form_status ?? '—'}</Row>
          <Row label="Stripe Connect">{creator.stripe_connect_account_id ?? <span className="text-muted">none</span>}</Row>
          <Row label="Payout category">
            {creator.payout_category !== null && creator.payout_category !== undefined ? (
              `Category ${creator.payout_category}`
            ) : '—'}
          </Row>
          {creator.payout_hold && (
            <>
              <Row label="Payout hold"><span className="text-bad">Yes</span></Row>
              {Array.isArray(creator.payout_hold_reason) && creator.payout_hold_reason.length > 0 && (
                <Row label="Hold reason">{creator.payout_hold_reason.join(', ')}</Row>
              )}
            </>
          )}
        </dl>
      </Card>

      {/* ── Wallet ── */}
      {creator.wallet && (
        <>
          <SectionLabel className="mb-2">Wallet</SectionLabel>
          <Card accent className="mb-4">
            <dl className="space-y-2">
              <Row label="Available balance">{fmtMoney(creator.wallet.available_balance)}</Row>
              <Row label="Clearing balance">{fmtMoney(creator.wallet.clearing_balance)}</Row>
              <Row label="Open backing total">{fmtMoney(creator.wallet.open_backing_total)}</Row>
              <Row label="Total paid out">{fmtMoney(creator.wallet.total_paid_out)}</Row>
              <Row label="Lifetime earned">{fmtMoney(creator.wallet.amount_earned)}</Row>
            </dl>
          </Card>
        </>
      )}

      {/* ── Handles ── */}
      <SectionLabel className="mb-2">
        Handles
        <span className="ml-2 font-mono text-[10px] text-muted normal-case">{creator.handle_claims?.length ?? 0} claim{(creator.handle_claims?.length ?? 0) !== 1 ? 's' : ''}</span>
      </SectionLabel>
      {!creator.handle_claims || creator.handle_claims.length === 0 ? (
        <Empty message="No handle claims." className="mb-4" />
      ) : (
        <div className="space-y-2 mb-4">
          {creator.handle_claims.map((claim) => (
            <Card key={claim.id} accent>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] uppercase text-muted bg-surface-2 px-1.5 py-0.5 rounded shrink-0">
                    {platformIcon[claim.handle?.platform ?? 'other'] ?? '↗'}
                  </span>
                  <div className="min-w-0">
                    {claim.handle?.profile_url ? (
                      <a
                        href={claim.handle.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm text-foreground hover:text-creator transition-colors truncate block"
                      >
                        @{claim.handle?.username}
                      </a>
                    ) : (
                      <p className="font-medium text-sm text-foreground truncate">@{claim.handle?.username}</p>
                    )}
                    <p className="font-mono text-[10px] text-muted capitalize">{claim.handle?.platform}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={claim.status === 'verified' ? 'good' : claim.status === 'unverified' ? 'warn' : 'default'}>
                    {claim.status}
                  </Badge>
                  {claim.verified_at && (
                    <p className="font-mono text-[9px] text-muted mt-0.5">{fmt(claim.verified_at)}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Recent Bounties ── */}
      <SectionLabel className="mb-2">Recent Bounties</SectionLabel>
      {!creator.recent_bounties || creator.recent_bounties.length === 0 ? (
        <Empty message="No bounties." className="mb-4" />
      ) : (
        <div className="space-y-2 mb-4">
          {creator.recent_bounties.map((b) => {
            const statusTone: Record<string, 'good' | 'warn' | 'info' | 'default' | 'bad'> = {
              open:      'good',
              pending:   'warn',
              completed: 'info',
              paid_out:  'info',
              revoked:   'bad',
            };
            return (
              <Card key={b.id} accent>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/bounties/${b.id}`}
                      target="_blank"
                      className="font-medium text-sm text-foreground hover:text-creator transition-colors truncate block"
                    >
                      {b.title}
                    </Link>
                    <p className="font-mono text-[10px] text-muted">{fmt(b.created_at)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={statusTone[b.status] ?? 'default'}>{b.status.replace('_', ' ')}</Badge>
                    <p className="font-mono text-[10px] text-muted mt-0.5">{fmtMoney(b.total_backed)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Stripe Withdrawals ── */}
      <SectionLabel className="mb-2">
        Stripe Withdrawals
        <span className="ml-2 font-mono text-[10px] text-muted normal-case">{creator.withdrawals?.length ?? 0} recent</span>
      </SectionLabel>
      {!creator.withdrawals || creator.withdrawals.length === 0 ? (
        <Empty message="No Stripe withdrawals." className="mb-4" />
      ) : (
        <div className="space-y-2 mb-4">
          {creator.withdrawals.map((w) => {
            const wTone: Record<string, 'good' | 'warn' | 'bad' | 'default'> = {
              completed: 'good',
              pending:   'warn',
              initiated: 'warn',
              failed:    'bad',
            };
            return (
              <Card key={w.id} accent>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono tabular-nums text-sm text-foreground">{fmtMoney(w.amount)}</p>
                    <p className="font-mono text-[10px] text-muted">{fmt(w.created_at)}</p>
                    {w.failure_reason && (
                      <p className="font-mono text-[10px] text-bad mt-0.5">{w.failure_reason}</p>
                    )}
                  </div>
                  <Badge tone={wTone[w.status] ?? 'default'}>{w.status}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── External Payouts ── */}
      <SectionLabel className="mb-2">
        External Payouts
        <span className="ml-2 font-mono text-[10px] text-muted normal-case">{creator.external_payouts?.length ?? 0} recent</span>
      </SectionLabel>
      {!creator.external_payouts || creator.external_payouts.length === 0 ? (
        <Empty message="No external payouts." className="mb-4" />
      ) : (
        <div className="space-y-2 mb-4">
          {creator.external_payouts.map((ep) => (
            <Card key={ep.id} accent>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono tabular-nums text-sm text-foreground">
                    {fmtMoney(ep.amount)}
                    {ep.reversed_at && <span className="ml-2 text-bad text-[10px]">reversed</span>}
                  </p>
                  <p className="font-mono text-[10px] text-muted capitalize">
                    {ep.method} · {fmt(ep.sent_at)}
                  </p>
                  {ep.notes && (
                    <p className="font-mono text-[10px] text-muted truncate">{ep.notes}</p>
                  )}
                </div>
                <Badge tone={ep.reversed_at ? 'bad' : 'good'}>{ep.reversed_at ? 'reversed' : 'sent'}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Tax Compliance ── */}
      <SectionLabel className="mb-2">Tax Compliance</SectionLabel>

      {/* W-9 history */}
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1.5">W-9 Records</p>
      {!creator.w9_records || creator.w9_records.length === 0 ? (
        <Empty message="No W-9 records." className="mb-3" />
      ) : (
        <div className="space-y-2 mb-3">
          {creator.w9_records.map((w) => (
            <Card key={w.id} accent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono tabular-nums text-sm text-foreground">{w.tax_year}</p>
                  {w.completed_at && (
                    <p className="font-mono text-[10px] text-muted">Completed {fmt(w.completed_at)}</p>
                  )}
                  {w.tin_matched_at && (
                    <p className="font-mono text-[10px] text-muted">TIN matched {fmt(w.tin_matched_at)}</p>
                  )}
                </div>
                <W9Badge status={w.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* W-8BEN history */}
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1.5">W-8BEN Records</p>
      {!creator.w8ben_records || creator.w8ben_records.length === 0 ? (
        <Empty message="No W-8BEN records." className="mb-4" />
      ) : (
        <div className="space-y-2 mb-4">
          {creator.w8ben_records.map((w) => (
            <Card key={w.id} accent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono tabular-nums text-sm text-foreground">{w.tax_year}</p>
                  {w.completed_at && (
                    <p className="font-mono text-[10px] text-muted">Completed {fmt(w.completed_at)}</p>
                  )}
                </div>
                <W8BENBadge status={w.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Profile link ── */}
      <div className="mt-2 pt-4 border-t border-border">
        <Link
          href={creator.slug ? `/${creator.slug}` : `/creators/${creator.id}`}
          target="_blank"
          className="font-mono text-[10px] uppercase tracking-widest text-creator hover:underline"
        >
          View creator profile →
        </Link>
      </div>
    </Modal>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type ClaimedFilter = 'all' | 'true' | 'false';

export default function AdminCreatorsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch]           = useState('');
  const [verifiedFilter, setClaimedFilter] = useState<ClaimedFilter>('all');
  const [creators, setCreators]       = useState<AdminCreator[]>([]);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<AdminCreatorDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchCreators = useCallback(async (q: string, verified: ClaimedFilter, p: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listCreators({
        q: q || undefined,
        verified: verified !== 'all' ? verified : 'all',
        page: p,
      });
      setCreators(res.data);
      setPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchCreators('', 'all', 1);
    }
  }, [user, fetchCreators]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchCreators(val, verifiedFilter, 1);
    }, 350);
  };

  const handleClaimedChange = (f: ClaimedFilter) => {
    setClaimedFilter(f);
    setPage(1);
    fetchCreators(search, f, 1);
  };

  const openDetail = async (s: AdminCreator) => {
    setLoadingDetail(true);
    try {
      const res = await adminApi.getCreator(s.id);
      setSelected(res.data);
    } catch {
      // silent — keep modal closed on error
    } finally {
      setLoadingDetail(false);
    }
  };

  if (authLoading || !user || user.role !== 'council') return null;

  const CLAIMED_TABS: { label: string; value: ClaimedFilter }[] = [
    { label: 'All',        value: 'all' },
    { label: 'Verified',   value: 'true' },
    { label: 'Unverified', value: 'false' },
  ];

  return (
    <>
      {selected && <CreatorModal creator={selected} onClose={() => setSelected(null)} />}

      <div className="space-y-6 pt-2 max-w-3xl">
        {/* Header */}
        <div>
          <SectionLabel className="mb-1">council · admin</SectionLabel>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display font-bold text-[28px]">Creators</h1>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">{total} total</span>
              <Link href="/admin">
                <Button variant="ghost" size="sm">← Admin</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name…"
            className="flex-1"
          />
          <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
            {CLAIMED_TABS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleClaimedChange(value)}
                className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  verifiedFilter === value
                    ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />
              ))}
            </div>
          </Card>
        ) : creators.length === 0 ? (
          <Empty message="No creators found." />
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {creators.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openDetail(s)}
                  disabled={loadingDetail}
                  className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-surface-2 transition-colors disabled:opacity-60"
                >
                  {/* Avatar — photo if set, otherwise role-tinted initial fallback */}
                  {s.profile_picture ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={s.profile_picture}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-creator/20 flex items-center justify-center text-creator font-mono text-xs font-bold shrink-0">
                      {s.display_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm truncate">{s.display_name}</span>
                      <W9Badge status={s.w9_status} />
                    </div>
                    {s.user && (
                      <p className="font-mono text-[10px] text-muted truncate">{s.user.display_name} · {s.user.email}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="font-mono tabular-nums text-[10px] text-muted">${Number(s.amount_earned ?? 0).toFixed(0)} earned</p>
                    <p className="font-mono text-[10px] text-muted">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="default"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => { const p = page - 1; fetchCreators(search, verifiedFilter, p); }}
            >
              ← Prev
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">
              Page {page} of {lastPage}
            </span>
            <Button
              variant="default"
              size="sm"
              disabled={page === lastPage || loading}
              onClick={() => { const p = page + 1; fetchCreators(search, verifiedFilter, p); }}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
