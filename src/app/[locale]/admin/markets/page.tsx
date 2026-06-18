'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type {
  MarketPolicyData,
  MarketCountryRow,
  MarketVolumeRow,
  MarketConflictRow,
} from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';
import { Empty } from '@/components/ui/Empty';
import { Input, Textarea, Select, FieldLabel } from '@/components/ui/Input';

type MarketStatus = 'open' | 'closed';
/** Select value for an override: '' = follow default. */
type OverrideValue = '' | MarketStatus;

/** Render one independent location signal (flag + code + open/closed) in the conflict queue. */
function renderConflictSignal(sig: MarketConflictRow['card']) {
  if (!sig) return <span className="text-muted/40">—</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="font-mono text-foreground mr-2">{countryFlag(sig.country)} {sig.country}</span>
      <Badge tone={sig.fan_open ? 'good' : 'bad'}>{sig.fan_open ? 'open' : 'closed'}</Badge>
    </span>
  );
}

function countryFlag(code: string) {
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  } catch {
    return '';
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/** Override badge, or muted "default (open|closed)" when following the policy default. */
function StatusCell({ override, effective }: { override: MarketStatus | null; effective: MarketStatus }) {
  if (override) {
    return <Badge tone={override === 'open' ? 'good' : 'bad'}>{override}</Badge>;
  }
  return <span className="font-mono text-[10px] text-muted/70">default ({effective})</span>;
}

// ── Policy confirm modal (the Phase 2 launch switch) ─────────────────────────

function PolicyConfirmModal({
  pending,
  onClose,
  onDone,
}: {
  pending: { fan_default?: MarketStatus; creator_default?: MarketStatus };
  onClose: () => void;
  onDone: (policy: MarketPolicyData) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await adminApi.updateMarketPolicy(pending);
      toast('Market policy updated.', 'success');
      onDone(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to update policy.', 'error');
      setLoading(false);
    }
  };

  return (
    <Modal
      title="change market defaults?"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Saving…' : 'Yes, flip the switch'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Banner tone="warn">
          This is the Phase 2 launch switch. Changing a default flips every country
          without an explicit override — instantly, platform-wide.
        </Banner>
        <ul className="text-sm text-foreground space-y-1">
          {pending.fan_default && (
            <li>
              Fan default → <Badge tone={pending.fan_default === 'open' ? 'good' : 'bad'}>{pending.fan_default}</Badge>
              <span className="text-muted"> ({pending.fan_default === 'open' ? 'deny-list mode' : 'allow-list mode'})</span>
            </li>
          )}
          {pending.creator_default && (
            <li>
              Creator default → <Badge tone={pending.creator_default === 'open' ? 'good' : 'bad'}>{pending.creator_default}</Badge>
            </li>
          )}
        </ul>
      </div>
    </Modal>
  );
}

// ── Country edit modal (overrides + dossier) ─────────────────────────────────

function CountryModal({
  code,
  existing,
  onClose,
  onDone,
}: {
  code: string;
  existing: MarketCountryRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [fanStatus, setFanStatus] = useState<OverrideValue>(existing?.fan_status ?? '');
  const [creatorStatus, setCreatorStatus] = useState<OverrideValue>(existing?.creator_status ?? '');
  const [watchNotes, setWatchNotes] = useState(existing?.watch_notes ?? '');
  const [legalNotes, setLegalNotes] = useState(existing?.legal_basis_notes ?? '');
  const [activationNotes, setActivationNotes] = useState(existing?.activation_notes ?? '');
  const [creatorNotes, setCreatorNotes] = useState(existing?.creator_notes ?? '');
  const [loading, setLoading] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const handleSave = async () => {
    // Send only changed fields (the API supports partial updates) so two admins
    // editing the same country can't silently clobber each other's dossier.
    const body: Parameters<typeof adminApi.upsertMarketCountry>[1] = {};
    const fanValue = fanStatus === '' ? null : fanStatus;
    const creatorValue = creatorStatus === '' ? null : creatorStatus;
    if (fanValue !== (existing?.fan_status ?? null)) body.fan_status = fanValue;
    if (creatorValue !== (existing?.creator_status ?? null)) body.creator_status = creatorValue;
    if ((watchNotes.trim() || null) !== (existing?.watch_notes ?? null)) body.watch_notes = watchNotes.trim() || null;
    if ((legalNotes.trim() || null) !== (existing?.legal_basis_notes ?? null)) body.legal_basis_notes = legalNotes.trim() || null;
    if ((activationNotes.trim() || null) !== (existing?.activation_notes ?? null)) body.activation_notes = activationNotes.trim() || null;
    if ((creatorNotes.trim() || null) !== (existing?.creator_notes ?? null)) body.creator_notes = creatorNotes.trim() || null;

    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await adminApi.upsertMarketCountry(code, body);
      toast(`${code} saved.`, 'success');
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to save country.', 'error');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setLoading(true);
    try {
      await adminApi.deleteMarketCountry(code);
      toast(`${code} removed — follows defaults again.`, 'success');
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to delete country.', 'error');
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`${countryFlag(code)} ${code}${existing?.name ? ` · ${existing.name}` : ''}`}
      onClose={onClose}
      lg
      actions={
        <>
          {existing && (
            <Button variant="danger" onClick={handleDelete} disabled={loading} className="mr-auto">
              {deleteArmed ? 'Really delete?' : 'Delete'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>fan market</FieldLabel>
            <Select value={fanStatus} onChange={(e) => setFanStatus(e.target.value as OverrideValue)}>
              <option value="">Follow default</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
          <div>
            <FieldLabel>creator market</FieldLabel>
            <Select value={creatorStatus} onChange={(e) => setCreatorStatus(e.target.value as OverrideValue)}>
              <option value="">Follow default</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
        </div>

        <div>
          <FieldLabel>what to watch</FieldLabel>
          <Textarea value={watchNotes} onChange={(e) => setWatchNotes(e.target.value)} rows={3}
            placeholder="e.g. VAT registration threshold, pending regulation…" />
        </div>
        <div>
          <FieldLabel>our legal position</FieldLabel>
          <Textarea value={legalNotes} onChange={(e) => setLegalNotes(e.target.value)} rows={3}
            placeholder="e.g. below threshold per VAT memo §4…" />
        </div>
        <div>
          <FieldLabel>steps to activate</FieldLabel>
          <Textarea value={activationNotes} onChange={(e) => setActivationNotes(e.target.value)} rows={3}
            placeholder="e.g. register for GST, then flip fan_status to open…" />
        </div>
        <div>
          <FieldLabel>creator-side (phase 3)</FieldLabel>
          <Textarea value={creatorNotes} onChange={(e) => setCreatorNotes(e.target.value)} rows={3}
            placeholder="e.g. Stripe Connect supported; withholding treaty in place…" />
        </div>

        {deleteArmed && (
          <Banner tone="bad">
            Deleting removes the override <em>and</em> the dossier notes — {code} will follow the
            platform defaults. Click &ldquo;Really delete?&rdquo; to confirm.
          </Banner>
        )}
      </div>
    </Modal>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type Tab = 'rules' | 'volume' | 'conflicts';

export default function AdminMarketsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('rules');

  // Rules state
  const [policy, setPolicy] = useState<MarketPolicyData | null>(null);
  const [countries, setCountries] = useState<MarketCountryRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [fanDefault, setFanDefault] = useState<MarketStatus>('closed');
  const [creatorDefault, setCreatorDefault] = useState<MarketStatus>('closed');
  const [pendingPolicy, setPendingPolicy] = useState<{ fan_default?: MarketStatus; creator_default?: MarketStatus } | null>(null);

  // Country modal state
  const [editing, setEditing] = useState<{ code: string; existing: MarketCountryRow | null } | null>(null);
  const [newCode, setNewCode] = useState('');

  // Volume state
  const [volumeRows, setVolumeRows] = useState<MarketVolumeRow[]>([]);
  const [volumeLoading, setVolumeLoading] = useState(true);

  // Conflicts state
  const [conflictRows, setConflictRows] = useState<MarketConflictRow[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState(true);

  // ── Guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await adminApi.getMarkets();
      setPolicy(res.data.policy);
      setCountries(res.data.countries);
      setFanDefault(res.data.policy.fan_default);
      setCreatorDefault(res.data.policy.creator_default);
    } catch {
      // silent
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') fetchRules();
  }, [user, fetchRules]);

  useEffect(() => {
    if (user?.role !== 'council' || tab !== 'volume') return;
    setVolumeLoading(true);
    adminApi.marketVolume()
      .then((res) => setVolumeRows(res.data))
      .catch(() => setVolumeRows([]))
      .finally(() => setVolumeLoading(false));
  }, [tab, user]);

  useEffect(() => {
    if (user?.role !== 'council' || tab !== 'conflicts') return;
    setConflictsLoading(true);
    adminApi.marketConflicts()
      .then((res) => setConflictRows(res.data))
      .catch(() => setConflictRows([]))
      .finally(() => setConflictsLoading(false));
  }, [tab, user]);

  if (authLoading || !user || user.role !== 'council') return null;

  const policyDirty = policy != null && (fanDefault !== policy.fan_default || creatorDefault !== policy.creator_default);

  const handlePolicySave = () => {
    if (!policy) return;
    const pending: { fan_default?: MarketStatus; creator_default?: MarketStatus } = {};
    if (fanDefault !== policy.fan_default) pending.fan_default = fanDefault;
    if (creatorDefault !== policy.creator_default) pending.creator_default = creatorDefault;
    setPendingPolicy(pending);
  };

  const handleAddCountry = () => {
    const code = newCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return;
    const existing = countries.find((c) => c.country_code === code) ?? null;
    setEditing({ code, existing });
  };

  return (
    <>
      {pendingPolicy && policy && (
        <PolicyConfirmModal
          pending={pendingPolicy}
          onClose={() => setPendingPolicy(null)}
          onDone={() => {
            setPendingPolicy(null);
            fetchRules();
          }}
        />
      )}

      {editing && (
        <CountryModal
          code={editing.code}
          existing={editing.existing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            setNewCode('');
            fetchRules();
          }}
        />
      )}

      <div className="space-y-6 pt-2 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">markets</h1>
            <p className="text-sm text-muted mt-1">
              {tab === 'rules'
                ? `${countries.length} ${countries.length === 1 ? 'country' : 'countries'} with overrides or dossiers`
                : tab === 'volume'
                  ? 'per-country billed volume'
                  : `${conflictRows.length} location-signal ${conflictRows.length === 1 ? 'conflict' : 'conflicts'}`}
            </p>
          </div>
          <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
          {([
            { label: 'Rules',     value: 'rules' as const },
            { label: 'Volume',    value: 'volume' as const },
            { label: 'Conflicts', value: 'conflicts' as const },
          ]).map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                tab === value
                  ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Rules tab ─────────────────────────────────────────────────── */}
        {tab === 'rules' && (
          rulesLoading ? (
            <Card><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
          ) : (
            <>
              {/* Policy card */}
              <Card>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">platform defaults</div>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <FieldLabel>fan default</FieldLabel>
                    <Select value={fanDefault} onChange={(e) => setFanDefault(e.target.value as MarketStatus)}>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>creator default</FieldLabel>
                    <Select value={creatorDefault} onChange={(e) => setCreatorDefault(e.target.value as MarketStatus)}>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                  <Button variant="primary" size="sm" disabled={!policyDirty} onClick={handlePolicySave}>
                    Save defaults
                  </Button>
                </div>
                <p className="font-mono text-[10px] text-muted mt-3">
                  fan default {policy?.fan_default} = {policy?.fan_default === 'open' ? 'deny-list mode' : 'allow-list mode'}
                  {policy?.updated_at ? ` · last changed ${fmtDate(policy.updated_at)}` : ''}
                </p>
              </Card>

              {/* Countries table */}
              {countries.length === 0 ? (
                <Empty>No country overrides or dossiers yet.</Empty>
              ) : (
                <Card>
                  <div className="overflow-x-auto -mx-5 -my-4">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Code</th>
                          <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Name</th>
                          <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Fan</th>
                          <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Creator</th>
                          <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {countries.map((row) => (
                          <tr
                            key={row.country_code}
                            onClick={() => setEditing({ code: row.country_code, existing: row })}
                            className="hover:bg-surface-2 transition-colors cursor-pointer"
                          >
                            <td className="px-5 py-3 font-mono text-foreground">{countryFlag(row.country_code)} {row.country_code}</td>
                            <td className="px-4 py-3 text-foreground">{row.name}</td>
                            <td className="px-4 py-3"><StatusCell override={row.fan_status} effective={row.fan_effective} /></td>
                            <td className="px-4 py-3"><StatusCell override={row.creator_status} effective={row.creator_effective} /></td>
                            <td className="px-5 py-3 font-mono text-[11px] text-muted">{fmtDate(row.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Add country */}
              <div className="flex items-end gap-3">
                <div>
                  <FieldLabel>add country</FieldLabel>
                  <Input
                    mono
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCountry(); }}
                    placeholder="e.g. FR"
                    className="w-24"
                    maxLength={2}
                  />
                </div>
                <Button variant="default" size="sm" disabled={newCode.length !== 2} onClick={handleAddCountry}>
                  Add →
                </Button>
              </div>

              <div className="space-y-1">
                <p className="font-mono text-[10px] text-muted/70">
                  Dossier notes are working research, not legal advice — confirm against the VAT memo before opening a market.
                </p>
                <p className="font-mono text-[10px] text-muted/70">
                  OFAC-sanctioned countries remain blocked by the sanctions layer regardless of these settings.
                </p>
              </div>
            </>
          )
        )}

        {/* ── Volume tab ────────────────────────────────────────────────── */}
        {tab === 'volume' && (
          <>
            {volumeLoading ? (
              <Card><div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
            ) : volumeRows.length === 0 ? (
              <Empty>No billed volume yet.</Empty>
            ) : (
              <Card>
                <div className="overflow-x-auto -mx-5 -my-4">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Country</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Fan market</th>
                        <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Fans</th>
                        <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">With card</th>
                        <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Active backing</th>
                        <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Settled 12mo</th>
                        <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Settled lifetime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {volumeRows.map((row) => (
                        <tr key={row.country_code ?? 'undeclared'} className="hover:bg-surface-2 transition-colors">
                          <td className="px-5 py-3 text-foreground">
                            {row.country_code ? `${countryFlag(row.country_code)} ${row.name ?? row.country_code}` : <span className="text-muted italic">Undeclared</span>}
                          </td>
                          <td className="px-4 py-3">
                            {row.fan_effective
                              ? <Badge tone={row.fan_effective === 'open' ? 'good' : 'bad'}>{row.fan_effective}</Badge>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-foreground">{row.fans_total.toLocaleString('en-US')}</td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-foreground">{row.fans_with_card.toLocaleString('en-US')}</td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-foreground">{fmtMoney(row.active_backing_total)}</td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-foreground">{fmtMoney(row.settled_12mo)}</td>
                          <td className="px-5 py-3 text-right font-mono text-[11px] text-foreground">{fmtMoney(row.settled_lifetime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            <p className="font-mono text-[10px] text-muted/70">
              Per-country billed volume for VAT registration-threshold monitoring
              (AU A$75k · NZ NZ$60k · CA C$30k · SG S$100k+S$1M global · NO NOK 50k · JP ¥10M —
              amounts here are USD; convert before comparing).
            </p>
          </>
        )}

        {/* ── Conflicts tab ─────────────────────────────────────────────── */}
        {tab === 'conflicts' && (
          <>
            {conflictsLoading ? (
              <Card><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
            ) : conflictRows.length === 0 ? (
              <Empty>No location-signal conflicts.</Empty>
            ) : (
              <Card>
                <div className="overflow-x-auto -mx-5 -my-4">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">User</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Card</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Billing</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">IP</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Declared</th>
                        <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Waiting on</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {conflictRows.map((row) => (
                        <tr key={row.user_id} className="hover:bg-surface-2 transition-colors">
                          <td className="px-5 py-3">
                            <span className="text-foreground">{row.display_name}</span>{' '}
                            <span className="text-muted/70 font-mono text-[10px]">{row.email}</span>
                          </td>
                          <td className="px-4 py-3">{renderConflictSignal(row.card)}</td>
                          <td className="px-4 py-3">{renderConflictSignal(row.billing)}</td>
                          <td className="px-4 py-3">{renderConflictSignal(row.ip)}</td>
                          <td className="px-4 py-3">{renderConflictSignal(row.declared)}</td>
                          <td className="px-5 py-3 font-mono text-[11px] text-muted">
                            {row.waiting_on ? `${countryFlag(row.waiting_on)} ${row.waiting_on}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            <p className="font-mono text-[10px] text-muted/70">
              Fans whose independent location signals disagree across an open/closed market boundary —
              frozen pending review. Resolve by setting the fan&apos;s country (admin override).
            </p>
          </>
        )}
      </div>
    </>
  );
}
