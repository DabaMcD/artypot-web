'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toExternalUrl } from '@/lib/url';
import { platformLabel, formatPlatformHandle } from '@/lib/platforms';
import type {
  HandleRegistryRow,
  HandleDossier,
  HandleDossierClaim,
  HandleStatus,
  HandleClaimStatus,
  HandleVerificationMethod,
} from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

type StatusFilter = HandleStatus | 'all';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'all',        value: 'all' },
  { label: 'verified',   value: 'verified' },
  { label: 'unverified', value: 'unverified' },
  { label: 'disputed',   value: 'disputed' },
  { label: 'retired',    value: 'retired' },
];

const HANDLE_STATUS_TONES: Record<HandleStatus, 'good' | 'warn' | 'bad' | 'default'> = {
  verified:   'good',
  unverified: 'default',
  disputed:   'bad',
  retired:    'default',
};

const CLAIM_STATUS_TONES: Record<HandleClaimStatus, 'good' | 'warn' | 'bad' | 'default'> = {
  verified:   'good',
  unverified: 'warn',
  rejected:   'bad',
  abandoned:  'default',
};

const METHOD_LABELS: Record<HandleVerificationMethod, string> = {
  oauth:       'OAuth',
  manual_post: 'manual post',
  manual_dm:   'manual DM',
  admin:       'admin',
};

function fmtDate(s: string | null): string {
  return s ? new Date(s).toLocaleDateString() : '—';
}
function fmtDateTime(s: string | null): string {
  return s ? new Date(s).toLocaleString() : '—';
}
function money(n: number): string {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// ── How a verified handle was approved ───────────────────────────────────────
function VerificationLine({ verification }: { verification: HandleDossier['verification'] }) {
  if (!verification) {
    return <p className="text-sm text-muted">No verified owner — this handle is unclaimed.</p>;
  }
  const method = verification.method ? METHOD_LABELS[verification.method] ?? verification.method : 'unknown method';
  const review = verification.review;
  return (
    <div className="rounded border border-good/40 bg-good/10 px-3 py-2 space-y-1">
      <div className="font-mono text-[10px] uppercase tracking-widest text-good">✓ verified · {method}</div>
      <p className="text-sm text-foreground">
        Owned by{' '}
        <span className="text-creator">{verification.owner?.display_name ?? 'unknown'}</span>
        {verification.owner?.email && <span className="text-muted"> · {verification.owner.email}</span>}
        {' '}· verified {fmtDate(verification.verified_at)}
      </p>
      {review ? (
        <p className="text-xs text-muted">
          Approved by{' '}
          <span className="text-foreground">{review.reviewer?.display_name ?? 'unknown admin'}</span>
          {' '}on {fmtDate(review.reviewed_at)}
          {review.decision_notes && <> — &quot;{review.decision_notes}&quot;</>}
        </p>
      ) : (
        <p className="text-xs text-muted">Self-verified via OAuth — no admin review.</p>
      )}
      {review?.contact_message && (
        <p className="text-xs text-muted/80 italic">submission: &quot;{review.contact_message}&quot;</p>
      )}
    </div>
  );
}

// ── A single claim in the roster ─────────────────────────────────────────────
function ClaimRow({ claim }: { claim: HandleDossierClaim }) {
  const method = claim.verification_method ? METHOD_LABELS[claim.verification_method] ?? claim.verification_method : null;
  return (
    <div className="px-5 py-3 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={CLAIM_STATUS_TONES[claim.status]}>{claim.status}</Badge>
        <span className="text-sm text-foreground">
          {claim.user?.display_name ?? 'deleted user'}
        </span>
        {claim.user?.email && (
          <Link href={`/admin/users?q=${encodeURIComponent(claim.user.email)}`} className="font-mono text-[10px] text-fan hover:underline">
            {claim.user.email}
          </Link>
        )}
        {claim.user?.country_code && (
          <span className="font-mono text-[10px] text-muted">{claim.user.country_code}</span>
        )}
        {method && <span className="font-mono text-[10px] text-muted/70">{method}</span>}
      </div>

      {/* The forensic line: a rejected claim shows when it lost and to whom. */}
      {claim.status === 'rejected' && (
        <p className="font-mono text-[10px] text-bad">
          ✕ rejected {fmtDate(claim.rejected_at ?? claim.updated_at)}
          {claim.rejected_in_favor_of?.user && (
            <> · lost to <span className="text-creator">{claim.rejected_in_favor_of.user.display_name}</span></>
          )}
        </p>
      )}
      {claim.status === 'verified' && (
        <p className="font-mono text-[10px] text-good">✓ verified {fmtDate(claim.verified_at)}</p>
      )}
      <p className="font-mono text-[10px] text-muted/70">claimed {fmtDate(claim.created_at)}</p>

      {/* Admin-review submission history for this claim, if any. */}
      {claim.applications.length > 0 && (
        <div className="mt-1 border-l-2 border-border pl-2 space-y-0.5">
          {claim.applications.map((a) => (
            <p key={a.id} className="font-mono text-[10px] text-muted">
              <span className="uppercase tracking-wider">{a.status}</span>
              {a.reviewer && <> · by {a.reviewer.display_name}</>}
              {a.reviewed_at && <> · {fmtDate(a.reviewed_at)}</>}
              {a.decision_notes && <> — &quot;{a.decision_notes}&quot;</>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dossier modal ────────────────────────────────────────────────────────────
function DossierModal({ row, onClose }: { row: HandleRegistryRow; onClose: () => void }) {
  const [dossier, setDossier] = useState<HandleDossier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.getHandleDossier(row.id);
        if (active) setDossier(res.data);
      } catch {
        if (active) setDossier(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [row.id]);

  // Title comes from the triggering row so it's correct immediately (no flicker)
  // and respects platform formatting (e.g. 'twitch.tv/x', a bare URL for 'other').
  const title = `${formatPlatformHandle(row.platform, row.username)} · ${platformLabel(row.platform)}`;

  return (
    <Modal title={title} onClose={onClose} lg actions={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {loading || !dossier ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-surface-2 animate-pulse rounded" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status + provenance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={HANDLE_STATUS_TONES[dossier.handle.status]}>{dossier.handle.status}</Badge>
              <Badge tone="default">{platformLabel(dossier.handle.platform)}</Badge>
              {dossier.handle.profile_url && (
                <a
                  href={toExternalUrl(dossier.handle.profile_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-fan hover:underline"
                >
                  profile ↗
                </a>
              )}
            </div>
            <VerificationLine verification={dossier.verification} />
          </div>

          {/* Claim tallies */}
          <div className="flex items-center gap-2 flex-wrap">
            <SectionLabel>claim roster</SectionLabel>
            <span className="font-mono text-[10px] text-muted">
              {dossier.claim_summary.total} total · {dossier.claim_summary.verified} verified ·{' '}
              <span className={dossier.claim_summary.rejected > 0 ? 'text-bad' : ''}>
                {dossier.claim_summary.rejected} rejected
              </span>{' '}
              · {dossier.claim_summary.unverified} pending
            </span>
          </div>

          {/* The roster itself — every user who ever claimed this handle */}
          {dossier.claims.length === 0 ? (
            <Empty message="No claims on this handle" />
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="divide-y divide-border">
                {dossier.claims.map((c) => <ClaimRow key={c.id} claim={c} />)}
              </div>
            </Card>
          )}

          {/* Aliases */}
          {dossier.aliases.length > 0 && (
            <div className="space-y-1">
              <SectionLabel>aliases</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {dossier.aliases.map((a) => (
                  <span key={a.id} title={`${a.source} · ${fmtDate(a.created_at)}`}>
                    <Badge tone="default">{a.alias}</Badge>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Linked bounties — the pot riding on this handle */}
          {dossier.bounties.total > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SectionLabel>bounty pot</SectionLabel>
                <span className="font-mono text-[10px] text-muted">
                  {dossier.bounties.total} {dossier.bounties.total === 1 ? 'bounty' : 'bounties'} ·{' '}
                  <span className="text-fan">{money(dossier.bounties.pot_total)}</span> committed
                </span>
              </div>
              <div className="space-y-0.5">
                {dossier.bounties.items.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/bounties/${b.id}`} className="text-foreground hover:underline truncate">
                      {b.title}
                    </Link>
                    <span className="font-mono text-[10px] text-muted shrink-0">{b.status}</span>
                    <span className="font-mono text-[10px] text-fan shrink-0 ml-auto">{money(Number(b.total_backed))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata footer */}
          <p className="font-mono text-[10px] text-muted/60">
            handle #{dossier.handle.id}
            {dossier.handle.external_id && <> · external id {dossier.handle.external_id}</>}
            {' '}· created {fmtDateTime(dossier.handle.created_at)}
          </p>
        </div>
      )}
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminHandleRegistryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [contested, setContested] = useState(false);

  const [rows, setRows] = useState<HandleRegistryRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<HandleRegistryRow | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchRegistry = useCallback(
    async (params: { q: string; status: StatusFilter; contested: boolean; page: number }) => {
      setLoading(true);
      try {
        const res = await adminApi.listHandleRegistry({
          q: params.q || undefined,
          status: params.status,
          contested: params.contested || undefined,
          page: params.page,
        });
        setRows(res.data);
        setCurrentPage(res.current_page);
        setLastPage(res.last_page);
        setTotal(res.total);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Refetch on filter/search change (resets to page 1).
  useEffect(() => {
    if (user?.role === 'council') {
      fetchRegistry({ q: debouncedQ, status: statusFilter, contested, page: 1 });
      setCurrentPage(1);
    }
  }, [debouncedQ, statusFilter, contested, user, fetchRegistry]);

  if (authLoading || !user || user.role !== 'council') return null;

  const goToPage = (p: number) => {
    fetchRegistry({ q: debouncedQ, status: statusFilter, contested, page: p });
    setCurrentPage(p);
  };

  return (
    <>
      {selectedRow !== null && (
        <DossierModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}

      <div className="space-y-6 pt-2 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">handle registry</h1>
            <p className="text-sm text-muted mt-1">
              {total} {total === 1 ? 'handle' : 'handles'} · investigate claims, ownership &amp; rejected claimants
            </p>
          </div>
          <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
        </div>

        {/* Search */}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by @username or platform…"
        />

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
            {STATUS_TABS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                  statusFilter === value
                    ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setContested((v) => !v)}
            className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded border transition-colors cursor-pointer ${
              contested
                ? 'bg-bad/10 border-bad/40 text-bad'
                : 'bg-surface border-border text-muted hover:text-foreground'
            }`}
            title="Only handles that have at least one rejected claim"
          >
            ⚑ contested only
          </button>
        </div>

        {/* List */}
        {loading ? (
          <Card>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : rows.length === 0 ? (
          <Empty message="No handles found" />
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {rows.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelectedRow(h)}
                  className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm text-foreground">{formatPlatformHandle(h.platform, h.username)}</span>
                      <Badge tone="default">{platformLabel(h.platform)}</Badge>
                      <Badge tone={HANDLE_STATUS_TONES[h.status]}>{h.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-muted flex-wrap">
                      {h.owner ? (
                        <span className="text-creator">owned by {h.owner.display_name}</span>
                      ) : (
                        <span>unclaimed</span>
                      )}
                      <span>{h.claim_summary.total} {h.claim_summary.total === 1 ? 'claim' : 'claims'}</span>
                      {h.claim_summary.rejected > 0 && (
                        <span className="text-bad">⚑ {h.claim_summary.rejected} rejected</span>
                      )}
                      {h.claim_summary.unverified > 0 && (
                        <span className="text-warn">{h.claim_summary.unverified} pending</span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted/60 self-center">view →</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between">
            <Button variant="default" size="sm" disabled={currentPage === 1 || loading} onClick={() => goToPage(currentPage - 1)}>
              ← prev
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {currentPage} / {lastPage}
            </span>
            <Button variant="default" size="sm" disabled={currentPage === lastPage || loading} onClick={() => goToPage(currentPage + 1)}>
              next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
