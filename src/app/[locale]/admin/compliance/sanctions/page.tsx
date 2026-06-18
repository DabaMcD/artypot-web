'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { ComplianceSanction, ComplianceSanctionEntity } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import { Select, FieldLabel } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Banner } from '@/components/ui/Banner';

type Tab = 'pending' | 'all';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function countryFlag(code: string) {
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  } catch {
    return '';
  }
}

const SEVERITY_TONES: Record<ComplianceSanction['severity'], 'bad' | 'warn' | 'info'> = {
  comprehensive_block: 'bad',
  sectoral:            'warn',
  list_based:          'warn',
  advisory:            'info',
};

const SEVERITY_LABELS: Record<ComplianceSanction['severity'], string> = {
  comprehensive_block: 'Comprehensive Block',
  sectoral:            'Sectoral',
  list_based:          'List-Based',
  advisory:            'Advisory',
};

const STATUS_TONES: Record<ComplianceSanction['status'], 'warn' | 'bad' | 'default'> = {
  pending_review: 'warn',
  active:         'bad',
  rejected:       'default',
  superseded:     'default',
};

// ── Detail modal ─────────────────────────────────────────────────────────────

function SanctionDetailModal({
  sanction,
  onClose,
}: {
  sanction: ComplianceSanction;
  onClose: () => void;
}) {
  const [entities, setEntities] = useState<ComplianceSanctionEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.complianceSanctionEntities(sanction.id)
      .then((r) => setEntities(r.entities))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sanction.id]);

  return (
    <Modal title={sanction.program_name} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={STATUS_TONES[sanction.status]}>{sanction.status}</Badge>
          <Badge tone={SEVERITY_TONES[sanction.severity]}>{SEVERITY_LABELS[sanction.severity]}</Badge>
          <Badge tone="default">{sanction.applies_to}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-0.5">Country</div>
            <div>{sanction.country ? `${countryFlag(sanction.country_code)} ${sanction.country.name_common}` : sanction.country_code}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-0.5">Effective date</div>
            <div>{fmt(sanction.effective_date)}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-0.5">Sunset date</div>
            <div>{fmt(sanction.sunset_date)}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-0.5">Verified</div>
            <div>{fmt(sanction.verified_at)}</div>
          </div>
          {sanction.source_url && (
            <div className="col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-0.5">Source</div>
              <a href={sanction.source_url} target="_blank" rel="noopener noreferrer" className="text-info underline break-all text-xs">{sanction.source_url}</a>
            </div>
          )}
        </div>

        {sanction.notes && (
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">Notes</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{sanction.notes}</p>
          </Card>
        )}

        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">Entities ({loading ? '…' : entities.length})</div>
          {loading ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />)}
            </div>
          ) : entities.length === 0 ? (
            <p className="text-sm text-muted">No specific entities — applies broadly.</p>
          ) : (
            <div className="divide-y divide-border border border-border rounded">
              {entities.map((e) => (
                <div key={e.id} className="px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-foreground">{e.entity_name}</span>
                    <Badge tone="default">{e.entity_type}</Badge>
                    <span className="font-mono text-[10px] text-muted ml-auto">≥{e.match_strength_required}%</span>
                  </div>
                  {e.entity_aliases.length > 0 && (
                    <p className="text-xs text-muted">aka: {e.entity_aliases.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  sanction,
  onClose,
  onDone,
}: {
  sanction: ComplianceSanction;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await adminApi.rejectSanction(sanction.id, notes || undefined);
      toast('Sanction rejected.', 'error');
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to reject sanction.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Reject: ${sanction.program_name}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Rejecting…' : 'Reject sanction'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Banner tone="warn">This will mark the sanction as rejected and it will not be enforced.</Banner>
        <div>
          <FieldLabel>Rejection notes <span className="text-muted/50 font-normal normal-case tracking-normal">(optional)</span></FieldLabel>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Reason for rejection…" />
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SanctionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('pending');

  // Pending tab state
  const [pendingRows, setPendingRows] = useState<ComplianceSanction[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLastPage, setPendingLastPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(true);

  // All tab state
  const [allRows, setAllRows] = useState<ComplianceSanction[]>([]);
  const [allPage, setAllPage] = useState(1);
  const [allLastPage, setAllLastPage] = useState(1);
  const [allTotal, setAllTotal] = useState(0);
  const [allLoading, setAllLoading] = useState(true);

  // Filters (all tab)
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [countries, setCountries] = useState<{ code_alpha2: string; name_common: string }[]>([]);

  // Modals
  const [detailSanction, setDetailSanction] = useState<ComplianceSanction | null>(null);
  const [rejectSanction, setRejectSanction] = useState<ComplianceSanction | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchPending = useCallback(async (page: number) => {
    setPendingLoading(true);
    try {
      const res = await adminApi.compliancePendingSanctions(page);
      setPendingRows(res.data);
      setPendingPage(res.current_page);
      setPendingLastPage(res.last_page);
      setPendingTotal(res.total);
    } catch { /* silent */ } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async (page: number, status: string, country: string, severity: string, actOnly: boolean) => {
    setAllLoading(true);
    try {
      const res = await adminApi.complianceSanctions({
        page,
        status: status || undefined,
        country_code: country || undefined,
        severity: severity || undefined,
        active_only: actOnly || undefined,
      });
      setAllRows(res.data);
      setAllPage(res.current_page);
      setAllLastPage(res.last_page);
      setAllTotal(res.total);
    } catch { /* silent */ } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchPending(1);
      adminApi.complianceCountries().then((r) => setCountries(r.data)).catch(() => {});
    }
  }, [user, fetchPending]);

  useEffect(() => {
    if (user?.role === 'council' && tab === 'all') {
      fetchAll(1, filterStatus, filterCountry, filterSeverity, activeOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user, filterStatus, filterCountry, filterSeverity, activeOnly, fetchAll]);

  const handleApprove = async (sanction: ComplianceSanction) => {
    setApprovingId(sanction.id);
    try {
      const res = await adminApi.approveSanction(sanction.id);
      const alerted = res.alerts_sent ?? 0;
      toast(
        alerted > 0
          ? `Sanction approved. ${alerted} admin alert${alerted === 1 ? '' : 's'} queued for affected creator${alerted === 1 ? '' : 's'}.`
          : 'Sanction approved. No existing creators matched.',
        'success',
      );
      fetchPending(pendingPage);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to approve.', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  if (authLoading || !user || user.role !== 'council') return null;

  const SEVERITY_PILLS = [
    { label: 'All', value: '' },
    { label: 'Comprehensive Block', value: 'comprehensive_block' },
    { label: 'Sectoral', value: 'sectoral' },
    { label: 'List-Based', value: 'list_based' },
    { label: 'Advisory', value: 'advisory' },
  ];

  const STATUS_PILLS = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending_review' },
    { label: 'Active', value: 'active' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Superseded', value: 'superseded' },
  ];

  return (
    <>
      {detailSanction && (
        <SanctionDetailModal sanction={detailSanction} onClose={() => setDetailSanction(null)} />
      )}
      {rejectSanction && (
        <RejectModal
          sanction={rejectSanction}
          onClose={() => setRejectSanction(null)}
          onDone={() => { setRejectSanction(null); fetchPending(pendingPage); }}
        />
      )}

      <div className="space-y-6 pt-2 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin · compliance</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">sanctions</h1>
            <p className="text-sm text-muted mt-1">
              {tab === 'pending' ? `${pendingTotal} pending review` : `${allTotal} total`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/compliance/sanctions/new">
              <Button variant="primary" size="sm">+ Propose new</Button>
            </Link>
            <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
          {([{ label: 'Pending Review', value: 'pending' as const }, { label: 'All Records', value: 'all' as const }]).map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                tab === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Pending tab ── */}
        {tab === 'pending' && (
          <>
            {pendingLoading ? (
              <Card><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
            ) : pendingRows.length === 0 ? (
              <Empty>No sanctions pending review.</Empty>
            ) : (
              <Card>
                <div className="divide-y divide-border -mx-5 -my-4">
                  {pendingRows.map((row) => (
                    <div key={row.id} className="flex items-start gap-3 px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setDetailSanction(row)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium text-foreground">{row.program_name}</span>
                          <Badge tone={SEVERITY_TONES[row.severity]}>{SEVERITY_LABELS[row.severity]}</Badge>
                          <Badge tone="default">{row.applies_to}</Badge>
                        </div>
                        <p className="text-sm text-muted">
                          {row.country ? `${countryFlag(row.country_code)} ${row.country.name_common}` : row.country_code}
                          {' · '}effective {fmt(row.effective_date)}
                        </p>
                        {row.notes && <p className="font-mono text-[10px] text-muted/70 mt-0.5 truncate max-w-sm">{row.notes}</p>}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="default"
                          size="sm"
                          disabled={approvingId === row.id}
                          onClick={() => handleApprove(row)}
                          className="border-good/40 text-good hover:bg-good/10"
                        >
                          {approvingId === row.id ? '…' : 'Approve'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectSanction(row)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {pendingLastPage > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="default" size="sm" disabled={pendingPage === 1 || pendingLoading} onClick={() => fetchPending(pendingPage - 1)}>← prev</Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{pendingPage} / {pendingLastPage}</span>
                <Button variant="default" size="sm" disabled={pendingPage === pendingLastPage || pendingLoading} onClick={() => fetchPending(pendingPage + 1)}>next →</Button>
              </div>
            )}
          </>
        )}

        {/* ── All tab ── */}
        {tab === 'all' && (
          <>
            {/* Filters */}
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted mb-1.5">Status</div>
                <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit flex-wrap">
                  {STATUS_PILLS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setFilterStatus(value)}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                        filterStatus === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted mb-1.5">Severity</div>
                <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit flex-wrap">
                  {SEVERITY_PILLS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setFilterSeverity(value)}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                        filterSeverity === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <Select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
                    <option value="">All countries</option>
                    {countries.map((c) => (
                      <option key={c.code_alpha2} value={c.code_alpha2}>{c.name_common}</option>
                    ))}
                  </Select>
                </div>
                <Toggle on={activeOnly} onChange={setActiveOnly} label="Active only" className="text-sm text-muted" />
              </div>
            </div>

            {allLoading ? (
              <Card><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
            ) : allRows.length === 0 ? (
              <Empty>No sanctions match these filters.</Empty>
            ) : (
              <Card>
                <div className="overflow-x-auto -mx-5 -my-4">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Program</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Country</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Severity</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Status</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Effective</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Sunset</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allRows.map((row) => (
                        <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                          <td className="px-5 py-3">
                            <span className="text-foreground font-medium truncate block max-w-[200px]">{row.program_name}</span>
                            <span className="text-xs text-muted">{row.applies_to}</span>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {row.country ? `${countryFlag(row.country_code)} ${row.country.name_common}` : row.country_code}
                          </td>
                          <td className="px-4 py-3"><Badge tone={SEVERITY_TONES[row.severity]}>{SEVERITY_LABELS[row.severity]}</Badge></td>
                          <td className="px-4 py-3"><Badge tone={STATUS_TONES[row.status]}>{row.status}</Badge></td>
                          <td className="px-4 py-3 text-muted font-mono text-[11px]">{fmt(row.effective_date)}</td>
                          <td className="px-4 py-3 text-muted font-mono text-[11px]">{fmt(row.sunset_date)}</td>
                          <td className="px-5 py-3">
                            <Button variant="ghost" size="sm" onClick={() => setDetailSanction(row)}>view</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {allLastPage > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="default" size="sm" disabled={allPage === 1 || allLoading} onClick={() => fetchAll(allPage - 1, filterStatus, filterCountry, filterSeverity, activeOnly)}>← prev</Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{allPage} / {allLastPage}</span>
                <Button variant="default" size="sm" disabled={allPage === allLastPage || allLoading} onClick={() => fetchAll(allPage + 1, filterStatus, filterCountry, filterSeverity, activeOnly)}>next →</Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
