'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { AdminUser, UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, FieldLabel } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

// ── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const tones: Record<UserRole, 'default' | 'creator' | 'council'> = {
    fan:     'default',
    creator: 'creator',
    council: 'council',
  };
  return <Badge tone={tones[role]}>{role}</Badge>;
}

// ── User detail modal ─────────────────────────────────────────────────────────

function UserModal({
  user: initialUser,
  onClose,
  onDeleted,
}: {
  user: AdminUser;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const { toast } = useToast();
  const { user: actor } = useAuth();

  // List rows don't include handles; fetch the full record so we can render
  // them. Until it arrives we render the list-row data we already have.
  const [user, setUser] = useState<AdminUser>(initialUser);
  useEffect(() => {
    let cancelled = false;
    adminApi.getUser(initialUser.id)
      .then((res) => { if (!cancelled) setUser(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initialUser.id]);

  // Two-step delete: arming reveals the typed-confirmation block.
  const [armed, setArmed]               = useState(false);
  const [confirmName, setConfirmName]   = useState('');
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  // Per-bounty backing-limit override editing. Seeded from the fetched record.
  const [overrideInput, setOverrideInput] = useState('');
  const [savingLimit, setSavingLimit]     = useState(false);
  useEffect(() => {
    setOverrideInput(user.backing?.limit_override != null ? String(user.backing.limit_override) : '');
  }, [user.backing?.limit_override]);

  // Already soft-deleted? Hide the delete block entirely.
  const alreadyDeleted = !!user.deleted_at;

  // Backend restricts destructive action to the overlord; mirror that here so
  // non-overlord council members don't see a button they can't use. `is_overlord`
  // comes from /me (set by User::isOverlord() on the backend) — single source of truth.
  const isOverlord = !!actor?.is_overlord;

  const nameMatches = confirmName.trim() === (user.display_name ?? '').trim()
    && confirmName.trim().length > 0;

  const handleDelete = async () => {
    if (!nameMatches || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteUser(user.id);
      toast(`Deleted ${user.display_name}.`, 'success');
      onDeleted(user.id);
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setDeleteError(e.message ?? 'Failed to delete user.');
      setDeleting(false);
    }
  };

  const handleSaveBackingLimit = async (clear = false) => {
    if (savingLimit) return;
    const override = clear || overrideInput.trim() === '' ? null : Number(overrideInput);
    if (override !== null && (!Number.isFinite(override) || override < 1)) {
      toast('Enter a dollar amount of at least $1, or clear the override.', 'error');
      return;
    }
    setSavingLimit(true);
    try {
      const res = await adminApi.setBackingLimit(user.id, override);
      setUser((prev) => prev.backing
        ? { ...prev, backing: { ...prev.backing, limit_override: res.data.limit_override, per_bounty_limit: res.data.per_bounty_limit } }
        : prev);
      toast(override === null ? 'Override cleared.' : 'Backing limit updated.', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to update limit.', 'error');
    } finally {
      setSavingLimit(false);
    }
  };

  return (
    <Modal title={user.display_name} onClose={onClose} lg>
      {/* Avatar + email */}
      <div className="flex items-center gap-3 mb-4">
        {user.profile_picture ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.profile_picture}
            alt=""
            className="w-14 h-14 rounded-full object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-fan/20 flex items-center justify-center text-fan font-mono text-base font-bold shrink-0 border border-border">
            {user.display_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{user.email}</p>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        <RoleBadge role={user.role} />
        {/* Council (or fan) user who also owns a creator profile */}
        {user.creator && user.role !== 'creator' && (
          <Badge tone="creator">creator</Badge>
        )}
        {user.deleted_at && (
          <Badge tone="bad">deleted</Badge>
        )}
        {user.broke_cooldown && (
          <Badge tone="warn">
            broke cooldown · until {new Date(user.broke_cooldown.ends_at).toLocaleDateString()}
          </Badge>
        )}
        {!user.email_verified_at && (
          <Badge tone="warn">email unverified</Badge>
        )}
        {user.is_anonymous && (
          <Badge tone="default">anonymous</Badge>
        )}
      </div>

      {/* Stats */}
      <Card accent className="mb-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">User ID</dt>
            <dd className="font-mono tabular-nums text-foreground">#{user.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Joined</dt>
            <dd className="font-mono tabular-nums text-foreground">{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Phone</dt>
            <dd className="font-mono tabular-nums text-foreground">
              {user.phone_number ?? '—'}
              {user.phone_verified_at ? ' ✓' : user.phone_number ? ' (unverified)' : ''}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Per-bounty backing limit — effective ceiling, tier, and admin override */}
      {user.backing && (
        <Card accent className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Backing limit</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={user.backing.is_solid ? 'good' : 'warn'}>{user.backing.is_solid ? 'solid' : 'no card'}</Badge>
              <Badge tone={user.backing.is_proven ? 'good' : 'default'}>{user.backing.is_proven ? 'proven' : 'unproven'}</Badge>
              {user.backing.disputes_count > 0 && (
                <Badge tone="bad">{user.backing.disputes_count} dispute{user.backing.disputes_count === 1 ? '' : 's'}</Badge>
              )}
            </div>
          </div>
          <dl className="space-y-2 text-sm mb-3">
            <div className="flex justify-between">
              <dt className="text-muted">Per-bounty limit</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {user.backing.is_solid && user.backing.per_bounty_limit != null
                  ? `$${user.backing.per_bounty_limit.toLocaleString()}`
                  : `$${(user.backing.no_pm_cap ?? 0).toLocaleString()} no-card cap`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Tier default</dt>
              <dd className="font-mono tabular-nums text-muted">${(user.backing.tier_default ?? 0).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Override</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {user.backing.limit_override != null ? `$${user.backing.limit_override.toLocaleString()}` : '—'}
              </dd>
            </div>
          </dl>
          <FieldLabel>Override per-bounty limit ($)</FieldLabel>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              step="0.01"
              placeholder="tier default"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
              className="flex-1"
            />
            <Button variant="primary" size="sm" onClick={() => handleSaveBackingLimit(false)} disabled={savingLimit}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => handleSaveBackingLimit(true)} disabled={savingLimit || user.backing.limit_override == null}>Clear</Button>
          </div>
        </Card>
      )}

      {/* Fan location verdict + the signals that produced it (the "how") */}
      {user.location && (
        <Card accent className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Fan location</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={user.location.status === 'open' ? 'good' : user.location.status === 'closed' ? 'bad' : user.location.status === 'conflict' ? 'warn' : 'default'}>
                {user.location.status ?? 'not computed'}
              </Badge>
              {user.location.is_frozen && <Badge tone="bad">frozen</Badge>}
            </div>
          </div>
          <dl className="space-y-2 text-sm mb-3">
            <div className="flex justify-between">
              <dt className="text-muted">Effective country</dt>
              <dd className="font-mono tabular-nums text-foreground">{user.location.country ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Chargeable</dt>
              <dd className="font-mono text-foreground">{user.location.is_frozen ? 'no — frozen' : 'yes'}</dd>
            </div>
          </dl>

          {/* How the verdict was reached: latest signal per source + whether that
              country's market is open. */}
          <FieldLabel>Signals</FieldLabel>
          <ul className="divide-y divide-border -mx-5">
            {(['card', 'billing', 'ip', 'declared'] as const).map((k) => {
              const sig = user.location!.signals[k];
              return (
                <li key={k} className="px-5 py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted w-16 shrink-0">{k}</span>
                  {sig ? (
                    <span className="flex items-center gap-2 flex-1 justify-end min-w-0">
                      <span className="font-mono text-foreground">{sig.country_code ?? '—'}</span>
                      {sig.market_open != null && (
                        <Badge tone={sig.market_open ? 'good' : 'bad'} xs>{sig.market_open ? 'open' : 'closed'}</Badge>
                      )}
                      <span className="text-[10px] text-muted">{sig.source}</span>
                    </span>
                  ) : (
                    <span className="text-muted text-xs">none</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted mt-3 leading-snug">
            open = no signal hits a closed market · closed = all do · conflict = both open and closed signals (frozen for review) · unknown = no signals yet.
          </p>
        </Card>
      )}

      {/* Creator profile — name + verified status + link only */}
      {user.creator ? (
        <Card accent>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Creator</SectionLabel>
            <Badge tone={user.creator.verified ? 'good' : 'default'}>
              {user.creator.verified ? 'verified' : 'unverified'}
            </Badge>
          </div>
          <Link href={user.slug ? `/${user.slug}` : `/creators/${user.creator.id}`} className="font-medium text-creator hover:underline text-sm">
            {user.creator.display_name} →
          </Link>
        </Card>
      ) : (
        <Empty message="No creator profile." />
      )}

      {/* Handles — verified + unverified claims. Hidden when the user has none. */}
      {user.handles && user.handles.length > 0 && (
        <Card accent className="mt-4">
          <SectionLabel className="mb-3">Handles</SectionLabel>
          <ul className="divide-y divide-border -mx-5">
            {user.handles.map((claim) => (
              <li key={claim.claim_id} className="px-5 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {claim.handle.profile_url ? (
                      <a
                        href={claim.handle.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-foreground hover:underline truncate"
                      >
                        @{claim.handle.username}
                      </a>
                    ) : (
                      <span className="font-mono text-sm text-foreground truncate">@{claim.handle.username}</span>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{claim.handle.platform}</span>
                    <Badge tone={claim.status === 'verified' ? 'good' : 'warn'}>
                      {claim.status}
                    </Badge>
                    {claim.verification_method && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        via {claim.verification_method}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Danger zone — overlord-only user deletion ─────────────────────── */}
      {!alreadyDeleted && isOverlord && (
        <div className="mt-6 pt-5 border-t border-dashed border-bad/40">
          <SectionLabel className="text-bad mb-2">Danger zone</SectionLabel>

          {!armed ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted leading-snug">
                Permanently scrub this user&apos;s PII, cancel backings, revoke tokens, and soft-delete.
              </p>
              <Button
                variant="default"
                size="sm"
                className="!border-bad !text-bad hover:!bg-bad-soft shrink-0"
                onClick={() => { setArmed(true); setDeleteError(null); }}
              >
                Delete user
              </Button>
            </div>
          ) : (
            <div className="bg-bad-soft border border-bad/50 rounded p-4 space-y-3">
              <p className="text-sm text-foreground leading-snug">
                Type <span className="font-mono font-bold text-bad">{user.display_name}</span> to
                confirm. This action is irreversible.
              </p>
              <div>
                <FieldLabel>confirm display name</FieldLabel>
                <Input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={user.display_name ?? ''}
                  autoFocus
                  disabled={deleting}
                />
              </div>
              {deleteError && (
                <div className="text-xs text-bad font-mono">{deleteError}</div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleting}
                  onClick={() => { setArmed(false); setConfirmName(''); setDeleteError(null); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="!bg-bad hover:!bg-bad/90 !text-white"
                  disabled={!nameMatches || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Deleting…' : 'Permanently delete'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type UserFilter = 'all' | 'creator' | 'council' | 'fan';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<UserFilter>('all');
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [page, setPage]           = useState(1);
  const [lastPage, setLastPage]   = useState(1);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<AdminUser | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchUsers = useCallback(async (q: string, f: UserFilter, p: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({
        q:      q || undefined,
        filter: f !== 'all' ? f : undefined,
        page:   p,
      });
      setUsers(res.data);
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
      fetchUsers('', 'all', 1);
    }
  }, [user, fetchUsers]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchUsers(val, filter, 1);
    }, 350);
  };

  const handleFilterChange = (f: UserFilter) => {
    setFilter(f);
    setPage(1);
    fetchUsers(search, f, 1);
  };

  if (authLoading || !user || user.role !== 'council') return null;

  // Note: "Creator" uses whereHas('creator') on the backend, not role=creator.
  // This means council members who also own a creator profile appear here too — the tabs
  // are independent views, not mutually exclusive role buckets.
  const FILTER_TABS: { label: string; value: UserFilter }[] = [
    { label: 'All',     value: 'all' },
    { label: 'Creator', value: 'creator' },
    { label: 'Council', value: 'council' },
    { label: 'Mob',     value: 'fan' },
  ];

  return (
    <>
      {selected && (
        <UserModal
          user={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => fetchUsers(search, filter, page)}
        />
      )}

      <div className="space-y-6 pt-2 max-w-3xl">
        {/* Header */}
        <div>
          <SectionLabel className="mb-1">council · admin</SectionLabel>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display font-bold text-[28px]">Users</h1>
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
            placeholder="Search name or email…"
            className="flex-1"
          />
          <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
            {FILTER_TABS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleFilterChange(value)}
                className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  filter === value
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
        ) : users.length === 0 ? (
          <Empty message="No users found." />
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelected(u)}
                  className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-surface-2 transition-colors"
                >
                  {u.profile_picture ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.profile_picture}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-fan/20 flex items-center justify-center text-fan font-mono text-xs font-bold shrink-0">
                      {u.display_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm truncate">{u.display_name}</span>
                      <RoleBadge role={u.role} />
                      {/* Show a creator badge when this council/fan user also owns a creator profile */}
                      {u.creator && u.role !== 'creator' && (
                        <Badge tone="creator">creator</Badge>
                      )}
                      {u.deleted_at && (
                        <Badge tone="bad">deleted</Badge>
                      )}
                      {u.broke_cooldown && (
                        <Badge tone="warn">broke cooldown</Badge>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-muted truncate">{u.email}</p>
                  </div>

                  <div className="shrink-0 text-right hidden sm:block">
                    {u.creator && (
                      <p className="font-mono text-[10px] text-creator">{u.creator.display_name}</p>
                    )}
                    <p className="font-mono text-[10px] text-muted">{new Date(u.created_at).toLocaleDateString()}</p>
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
              onClick={() => { const p = page - 1; fetchUsers(search, filter, p); }}
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
              onClick={() => { const p = page + 1; fetchUsers(search, filter, p); }}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
