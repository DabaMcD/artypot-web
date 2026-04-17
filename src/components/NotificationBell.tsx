'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/lib/notification-context';
import type { UserNotification } from '@/lib/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotifItem({
  notif,
  onClose,
}: {
  notif: UserNotification;
  onClose: () => void;
}) {
  const isUnread = !notif.read_at;

  const inner = (
    <div
      className={`px-4 py-3 border-b border-border last:border-0 transition-colors ${
        isUnread ? 'bg-surface-2' : 'opacity-70'
      } hover:bg-border cursor-pointer`}
      onClick={() => { if (!notif.link) onClose(); }}
    >
      <div className="flex items-start gap-2">
        {isUnread && (
          <span className="mt-1.5 w-2 h-2 rounded-full bg-fan shrink-0" />
        )}
        {!isUnread && <span className="mt-1.5 w-2 h-2 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug truncate">{notif.title}</p>
          {notif.body && (
            <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.body}</p>
          )}
          <p className="text-xs text-muted mt-1">{timeAgo(notif.created_at)}</p>
        </div>
      </div>
    </div>
  );

  if (notif.link) {
    return (
      <Link href={notif.link} onClick={onClose}>
        {inner}
      </Link>
    );
  }

  return inner;
}

export default function NotificationBell() {
  const { unreadCount, notifications, loading, fetchNotifications, markBulkRead, totalPages, currentPage } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  /**
   * IDs of unread notifications that were visible while the panel was open.
   * We capture them from each page fetch so we can bulk-mark on close.
   */
  const shownUnreadRef = useRef<Set<number>>(new Set());

  /** Close the panel and bulk-read all notifications the user saw. */
  const handleClose = useCallback(() => {
    const ids = Array.from(shownUnreadRef.current);
    shownUnreadRef.current = new Set();
    setOpen(false);
    setPage(1);
    if (ids.length > 0) {
      markBulkRead(ids);
    }
  }, [markBulkRead]);

  // Fetch + capture unread IDs whenever the panel is open and the page changes.
  useEffect(() => {
    if (!open) return;
    fetchNotifications(page).then((fetched) => {
      fetched.filter((n) => !n.read_at).forEach((n) => shownUnreadRef.current.add(n.id));
    });
  }, [open, page, fetchNotifications]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, handleClose]);

  const handleToggle = () => {
    if (open) {
      handleClose();
    } else {
      shownUnreadRef.current = new Set();
      setPage(1);
      setOpen(true);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-2 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-fan text-black text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div className="absolute right-0 mt-2 w-80 bg-surface-2 border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <Link
                href="/settings#notifications"
                onClick={handleClose}
                className="text-xs text-muted hover:text-foreground"
              >
                Preferences
              </Link>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</div>
              ) : (
                notifications.map((n) => (
                  <NotifItem
                    key={n.id}
                    notif={n}
                    onClose={handleClose}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="disabled:opacity-30 hover:text-foreground transition-colors"
                >
                  ← Newer
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="disabled:opacity-30 hover:text-foreground transition-colors"
                >
                  Older →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
