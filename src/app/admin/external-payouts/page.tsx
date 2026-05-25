'use client';

import { useCallback, useEffect, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type {
  ExternalPayout,
  ExternalPayoutMethod,
  CreatorSearchResult,
} from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea, FieldLabel, FieldHint } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

const METHODS: ExternalPayoutMethod[] = ['wise', 'paypal', 'wire', 'check', 'other'];

const METHOD_TONE: Record<ExternalPayoutMethod, 'info' | 'good' | 'creator' | 'default'> = {
  wise:   'creator', // teal-ish
  paypal: 'info',
  wire:   'good',    // purple-ish in our palette? closest distinct
  check:  'default',
  other:  'default',
};

function fmtMoney(n: number): string {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MethodBadge({ method }: { method: ExternalPayoutMethod }) {
  return <Badge tone={METHOD_TONE[method]}>{method}</Badge>;
}

// ── Creator autocomplete ─────────────────────────────────────────────────────

interface CreatorAutocompleteProps {
  value: CreatorSearchResult | null;
  onChange: (c: CreatorSearchResult | null) => void;
}

function CreatorAutocomplete({ value, onChange }: CreatorAutocompleteProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await adminApi.externalPayouts.searchCreators(q);
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 border border-border rounded bg-background">
        <div className="min-w-0">
          <div className="text-sm text-foreground truncate">{value.display_name}</div>
          <div className="font-mono text-[10px] text-muted truncate">
            #{value.id} · available {fmtMoney(value.available_balance)}
            {value.country_code ? ` · ${value.country_code}` : ''}
          </div>
        </div>
        <Button variant="ghost" size="xs" type="button" onClick={() => { onChange(null); setQ(''); }}>
          change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search creator by name or email…"
      />
      {open && q.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded shadow-soft max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 font-mono text-[10px] text-muted">searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 font-mono text-[10px] text-muted">no matches</div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onChange(r); setOpen(false); setQ(''); }}
                className="w-full text-left px-3 py-2 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0"
              >
                <div className="text-sm text-foreground">{r.display_name}</div>
                <div className="font-mono text-[10px] text-muted">
                  #{r.id} · {r.email ?? '—'} · available {fmtMoney(r.available_balance)}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Record-new-payout modal ──────────────────────────────────────────────────

function NewPayoutModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [creator, setCreator] = useState<CreatorSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<ExternalPayoutMethod>('wise');
  const [refId, setRefId] = useState('');
  const [sentAt, setSentAt] = useState(today);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = parseFloat(amount);
  const overBalance =
    creator && !isNaN(numericAmount) && numericAmount > creator.available_balance;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!creator) { setError('Select a creator.'); return; }
    if (isNaN(numericAmount) || numericAmount < 0.01) { setError('Amount must be at least $0.01.'); return; }
    if (overBalance) { setError(`Amount exceeds creator's available balance (${fmtMoney(creator.available_balance)}).`); return; }
    if (receipt && receipt.size > 5 * 1024 * 1024) { setError('Receipt must be 5MB or smaller.'); return; }

    const form = new FormData();
    form.append('creator_id', String(creator.id));
    form.append('amount', String(numericAmount));
    form.append('method', method);
    if (refId.trim()) form.append('external_reference_id', refId.trim());
    form.append('sent_at', sentAt);
    if (notes.trim()) form.append('notes', notes.trim());
    if (receipt) form.append('receipt', receipt);

    setSubmitting(true);
    try {
      await adminApi.externalPayouts.create(form);
      toast('External payout recorded.', 'success');
      onCreated();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to record payout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Record external payout" onClose={onClose} lg>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Creator</FieldLabel>
          <CreatorAutocomplete value={creator} onChange={setCreator} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Amount (USD)</FieldLabel>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {creator && (
              <FieldHint>
                Available: <span className={overBalance ? 'text-bad' : 'text-foreground'}>{fmtMoney(creator.available_balance)}</span>
              </FieldHint>
            )}
          </div>
          <div>
            <FieldLabel>Method</FieldLabel>
            <Select value={method} onChange={(e) => setMethod(e.target.value as ExternalPayoutMethod)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>External Reference ID</FieldLabel>
            <Input
              type="text"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div>
            <FieldLabel>Sent At</FieldLabel>
            <Input
              type="date"
              value={sentAt}
              max={today}
              onChange={(e) => setSentAt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional context for future audits"
          />
        </div>

        <div>
          <FieldLabel>Receipt</FieldLabel>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            className="block w-full font-mono text-xs text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-border file:bg-surface-2 file:text-foreground file:font-mono file:text-xs file:cursor-pointer cursor-pointer"
          />
          <FieldHint>PDF / PNG / JPG / WEBP, max 5MB.</FieldHint>
        </div>

        {error && (
          <div className="bg-bad-soft border border-bad text-bad rounded px-3 py-2 text-sm">{error}</div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={submitting || !creator}>
            {submitting ? 'Recording…' : 'Record payout'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Reverse modal ────────────────────────────────────────────────────────────

function ReverseModal({
  payout,
  onClose,
  onReversed,
}: {
  payout: ExternalPayout;
  onClose: () => void;
  onReversed: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) { setError('Reason is required.'); return; }
    setSubmitting(true);
    try {
      await adminApi.externalPayouts.reverse(payout.id, reason.trim());
      toast('External payout reversed.', 'success');
      onReversed();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to reverse payout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Reverse payout #${payout.id}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-foreground">
          Reverse external payout <span className="font-mono">#{payout.id}</span> to{' '}
          <strong>{payout.creator?.display_name ?? `creator #${payout.creator_id}`}</strong> for{' '}
          <strong className="text-creator">{fmtMoney(payout.amount)}</strong>?
        </p>
        <div>
          <FieldLabel>Reason</FieldLabel>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being reversed?"
          />
        </div>
        {error && (
          <div className="bg-bad-soft border border-bad text-bad rounded px-3 py-2 text-sm">{error}</div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="danger" type="submit" disabled={submitting}>
            {submitting ? 'Reversing…' : 'Reverse payout'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ payout, onClose }: { payout: ExternalPayout; onClose: () => void }) {
  return (
    <Modal title={`External payout #${payout.id}`} onClose={onClose} lg>
      <div className="flex flex-wrap gap-2 mb-4">
        <MethodBadge method={payout.method} />
        {payout.reversed_at ? <Badge tone="bad">reversed</Badge> : <Badge tone="good">active</Badge>}
      </div>

      <Card accent className="mb-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Creator</dt>
            <dd className="font-mono text-foreground">
              {payout.creator?.display_name ?? '—'} <span className="text-muted">#{payout.creator_id}</span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Amount</dt>
            <dd className="font-mono tabular-nums text-foreground">{fmtMoney(payout.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Reference</dt>
            <dd className="font-mono text-foreground">{payout.external_reference_id ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Sent</dt>
            <dd className="font-mono text-foreground">{payout.sent_at}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Recorded by</dt>
            <dd className="font-mono text-foreground">{payout.recorded_by?.display_name ?? `#${payout.recorded_by_admin_id}`}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Created</dt>
            <dd className="font-mono text-foreground">{new Date(payout.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </Card>

      {payout.notes && (
        <Card accent className="mb-4">
          <SectionLabel className="mb-2">Notes</SectionLabel>
          <p className="text-sm text-foreground whitespace-pre-wrap">{payout.notes}</p>
        </Card>
      )}

      {payout.reversed_at && (
        <Card className="border-bad/30">
          <SectionLabel className="mb-2">Reversal</SectionLabel>
          <p className="font-mono text-[11px] text-muted">
            by {payout.reversed_by?.display_name ?? `#${payout.reversed_by_admin_id}`} on{' '}
            {new Date(payout.reversed_at).toLocaleString()}
          </p>
          {payout.reversal_reason && (
            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{payout.reversal_reason}</p>
          )}
        </Card>
      )}
    </Modal>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminExternalPayoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [payouts, setPayouts] = useState<ExternalPayout[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [includeReversed, setIncludeReversed] = useState(true);
  const [creatorFilter, setCreatorFilter] = useState<CreatorSearchResult | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<ExternalPayout | null>(null);
  const [reversing, setReversing] = useState<ExternalPayout | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchPayouts = useCallback(async (p: number, creatorId?: number, includeRev?: boolean) => {
    setLoading(true);
    try {
      const res = await adminApi.externalPayouts.list({
        page: p,
        creator_id: creatorId,
        include_reversed: includeRev,
      });
      setPayouts(res.data);
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
      fetchPayouts(1, creatorFilter?.id, includeReversed);
    }
  }, [user, fetchPayouts, creatorFilter, includeReversed]);

  if (authLoading || !user || user.role !== 'council') return null;

  // YTD active (non-reversed) total — visible on the loaded page.
  const ytdYear = new Date().getFullYear();
  const ytdTotal = payouts
    .filter((p) => !p.reversed_at && new Date(p.sent_at).getFullYear() === ytdYear)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <>
      {showNew && (
        <NewPayoutModal
          onClose={() => setShowNew(false)}
          onCreated={() => fetchPayouts(1, creatorFilter?.id, includeReversed)}
        />
      )}
      {detail && <DetailModal payout={detail} onClose={() => setDetail(null)} />}
      {reversing && (
        <ReverseModal
          payout={reversing}
          onClose={() => setReversing(null)}
          onReversed={() => fetchPayouts(page, creatorFilter?.id, includeReversed)}
        />
      )}

      <div className="space-y-6 pt-2 max-w-5xl">
        {/* Header */}
        <div>
          <SectionLabel className="mb-1">council · admin</SectionLabel>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display font-bold text-[28px]">External Payouts</h1>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">
                {total} total · YTD {fmtMoney(ytdTotal)}
              </span>
              <Link href="/admin">
                <Button variant="ghost" size="sm">← Admin</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 min-w-0 w-full sm:max-w-md">
            <FieldLabel>Filter by creator</FieldLabel>
            <CreatorAutocomplete value={creatorFilter} onChange={setCreatorFilter} />
          </div>
          <label className="flex items-center gap-2 mt-1 sm:mt-7 font-mono text-[10px] uppercase tracking-wider text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={includeReversed}
              onChange={(e) => setIncludeReversed(e.target.checked)}
              className="accent-[var(--color-role)]"
            />
            include reversed
          </label>
          <div className="flex-1" />
          <Button variant="primary" onClick={() => setShowNew(true)} className="mt-1 sm:mt-6">
            + Record new payout
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <Card>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-surface-2 animate-pulse rounded" />
              ))}
            </div>
          </Card>
        ) : payouts.length === 0 ? (
          <Empty message="No external payouts." />
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {payouts.map((p) => {
                const reversed = !!p.reversed_at;
                return (
                  <div
                    key={p.id}
                    className="px-5 py-3.5 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground text-sm truncate">
                          {p.creator?.display_name ?? `creator #${p.creator_id}`}
                        </span>
                        <span className="font-mono text-[10px] text-muted">#{p.creator_id}</span>
                        <MethodBadge method={p.method} />
                        {reversed && <Badge tone="bad">reversed</Badge>}
                      </div>
                      <p className="font-mono text-[10px] text-muted truncate">
                        {p.external_reference_id ?? 'no ref'} · sent {p.sent_at} · by{' '}
                        {p.recorded_by?.display_name ?? `#${p.recorded_by_admin_id}`}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className={`font-mono text-sm tabular-nums ${reversed ? 'line-through text-muted' : 'text-foreground'}`}>
                        {fmtMoney(p.amount)}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      <Button variant="ghost" size="xs" onClick={() => setDetail(p)}>View</Button>
                      {!reversed && (
                        <Button variant="ghost" size="xs" onClick={() => setReversing(p)}>Reverse</Button>
                      )}
                    </div>
                  </div>
                );
              })}
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
              onClick={() => fetchPayouts(page - 1, creatorFilter?.id, includeReversed)}
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
              onClick={() => fetchPayouts(page + 1, creatorFilter?.id, includeReversed)}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
