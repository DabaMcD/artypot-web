'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AdminUser, UserRole } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    mob:      'bg-zinc-800 border-zinc-700 text-zinc-300',
    summoned: 'bg-creator/10 border-creator/30 text-creator',
    council:  'bg-council/10 border-council/30 text-council',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[role]}`}>
      {role}
    </span>
  );
}

// ── User detail drawer ───────────────────────────────────────────────────────

function UserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors text-xl leading-none ml-4">×</button>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          <RoleBadge role={user.role} />
          {/* Council (or mob) user who also owns a summon */}
          {user.summon && user.role !== 'summoned' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-creator/10 border-creator/30 text-creator">
              summoned
            </span>
          )}
          {user.deleted_at && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-900/30 border-red-700/40 text-red-300">
              deleted
            </span>
          )}
          {!user.email_verified_at && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-900/30 border-amber-700/40 text-amber-300">
              email unverified
            </span>
          )}
          {user.is_anonymous && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-800 border-zinc-700 text-zinc-400">
              anonymous
            </span>
          )}
        </div>

        <dl className="space-y-2 text-sm mb-5">
          <div className="flex justify-between">
            <dt className="text-muted">User ID</dt>
            <dd className="text-foreground font-mono">#{user.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Joined</dt>
            <dd className="text-foreground">{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Phone</dt>
            <dd className="text-foreground">
              {user.phone_number ?? '—'}
              {user.phone_verified_at ? ' ✓' : user.phone_number ? ' (unverified)' : ''}
            </dd>
          </div>
        </dl>

        {/* Summon — name + claimed status + link only */}
        {user.summon ? (
          <div className="border border-border rounded-xl p-4 bg-surface-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Summon</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                user.summon.claimed
                  ? 'bg-green-900/30 border-green-700/40 text-green-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}>
                {user.summon.claimed ? 'claimed' : 'unclaimed'}
              </span>
            </div>
            <Link href={`/summons/${user.summon.id}`} className="font-medium text-creator hover:underline text-sm">
              {user.summon.display_name} →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted italic">No summon profile.</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type UserFilter = 'all' | 'summoned' | 'council' | 'mob';

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

  // Note: "Summoned" uses whereHas('summon') on the backend, not role=summoned.
  // This means council members who also own a summon appear here too — the tabs
  // are independent views, not mutually exclusive role buckets.
  const FILTER_TABS: { label: string; value: UserFilter }[] = [
    { label: 'All',      value: 'all' },
    { label: 'Summoned', value: 'summoned' },
    { label: 'Council',  value: 'council' },
    { label: 'Mob',      value: 'mob' },
  ];

  return (
    <>
      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-muted hover:text-foreground transition-colors text-sm">
            ← Admin
          </Link>
          <span className="text-border">/</span>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <span className="ml-auto text-sm text-muted">{total} total</span>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name or email…"
            className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
          />
          <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1">
            {FILTER_TABS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleFilterChange(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-surface text-foreground shadow-sm'
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
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm">No users found.</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u)}
                className="w-full text-left bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-foreground/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm truncate">{u.name}</span>
                    <RoleBadge role={u.role} />
                    {/* Show a summoned badge when this council/mob user also owns a summon */}
                    {u.summon && u.role !== 'summoned' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-creator/10 border-creator/30 text-creator">
                        summoned
                      </span>
                    )}
                    {u.deleted_at && (
                      <span className="text-xs text-red-400 border border-red-700/40 bg-red-900/20 px-1.5 rounded-full">deleted</span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                </div>

                <div className="shrink-0 text-right hidden sm:block">
                  {u.summon && (
                    <p className="text-xs text-creator">{u.summon.display_name}</p>
                  )}
                  <p className="text-xs text-muted">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={() => { const p = page - 1; fetchUsers(search, filter, p); }}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted">Page {page} of {lastPage}</span>
            <button
              type="button"
              disabled={page === lastPage || loading}
              onClick={() => { const p = page + 1; fetchUsers(search, filter, p); }}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
