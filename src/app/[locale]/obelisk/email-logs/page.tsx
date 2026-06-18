'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { emailLogs as emailLogsApi, type EmailLogRow } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

interface Meta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

function formatSentAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function OverlordEmailLogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [rows, setRows]               = useState<EmailLogRow[]>([]);
  const [meta, setMeta]               = useState<Meta | null>(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(1);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
  }, [user, authLoading, router]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emailLogsApi.list({ page, search: search || undefined });
      setRows(res.data);
      setMeta(res.meta);
    } catch {
      toast('Failed to load email log.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    if (!authLoading && user?.is_overlord) fetchRows();
  }, [fetchRows, authLoading, user]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-surface border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Email Log</h1>
          <p className="text-muted text-sm mt-1">
            {meta ? `${meta.total.toLocaleString()} emails sent` : '—'}
            {' · '}
            <Link href="/obelisk" className="hover:underline text-muted">← Obelisk</Link>
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by address or subject…"
          className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted placeholder:font-mono focus:outline-none focus:border-fan transition-colors"
        />
        <button
          type="submit"
          className="bg-surface-2 border border-border text-muted hover:text-foreground text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="text-xs text-muted hover:text-foreground transition-colors px-2"
          >
            Clear
          </button>
        )}
      </form>

      {/* Rows */}
      <div className="space-y-2">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted text-sm">
            No emails logged{search ? ' for this search' : ''}.
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Subject */}
                  <p className="text-sm text-foreground font-medium break-words leading-snug">
                    {row.subject}
                  </p>
                  {/* Recipient */}
                  <p className="text-xs text-muted font-mono mt-1 break-all">
                    {row.email}
                    {row.user_id ? (
                      <Link href={`/users/${row.user_id}`} className="ml-2 not-italic hover:underline text-muted/80">
                        {row.display_name ? `${row.display_name} (#${row.user_id})` : `user #${row.user_id}`}
                      </Link>
                    ) : (
                      <span className="ml-2 text-muted/50">no account</span>
                    )}
                  </p>
                </div>
                {/* Sent-at */}
                <span className="shrink-0 text-xs text-muted font-mono mt-0.5 hidden sm:block">
                  {formatSentAt(row.created_at)}
                </span>
              </div>
              {/* Sent-at on mobile */}
              <div className="sm:hidden mt-1">
                <span className="text-[10px] text-muted font-mono">{formatSentAt(row.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <button
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
