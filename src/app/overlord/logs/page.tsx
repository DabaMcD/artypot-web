'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { logs as logsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import Link from 'next/link';

type LogLevel = 'ALL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

interface LogEntry {
  logged_at: string;
  level: string;
  message: string;
  context: string | null;
}

interface Meta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

const LEVEL_STYLES: Record<string, string> = {
  ERROR:   'bg-red-900/40 text-red-400 border-red-800/50',
  WARNING: 'bg-amber-900/40 text-amber-400 border-amber-800/50',
  INFO:    'bg-blue-900/40 text-blue-400 border-blue-800/50',
  DEBUG:   'bg-surface-2 text-muted border-border',
};

const LEVELS: LogLevel[] = ['ALL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];

export default function OverlordLogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries]       = useState<LogEntry[]>([]);
  const [meta, setMeta]             = useState<Meta | null>(null);
  const [loading, setLoading]       = useState(true);
  const [level, setLevel]           = useState<LogLevel>('ALL');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]             = useState(1);
  const [expanded, setExpanded]     = useState<Set<number>>(new Set());

  // Delete form
  const [deleteDate, setDeleteDate]       = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
  }, [user, authLoading, router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setExpanded(new Set());
    try {
      const res = await logsApi.list({ page, level: level === 'ALL' ? undefined : level, search: search || undefined });
      setEntries(res.data);
      setMeta(res.meta);
    } catch {
      toast('Failed to load logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, level, search, toast]);

  useEffect(() => {
    if (!authLoading && user?.is_overlord) fetchLogs();
  }, [fetchLogs, authLoading, user]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleLevelChange = (l: LogLevel) => {
    setLevel(l);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteDate) return;
    setDeleting(true);
    try {
      const res = await logsApi.deleteBefore(deleteDate);
      toast(`${res.message} ${res.remaining} entries remain.`, 'success');
      setDeleteConfirm(false);
      setDeleteDate('');
      setPage(1);
      fetchLogs();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to delete logs.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // Today's date as YYYY-MM-DD for the date input max
  const today = new Date().toISOString().slice(0, 10);

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
          <h1 className="text-2xl font-bold text-foreground">Application Logs</h1>
          <p className="text-muted text-sm mt-1">
            {meta ? `${meta.total.toLocaleString()} entries` : '—'}
            {' · '}
            <Link href="/overlord" className="hover:underline text-muted">← Overlord</Link>
          </p>
        </div>
      </div>

      {/* Delete panel */}
      <div className="bg-surface border border-red-900/40 rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-1 text-sm">Delete Logs Before Date</h2>
        <p className="text-xs text-muted mb-4">
          Permanently removes all log entries whose timestamp is before midnight on the chosen date.
          This rewrites the log file and cannot be undone.
        </p>

        {!deleteConfirm ? (
          <div className="flex items-center gap-3">
            <input
              type="date"
              max={today}
              value={deleteDate}
              onChange={(e) => setDeleteDate(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              disabled={!deleteDate}
              onClick={() => setDeleteConfirm(true)}
              className="bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-amber-300">
              Delete all entries before <strong>{deleteDate}</strong>?
            </p>
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
            <button
              disabled={deleting}
              onClick={() => setDeleteConfirm(false)}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Level tabs */}
        <div className="flex gap-1 flex-wrap">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => handleLevelChange(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                level === l
                  ? l === 'ALL'
                    ? 'bg-fan/20 border-fan/40 text-fan'
                    : (LEVEL_STYLES[l] ?? 'bg-surface-2 border-border text-foreground')
                  : 'bg-surface border-border text-muted hover:text-foreground'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
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
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-surface border border-border rounded-xl animate-pulse" />
          ))
        ) : entries.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted text-sm">
            No log entries found.
          </div>
        ) : (
          entries.map((entry, i) => {
            const isExpanded = expanded.has(i);
            const levelStyle = LEVEL_STYLES[entry.level] ?? 'bg-surface-2 text-muted border-border';
            const hasContext = !!entry.context;

            return (
              <div
                key={i}
                className="bg-surface border border-border rounded-xl overflow-hidden"
              >
                <div
                  className={`flex items-start gap-3 px-4 py-3 ${hasContext ? 'cursor-pointer hover:bg-surface-2/50' : ''}`}
                  onClick={() => hasContext && toggleExpand(i)}
                >
                  {/* Level badge */}
                  <span className={`shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${levelStyle}`}>
                    {entry.level}
                  </span>

                  {/* Timestamp */}
                  <span className="shrink-0 text-xs text-muted font-mono mt-0.5 hidden sm:block">
                    {entry.logged_at}
                  </span>

                  {/* Message */}
                  <span className="flex-1 text-sm text-foreground font-mono break-all leading-relaxed">
                    {entry.message}
                  </span>

                  {/* Expand chevron */}
                  {hasContext && (
                    <span className="shrink-0 text-muted text-xs mt-0.5 select-none">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  )}
                </div>

                {/* Timestamp on mobile */}
                <div className="px-4 pb-1 sm:hidden">
                  <span className="text-[10px] text-muted font-mono">{entry.logged_at}</span>
                </div>

                {/* Expanded context */}
                {isExpanded && entry.context && (
                  <div className="border-t border-border bg-black/30 px-4 py-3">
                    <pre className="text-xs text-muted font-mono whitespace-pre-wrap break-all leading-relaxed overflow-x-auto">
                      {entry.context}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
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
